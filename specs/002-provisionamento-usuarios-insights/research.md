# Research: Provisionamento de Usuários do Connex Insights via CRM

**Feature**: `002-provisionamento-usuarios-insights`
**Data**: 2026-07-22

Este documento resolve as incertezas técnicas ([NEEDS CLARIFICATION]) do Technical Context antes do desenho de Fase 1, e documenta decisões arquiteturais que se afastam do pedido literal do usuário quando necessário para evitar riscos concretos — com a justificativa explícita em cada caso.

---

## D1. Onde os modelos Prisma e as migrations devem viver

**Pergunta**: O input do usuário pede "Prisma ORM + Prisma Migrations" com modelos User/Tenant/Status/Role/Audit — mas essas tabelas (`tenants`, `profiles`) já existem e são migradas pelo **repositório `connex-insights`**, que já possui seu próprio histórico de migrations Prisma (`connex-insights/prisma/migrations`). O `connex-crm` nunca teve Prisma (usa `supabase-js` + padrão repository em `lib/repositories/`).

**Decision**: `connex-crm` passa a ter **seu próprio** `prisma/schema.prisma` (novo para o repositório), mas seu escopo é limitado a uma tabela **nova e de propriedade do CRM**: `insights_user_provisioning_requests` (ver [data-model.md](./data-model.md)). Essa tabela vive no Supabase do **próprio CRM** (`project_ref=fkwlzsnkdekcptaatoli`, servidor MCP `supabase`), não no do Connex Insights.

- As tabelas `tenants`/`profiles` do Connex Insights **não** recebem uma segunda árvore de migrations vinda do CRM. Leituras (contadores, lista de tenants, lista de usuários) e a escrita de provisionamento são feitas via `@supabase/supabase-js` com a Service Role Key do Connex Insights (`project_ref=dynmchiutefdpucwqifu`, servidor MCP `supabase-insights`), seguindo exatamente o padrão de repository já usado em `lib/repositories/clientes.repository.ts`.

**Rationale**: Ter dois históricos de migration Prisma independentes apontando para o mesmo Postgres é uma fonte garantida de drift (`prisma migrate deploy` de um repo não sabe da migration aplicada pelo outro; `prisma db pull` de um pode sobrescrever anotações do outro). O `connex-insights` é o dono legítimo do esquema de `tenants`/`profiles` (é auth + multi-tenant core daquele produto). O CRM deve se comportar como **consumidor externo** desse esquema (client autenticado com Service Role), exatamente a mesma relação que o próprio `seed.ts` do Insights usa entre Supabase Auth Admin API e a tabela `profiles`.

**Alternatives considered**:
- *Prisma no CRM apontando direto para o Postgres do Insights, migrando `tenants`/`profiles`*: rejeitado — duplica ownership de schema, viola a fronteira de bounded context entre os dois produtos, e quebra o histórico de migrations do Insights na primeira divergência.
- *Nova API HTTP administrativa no `connex-insights`*: era a opção B apresentada ao usuário na fase de especificação e foi explicitamente rejeitada em favor de conexão direta (decisão já registrada em `spec.md`).
- *Sem Prisma em lugar nenhum (100% `supabase-js`)*: mantém consistência total com o padrão atual do CRM, mas não atende ao requisito explícito do usuário de "Prisma ORM + Prisma Migrations + validação de schema via Supabase MCP" para a nova tabela de auditoria/idempotência.

---

## D2. Atomicidade da criação (Auth Admin API + INSERT em `profiles`)

**Pergunta**: O fluxo pedido pelo usuário assume "iniciar transação → criar usuário → associar tenant → commit". Mas criar um usuário no Supabase Auth é uma chamada HTTP externa (Admin API), não uma operação SQL — **não pode** participar de uma transação Postgres junto com o `INSERT` em `profiles`.

**Decision**: Estratégia de compensação (padrão *saga* de 2 passos), com o `INSERT` em `profiles` sempre dentro de uma transação Postgres:

1. `auth.admin.createUser()` no projeto do Connex Insights (e-mail interno de sistema + senha temporária, `app_metadata` com `tenant_id`/status). Se falhar (e-mail duplicado) → aborta antes de qualquer escrita em `profiles`, sem side effects.
2. `BEGIN` no Postgres do Insights → `INSERT INTO profiles (...)` com `login`, `tenant_id`, `status = 'INACTIVE'`, `role = 'MEMBER'` → `COMMIT`.
3. Se o passo 2 falhar (ex.: violação de `UNIQUE(login)`) → **compensação**: `auth.admin.deleteUser(authUserId)` para não deixar um usuário "fantasma" no Auth sem perfil de aplicação, e a requisição retorna erro ao CRM.

**Rationale**: Garante que nunca existe um `profiles` sem `auth.users` correspondente (pior estado possível para login), aceitando a janela residual (rara) de um `auth.users` sem perfil caso a etapa de compensação falhe — mitigada com log estruturado + alerta para limpeza manual, documentado em Error Handling do `plan.md`.

**Alternatives considered**: Criar primeiro o `profiles` com um `id` gerado e só depois o Auth user vinculando o mesmo `id` — rejeitado porque `profiles.id` deve ser exatamente o `auth.users.id` (FK lógica documentada em `connex-insights/specs/001-user-auth/data-model.md`), então a ordem Auth→Profile é obrigatória.

---

## D3. Idempotência e prevenção de duplicidade

**Decision**: Defesa em duas camadas:
1. **Camada CRM** (rápida, evita round-trip ao Insights em cliques duplicados/retries): `insights_user_provisioning_requests` tem `UNIQUE(email)` e `UNIQUE(login)`. O Route Handler insere essa linha com `status = PENDING` **antes** de chamar o Insights; uma segunda requisição concorrente com os mesmos dados falha imediatamente na constraint única do Postgres do CRM (`23505`), mapeado para `409 Conflict`.
2. **Camada Insights** (fonte da verdade final): `profiles.login` e `auth.users.email` têm constraint única no Connex Insights. Se, por qualquer motivo, duas requisições passarem da camada 1 (ex.: dois registros `PENDING` com dados diferentes que colidem só no Insights), a violação de unicidade no `INSERT` do passo D2.2 é capturada e mapeada para `409 Conflict`, e a linha de auditoria correspondente é marcada `FAILED_DUPLICATE`.

**Rationale**: Atende ao requisito de idempotência mesmo sob duplo-clique, retry de rede e múltiplas abas, sem depender de filas, usando exclusivamente constraints de banco (fonte da verdade) — consistente com a orientação explícita do usuário ("Database integrity must always be considered the source of truth").

---

## D4. Estratégia de autenticação/autorização do endpoint

**Decision**: Reaproveitar a sessão Supabase já usada pelo CRM (`@supabase/ssr`, cookie httpOnly) — mesma abordagem de `app/api/auth/me/route.ts`. O Route Handler:
1. `supabase.auth.getUser()` → 401 se ausente (padrão de `unauthorized()` já existente em `lib/api/response.ts`).
2. Nenhuma checagem adicional de papel (`profiles.role`) — qualquer usuário com sessão válida está autorizado.

> **Atualização (2026-07-22)**: o passo 2 original checava `profiles.role !== 'Admin'` → `403`. Removido a pedido do usuário; ver nota em `spec.md`. `lib/auth/require-admin.ts` (`checkAdmin`/`requireAdminOrRedirect`) foi substituído por `lib/auth/require-auth.ts` (`checkAuth`/`requireAuthOrRedirect`), que não consulta mais `profiles.role`.

**Rationale**: Reutiliza 100% da infraestrutura de auth já validada no CRM; nenhuma credencial nova é exposta ao cliente.

---

## D5. Geração e exposição da senha temporária

**Decision**: Senha gerada no servidor com `crypto.randomBytes` (Node `crypto`, já disponível em runtime Node do Route Handler — **não** usar Edge Runtime para esta rota), formatada para atender à política de senha do Connex Insights (mínimo 8 caracteres, ao menos 1 letra e 1 número — mesma política documentada em `connex-insights/specs/001-user-auth`). Retornada **uma única vez** no corpo da resposta HTTP 201; nunca gravada em texto plano em `insights_user_provisioning_requests` (a coluna correspondente armazena apenas um booleano `temporaryPasswordIssued`).

**Rationale**: Elimina qualquer superfície de exposição pós-criação (nem o CRM nem seus logs guardam a senha); alinhado a FR-014/FR-015 do `spec.md` e RS-001 do `connex-insights/specs/002`.

---

## D6. Runtime, framework e testes

- **Route Handlers Next.js App Router** (`app/api/aplicacoes/connex-insights/**/route.ts`), `runtime = 'nodejs'` explícito (necessário para `crypto` e para o client `pg`/Admin API do Insights).
- **Validação**: Zod, schema único compartilhado entre client (react-hook-form) e servidor, em `app/aplicacoes/connex-insights/schemas/`.
- **Testes**: adota-se **Vitest** para unit/integration (mesma ferramenta já usada no `connex-insights`, ainda não presente no `connex-crm` — resolve o `NEEDS CLARIFICATION` do `plan-template.md` para esta feature). Testes E2E ficam fora do escopo desta feature (não há Playwright configurado no CRM); cobertura E2E pode ser proposta como item futuro.
- **MCP de validação de schema**: servidor `supabase` (`project_ref=fkwlzsnkdekcptaatoli`) para validar a migration da tabela `insights_user_provisioning_requests`; servidor `supabase-insights` (`project_ref=dynmchiutefdpucwqifu`) para inspecionar `tenants`/`profiles` (incluindo confirmar, antes de habilitar esta feature em produção, que a coluna `login` já existe — dependência cross-repo).

---

## D7. Dependência bloqueante confirmada com o `supabase-insights` MCP

Ação de research: inspecionar o schema atual de `profiles` no projeto `dynmchiutefdpucwqifu` via MCP para confirmar se a coluna `login` já existe.

**Resultado (confirmado em `/speckit.implement`, 2026-07-22)**: verificado em duas etapas.

1. Primeira tentativa: o servidor MCP `supabase-insights` não estava autenticado/disponível na sessão inicial de implementação. A dependência foi confirmada por leitura direta do código-fonte (`connex-insights/prisma/schema.prisma`, model `Profile`), que não possui campo `login`.
2. **Confirmação final via MCP ao vivo** (mesmo dia, sessão de aplicação de migrations): com o servidor `project-0-connex-crm-supabase2` (project_ref `dynmchiutefdpucwqifu`) autenticado, `list_tables` (verbose) em `public.profiles` retornou exatamente as colunas `id`, `tenant_id`, `display_name`, `role` (enum `UserRole`), `status` (enum `UserStatus`), `created_at`, `updated_at`. **Nenhuma coluna `login` existe na tabela em produção**, confirmando definitivamente a dependência bloqueante já suspeitada pela leitura estática do schema.

**Consequência**: `ConnexInsightsRemoteRepository.insertProfile` (`lib/repositories/connex-insights-remote.repository.ts`) já envia `login` no payload do `INSERT`, conforme o contrato desejado — mas essa chamada **falharia em produção** (coluna inexistente) até que o `connex-insights` aplicasse uma migration adicionando `login` ao model `Profile`. Esta era a mesma dependência bloqueante já registrada na seção "Impacto Cross-Repo" do `spec.md` — **não implementável dentro do repositório `connex-crm`** (decisão D1: cada repositório é dono do seu próprio schema/migrations).

**Resolução (2026-07-22, mesmo dia)**: a dependência foi endereçada diretamente no repositório `connex-insights`:

- Migration `prisma/migrations/20260722210000_add_profile_login` adiciona `profiles.login TEXT UNIQUE NOT NULL`, aplicada via MCP `apply_migration` no projeto `dynmchiutefdpucwqifu`, com backfill dos 3 perfis de seed já existentes (a partir do e-mail) e bookkeeping do Prisma registrado.
- O fluxo de login do `connex-insights` (`app/api/auth/login/route.ts`, `lib/auth/schemas.ts`, `components/auth/login-form.tsx`) foi atualizado para aceitar `login` (não mais `email`) no formulário, resolvendo `login → auth.users.email` no servidor via Supabase Admin API (`admin.auth.admin.getUserById`) antes de chamar `signInWithPassword`. O fluxo de ativação de conta (`/api/auth/activate`) não foi alterado, pois opera sobre a sessão já autenticada.
- Documentado em `connex-insights/specs/001-user-auth/spec.md` e `specs/002-first-time-account-activation/spec.md` (seção "Nota de atualização").
- Suite de testes do `connex-insights` (142 testes, incluindo unit/integration/e2e de login) atualizada e passando; `tsc --noEmit` limpo.

Com isso, contas provisionadas por esta feature (`connex-crm`) já conseguem efetuar login no Connex Insights usando o `login` informado no formulário de criação. O bloqueio de release descrito em T059 está **resolvido**.

---

## D8. Modelo de enforcement de autorização em `insights_user_provisioning_requests`

**Constatação**: o Prisma conecta via `DATABASE_URL` com um papel Postgres privilegiado
(necessário para `prisma migrate`), o que **não passa pela avaliação de RLS** que o
Supabase aplica a conexões autenticadas via PostgREST/`supabase-js` (papel `authenticated`).

**Decision**: A RLS de `insights_user_provisioning_requests` (ver [data-model.md](./data-model.md))
é uma camada de defesa contra acesso **fora da aplicação** (ex.: chave de serviço vazada,
acesso via Supabase Studio, `supabase-js` com JWT de usuário). A autorização das queries
feitas pela própria aplicação via Prisma é garantida exclusivamente pelo check de sessão
autenticada no Route Handler (`lib/auth/require-auth.ts`), não pela RLS. Isso é uma exceção
documentada ao Princípio X da Constituição ("não confiar apenas em validação na aplicação"),
aceitável neste caso porque: (a) o único caminho de escrita/leitura desta tabela é o próprio
Route Handler, nunca um client autenticado direto; (b) o volume/criticidade é baixo
(ferramenta administrativa interna, poucas dezenas de operações/dia).

> **Atualização (2026-07-22)**: o check de aplicação era originalmente `role === 'Admin'`
> (`tasks.md` T015); removido a pedido do usuário — ver nota em `spec.md`. As policies de
> RLS desta tabela (que já eram apenas defesa em profundidade, não o enforcement primário)
> foram atualizadas na mesma data via migration
> `prisma/migrations/20260722211500_insights_provisioning_allow_any_authenticated/migration.sql`
> para exigir somente `requested_by_profile_id = auth.uid()`, em vez de papel `Admin`.

**Rationale**: A alternativa de fazer o Prisma respeitar RLS (`SET LOCAL ROLE authenticated`
por request, via transação dedicada) foi avaliada e rejeitada por complexidade
desproporcional ao risco, dado que o uso desta tabela é exclusivamente server-to-server.

**Alternatives considered**:
- *`SET LOCAL ROLE authenticated` + `request.jwt.claims` por request via Prisma middleware*: rejeitado — exigiria gerenciar transações manuais em toda query, perdendo a ergonomia do Prisma Client, para mitigar um risco já coberto pelo check de role na camada de aplicação.
- *Usar `supabase-js` (client autenticado) em vez de Prisma para esta tabela também*: rejeitado — reintroduziria a inconsistência que a introdução do Prisma buscou resolver (ver D1), sem ganho real de segurança dado o padrão de acesso exclusivamente server-side.

---

## Resumo das decisões (Technical Context)

| Unknown do template | Resolução |
|---|---|
| Framework de testes | Vitest (unit + integration); E2E fora de escopo |
| Escala/volume esperado | Baixo volume administrativo (dezenas de criações/dia, poucos admins simultâneos) — sem necessidade de fila ou processamento assíncrono |
| ORM para novas tabelas | Prisma, escopo limitado à tabela `insights_user_provisioning_requests` no Supabase do próprio CRM |
| Acesso ao Connex Insights | `@supabase/supabase-js` com Service Role Key dedicada (`SUPABASE_INSIGHTS_SERVICE_ROLE_KEY`, `SUPABASE_INSIGHTS_URL` — sem prefixo `NEXT_PUBLIC_`, uso exclusivamente server-side), sem Prisma, sem nova API HTTP |
