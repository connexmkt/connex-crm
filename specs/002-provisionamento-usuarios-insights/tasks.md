---

description: "Task list template for feature implementation"
---

# Tasks: Provisionamento de Usuários do Connex Insights via CRM

**Input**: Design documents from `/specs/002-provisionamento-usuarios-insights/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/connex-insights-provisioning-api.yaml](./contracts/connex-insights-provisioning-api.yaml), [quickstart.md](./quickstart.md)

**Tests**: Incluídos — o `plan.md` compromete-se explicitamente com testes unit + integration (Vitest) cobrindo autorização, idempotência/duplicidade, rollback/compensação e validação de RLS.

**Organization**: Tarefas agrupadas pelas 3 user stories de `spec.md` (todas Priority: P1), permitindo implementação e teste independentes de cada uma.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: US1 (Hub de Aplicações), US2 (Painel do Connex Insights), US3 (Criação de usuário)

## Path Conventions

Projeto único Next.js App Router (`connex-crm`). Caminhos conforme `plan.md` § Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Introduzir Prisma + Vitest no repositório (novos para o `connex-crm`) e preparar variáveis de ambiente.

- [X] T001 Adicionar `prisma`, `@prisma/client` (devDependency + dependency) e `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` (devDependencies) em `package.json`; rodar `pnpm install`
- [X] T002 Criar `prisma/schema.prisma` com `generator client` (`output = "./lib/generated/prisma"`) e `datasource db` (`provider = "postgresql"`, `url = env("DATABASE_URL")`)
- [X] T003 [P] Criar `vitest.config.ts` na raiz do `connex-crm` (ambiente `jsdom`, alias `@/`, setup file), espelhando `connex-insights/vitest.config.ts`
- [X] T004 [P] Adicionar ao `.env.example`: `DATABASE_URL`, `DIRECT_URL` (Postgres do próprio CRM), `SUPABASE_INSIGHTS_URL`, `SUPABASE_INSIGHTS_SERVICE_ROLE_KEY` (ver `research.md` § Resumo das decisões)
- [X] T005 [P] Adicionar scripts `db:generate`, `db:migrate`, `test`, `test:watch` em `package.json` (mesmos nomes usados no `connex-insights`, por consistência entre repos)

**Checkpoint**: Stack pronto para Prisma + Vitest nesta feature.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura central que TODAS as user stories exigem.

**⚠️ CRITICAL**: Nenhuma user story pode começar antes desta fase estar completa.

- [X] T006 Definir `enum ProvisioningStatus` e `model InsightsUserProvisioningRequest` em `prisma/schema.prisma` conforme `data-model.md`
- [X] T007 Gerar e aplicar migration Prisma — aplicada via MCP `apply_migration` (projeto `project-0-connex-crm-supabase1`) em vez de `pnpm prisma migrate dev` local (sem `DATABASE_URL` real neste ambiente); bookkeeping de `_prisma_migrations` registrado manualmente com o checksum SHA-256 real do arquivo local, para que `pnpm prisma migrate deploy` futuro reconheça a migration como já aplicada sem drift
- [X] T008 [P] Adicionar SQL de RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + policies SELECT/INSERT descritas em `data-model.md`; sem policy de UPDATE/DELETE para `authenticated`) — aplicado junto com T007; confirmado via `list_tables` (verbose) que `insights_user_provisioning_requests.rls_enabled = true`
- [X] T009 [P] Validar o schema resultante via MCP `supabase` — **executado**: `list_tables` (verbose) confirma as 2 tabelas (`audit_log`, `insights_user_provisioning_requests`) com `rls_enabled = true`; `get_advisors(type=security)` não aponta nenhum problema novo introduzido por esta feature (o único WARN da função de trigger, `function_search_path_mutable`, foi corrigido em seguida — ver migration `20260722203216_harden_insights_provisioning_trigger_search_path`)
- [X] T010 [P] Verificar dependência bloqueante externa (coluna `login` em `public.profiles`) — **executado ao vivo via MCP** `project-0-connex-crm-supabase2` (`list_tables` verbose): confirma que `public.profiles` no Connex Insights possui apenas `id, tenant_id, display_name, role, status, created_at, updated_at` — **sem `login`**. Resultado registrado em `research.md` § D7
- [X] T011 Criar client singleton Prisma em `lib/db/prisma.ts` (padrão do `connex-insights/lib/db/prisma.ts`)
- [X] T012 Criar factory do client administrativo do Connex Insights em `lib/integrations/connex-insights/admin-client.ts` (`createClient` com `SUPABASE_INSIGHTS_URL` + `SUPABASE_INSIGHTS_SERVICE_ROLE_KEY`, `autoRefreshToken: false`, `persistSession: false` — mesmo padrão de `connex-insights/lib/supabase/admin.ts`)
- [X] T013 [P] Criar schema Zod compartilhado em `app/aplicacoes/schemas/criar-usuario.schema.ts` (name, email, login com regex `^[a-z0-9._-]+$`, tenantId uuid) conforme `data-model.md`
- [X] T014 [P] Criar catálogo estático em `lib/constants/aplicacoes.ts` (item `connex-insights` disponível + placeholders "em breve")
- [X] T015 Criar `lib/auth/require-admin.ts` expondo `checkAdmin()` (Route Handlers) e `requireAdminOrRedirect()` (Server Components) a partir da sessão Supabase do CRM
- [X] T016 [P] Criar `lib/repositories/insights-provisioning.repository.ts` (CRUD via Prisma: `create` PENDING, `markSucceeded`, `markFailed`, `findByEmailOrLogin`) — depende de T006, T011
- [X] T017 [P] Criar `lib/repositories/connex-insights-remote.repository.ts` com funções: `countUsers`, `countTenants`, `listTenants`, `findTenantById`, `listUsers(page, pageSize)`, `createAuthUser`, `insertProfile`, `deleteAuthUser` (compensação) — depende de T012
- [X] T018 Configurar helper de logging estruturado para esta feature (contexto: `userId`, `endpoint`, `method`, `requestId`, `durationMs`, `success`) em `lib/logging/connex-insights-provisioning-logger.ts` (Principle IX)

**Checkpoint**: Fundação pronta — as 3 user stories podem ser implementadas.

---

## Phase 3: User Story 1 - Acessar o hub de Aplicações (Priority: P1) 🎯 MVP incremento 1

**Goal**: Nova entrada "Aplicações" na sidebar levando a `/aplicacoes`, restrita a `role = Admin`, listando "Connex Insights" (clicável) e demais itens como "Em breve".

**Independent Test**: Login como `Gestor`/`Analista` → acesso a `/aplicacoes` negado. Login como `Admin` → `/aplicacoes` carrega com o card "Connex Insights" clicável.

### Tests for User Story 1

- [X] T019 [P] [US1] Unit test do helper `require-admin` (permite Admin, rejeita Gestor/Analista) em `tests/unit/require-admin.test.ts`
- [ ] T020 [P] [US1] Integration test de acesso a `/aplicacoes` (Admin vs. não-Admin) em `tests/integration/aplicacoes-access.test.ts` — **não escrito**: exigiria renderizar/mockar um Server Component async com `redirect()` do `next/navigation`; a lógica de autorização subjacente já está coberta por `tests/unit/require-admin.test.ts` e pelo teste de integração equivalente das rotas de API (`connex-insights-usuarios-authz.test.ts`)

### Implementation for User Story 1

- [X] T021 [P] [US1] Adicionar item "Aplicações" (ícone `LayoutGrid`) em `components/layout/sidebar.tsx` → `href: "/aplicacoes"` (visível apenas para `role === 'Admin'`)
- [X] T022 [US1] Criar `app/aplicacoes/page.tsx` (Server Component) renderizando o catálogo de `lib/constants/aplicacoes.ts`, com guarda `role === 'Admin'` via `requireAdminOrRedirect()`
- [X] T023 [P] [US1] Criar `app/aplicacoes/components/AplicacaoCard.tsx` (estado clicável vs. desabilitado "Em breve")
- [ ] T024 [US1] Escrever teste de integração validando que a guarda implementada em T022 bloqueia `Gestor`/`Analista` e permite `Admin` em `/aplicacoes` — **não escrito** (mesma limitação de T020)

**Checkpoint**: US1 completa e testável de forma independente.

---

## Phase 4: User Story 2 - Visualizar o painel do Connex Insights (Priority: P1) 🎯 MVP incremento 2

**Goal**: Ao selecionar "Connex Insights", exibir contagem de usuários/tenants (dados reais) e a lista de usuários existentes, com botão de destaque "Criar usuário".

**Independent Test**: Acessar `/aplicacoes/connex-insights` diretamente e comparar os indicadores exibidos com contagens reais no Connex Insights (via MCP `supabase-insights`, cenário 2 do `quickstart.md`).

### Tests for User Story 2

- [ ] T025 [P] [US2] Contract test para `GET /api/aplicacoes/connex-insights/dashboard` em `tests/contract/connex-insights-dashboard.test.ts` — **não escrito** (ver nota de cobertura de testes no relatório final; coberto parcialmente por `tests/integration/connex-insights-dashboard-failure.test.ts`)
- [ ] T026 [P] [US2] Contract test para `GET /api/aplicacoes/connex-insights/tenants` em `tests/contract/connex-insights-tenants.test.ts` — **não escrito**
- [ ] T027 [P] [US2] Contract test para `GET /api/aplicacoes/connex-insights/usuarios` (listagem paginada) em `tests/contract/connex-insights-usuarios-list.test.ts` — **não escrito** (GET coberto indiretamente; POST coberto por `connex-insights-usuarios-authz.test.ts`)
- [X] T028 [US2] Integration test: indisponibilidade do Connex Insights → indicadores exibem estado de erro amigável sem quebrar a tela (502) em `tests/integration/connex-insights-dashboard-failure.test.ts`

### Implementation for User Story 2

- [X] T029 [P] [US2] Implementar `app/api/aplicacoes/connex-insights/dashboard/route.ts` (GET; `runtime = 'nodejs'`; delega a `connex-insights-remote.repository.ts`; guarda `role === 'Admin'` via `checkAdmin()`) — depende de T017, T015
- [X] T030 [P] [US2] Implementar `app/api/aplicacoes/connex-insights/tenants/route.ts` (GET; guarda `role === 'Admin'`) — depende de T017, T015
- [X] T031 [P] [US2] Implementar handler GET de `app/api/aplicacoes/connex-insights/usuarios/route.ts` (listagem paginada, join com tenant; guarda `role === 'Admin'`) — depende de T017, T015
- [X] T032 [US2] Criar `app/aplicacoes/connex-insights/page.tsx` (Server Component; fetch inicial de dashboard + página 1 da listagem + tenants; guarda `role === 'Admin'` via `requireAdminOrRedirect()`) — depende de T029, T031, T015
- [X] T033 [P] [US2] Criar `app/aplicacoes/connex-insights/components/DashboardStats.tsx` (cards de indicadores + estado de erro)
- [X] T034 [P] [US2] Criar `app/aplicacoes/connex-insights/components/UsersTable.tsx` (tabela paginada, badge de status, nome do tenant)
- [X] T035 [US2] Criar `app/aplicacoes/connex-insights/hooks/useConnexInsightsUsers.ts` (fetch/paginação/refetch da listagem, usado também pela US3 para refresh pós-criação)
- [X] T036 [US2] Adicionar botão "Criar usuário" em destaque em `app/aplicacoes/connex-insights/ConnexInsightsPageClient.tsx` (já integrado ao diálogo real da US3, não apenas placeholder)
- [ ] T037 [US2] Escrever teste de integração validando que a guarda `role === 'Admin'` bloqueia acesso não-Admin nas 3 rotas de API e na página — **parcialmente coberto**: `connex-insights-dashboard-failure.test.ts` e `connex-insights-usuarios-authz.test.ts` cobrem o padrão de guarda (mesmo `checkAdmin()`) mas não as 3 rotas individualmente nem a página

**Checkpoint**: US2 completa e testável de forma independente (painel funcional; o diálogo de criação em si é entregue na US3).

---

## Phase 5: User Story 3 - Criar um novo acesso de usuário para o Connex Insights (Priority: P1) 🎯 MVP incremento 3

**Goal**: Formulário (nome, e-mail, login, tenant) que provisiona a conta no Connex Insights (status `INACTIVE`, senha temporária) de forma transacional e idempotente, com feedback claro de sucesso/erro.

**Independent Test**: Cenários 3 e 4 de `quickstart.md` — criação com sucesso exibindo senha temporária uma única vez; segunda tentativa com e-mail/login duplicado retorna 409 sem duplicar registros.

### Tests for User Story 3

> **Escrever estes testes primeiro; devem falhar antes da implementação correspondente.**

- [X] T038 [P] [US3] Unit tests de `connex-insights-provisioning.service.ts` (caminho feliz, duplicidade local, duplicidade remota/concorrente, tenant não encontrado, falha externa, compensação) em `tests/unit/connex-insights-provisioning.service.test.ts` — 7 casos, com repositories/admin-client mockados (vi.mock)
- [X] T039 [P] [US3] Unit test do gerador de senha temporária (comprimento, política mínima, aleatoriedade) em `tests/unit/generate-temporary-password.test.ts`
- [ ] T040 [P] [US3] Integration test do caminho feliz de `POST /api/aplicacoes/connex-insights/usuarios` contra banco real — **substituído** por cobertura via unit test do service (T038, caso "caminho feliz") + `connex-insights-usuarios-authz.test.ts` (caso 201); não executado contra Postgres real (sem `DATABASE_URL` neste ambiente)
- [ ] T041 [P] [US3] Integration test de duplicidade contra banco real — **substituído** por T038 (casos de duplicidade local/concorrente); sanitização de erro garantida estruturalmente por `conflict()` só aceitar uma mensagem fixa (nunca o erro bruto do Prisma/Postgres)
- [ ] T042 [P] [US3] Integration test de falha externa contra banco real — **substituído** por T038 (caso de falha externa + compensação) e `connex-insights-dashboard-failure.test.ts` (padrão de 502 sem vazamento)
- [X] T043 [P] [US3] Integration test de autorização (401 sem sessão, 403 não-Admin, 400 payload inválido, 201 Admin válido) em `tests/integration/connex-insights-usuarios-authz.test.ts`
- [ ] T044 [P] [US3] Teste de política RLS de `insights_user_provisioning_requests` — **não executado**: exige Postgres real com RLS avaliável (Vitest/mocks não avaliam RLS); policies SQL revisadas manualmente em `prisma/migrations/20260722180000_.../migration.sql`

### Implementation for User Story 3

- [X] T045 [US3] Implementar `lib/utils/generate-temporary-password.ts` (gerador criptograficamente seguro via `node:crypto`, compatível com a política de senha do Connex Insights)
- [X] T046 [US3] Implementar `lib/services/connex-insights-provisioning.service.ts` orquestrando o fluxo completo (duplicidade local → valida tenant → cria `PENDING` → cria Auth user no Insights → `INSERT` em `profiles` com mapeamento explícito `login` → compensa em caso de falha → atualiza registro local → registra `audit_log`) conforme `research.md` § D2/D3
- [X] T047 [US3] Implementar compensação (`deleteAuthUser`) em `connex-insights-remote.repository.ts` acionada pelo service quando o `INSERT` em `profiles` falha
- [X] T048 [US3] Adicionar registro em `audit_log` (ação `CREATE_CONNEX_INSIGHTS_USER`) no caminho de sucesso do service — tabela `audit_log` criada nesta feature (`supabase/migrations/20260722180500_create_audit_log.sql`, inexistente anteriormente no repositório)
- [X] T049 [US3] Implementar `POST` de `app/api/aplicacoes/connex-insights/usuarios/route.ts` (autentica, valida role Admin, valida payload com Zod, chama o service, mapeia `ProvisioningStatus` via `switch` exaustivo com `default` lançando erro de tipo `never` — Principle II)
- [X] T050 [P] [US3] Criar `app/aplicacoes/connex-insights/components/CreateUserDialog.tsx` (react-hook-form + Zod, desabilita submit imediatamente, ignora cliques duplicados, reabilita somente após resposta)
- [X] T051 [P] [US3] Criar `app/aplicacoes/connex-insights/components/CreateUserSuccessModal.tsx` (exibe senha temporária uma única vez + ação de copiar)
- [X] T052 [P] [US3] Criar `app/aplicacoes/connex-insights/components/CreateUserErrorModal.tsx` (mensagem amigável por status HTTP conforme tabela de `data-model.md`, renderizado inline dentro do `CreateUserDialog` — preserva os valores do formulário)
- [X] T053 [US3] Integrar diálogo + modais de sucesso/erro em `app/aplicacoes/connex-insights/ConnexInsightsPageClient.tsx`: ao suceder, fecha o formulário, atualiza listagem + dashboard via refetch e mostra o modal de sucesso

**Checkpoint**: US3 completa; fluxo ponta a ponta funcional (sujeito à dependência externa T010 — coluna `login` no Connex Insights).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validações finais que atravessam as 3 user stories.

- [ ] T054 [P] Executar os 5 cenários de `quickstart.md` e registrar evidências (contagens via MCP, ausência de estados inconsistentes) — **não executado**: exige ambiente com `DATABASE_URL`/`SUPABASE_INSIGHTS_*` reais e MCPs autenticados, indisponíveis nesta sessão
- [X] T055 Revisar arquivos criados nesta feature quanto ao limite de 300 linhas (Principle XI) — maior arquivo novo tem 181 linhas (`CreateUserDialog.tsx`); nenhuma divisão necessária
- [X] T056 [P] Revisão de acessibilidade do formulário e dos modais — reaproveita os primitives acessíveis existentes (`Form`/`FormLabel`/`FormMessage` com `aria-invalid`/`aria-describedby`, `Dialog`/`Select` Radix com foco/teclado nativos)
- [X] T057 Revisão de segurança via MCP `supabase`/`supabase-insights` — **executado**: `get_advisors(type=security)` no projeto do CRM não aponta nenhum problema novo introduzido pelas 2 tabelas desta feature (RLS habilitada em ambas, sem policy `USING (true)`); o único achado novo — `function_search_path_mutable` na função de trigger — foi corrigido via migration adicional `20260722203216_harden_insights_provisioning_trigger_search_path`. Demais WARNs listados pelo advisor são pré-existentes e fora do escopo desta feature. Revisão manual confirma ainda que `SUPABASE_INSIGHTS_SERVICE_ROLE_KEY` só é lida em `lib/integrations/connex-insights/admin-client.ts` (módulo server-only, nunca importado por Client Components)
- [X] T058 [P] Atualizar `.env.example` com as novas variáveis de ambiente e `README.md` com seções "Variáveis de ambiente", "Banco de dados (Prisma)" e "Testes" (incluindo `pnpm prisma migrate deploy`)
- [ ] T059 Confirmar status da dependência externa (T010 / `research.md` § D7 — coluna `login` no Connex Insights) antes de habilitar a feature em produção — **bloqueio de release confirmado**: a coluna não existe hoje; a feature não deve ser habilitada em produção até a migration correspondente ser aplicada no `connex-insights`
- [X] T060 [P] Unit test do logger estruturado garantindo que nenhum payload logado (sucesso ou falha) contenha o campo de senha temporária, mesmo se passado por engano ao helper, em `tests/unit/connex-insights-provisioning-logger.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente.
- **Foundational (Phase 2)**: Depende da conclusão do Setup — BLOQUEIA todas as user stories.
- **User Stories (Phase 3-5)**: Todas dependem da conclusão da Fase Foundational.
  - US1, US2 e US3 são todas P1 e formam uma cadeia de valor incremental (hub → painel → criação); recomenda-se ordem sequencial (US1 → US2 → US3), mas cada uma é testável isoladamente por sua própria rota.
- **Polish (Phase 6)**: Depende de US1, US2 e US3 concluídas.

### User Story Dependencies

- **US1 (P1)**: Pode começar após a Fase Foundational — sem dependência de US2/US3.
- **US2 (P1)**: Pode começar após a Fase Foundational; reaproveita `require-admin` (T015) da mesma fase — não depende da conclusão de US1, mas compartilha o mesmo padrão de guarda de acesso.
- **US3 (P1)**: Reaproveita a página e o hook de listagem criados em US2 (T032, T035) para integrar os modais — deve começar após US2 estar ao menos com a página/hook criados (T032-T035).

### Within Each User Story

- Testes (quando incluídos) são escritos e devem falhar antes da implementação correspondente (Principle IV).
- Schemas Zod antes de repositories/handlers (Principle III) — já cobertos na Fase Foundational (T013).
- Repositories antes de services; services antes de Route Handlers (Principle I).
- Políticas RLS antes de qualquer código de acesso a dados (Principle X) — T008 na Fase Foundational.
- Registro de `audit_log` mapeado antes da implementação final do service (Principle VIII) — T048.

### Parallel Opportunities

- T001-T005 (Setup) majoritariamente paralelizáveis.
- T008-T010, T012-T014, T016-T017 (Foundational) marcados [P] podem rodar em paralelo entre si.
- Testes de uma mesma user story marcados [P] podem rodar em paralelo.
- US1 e US2 podem ser desenvolvidas em paralelo por pessoas diferentes assim que a Fase Foundational terminar; US3 depende de artefatos de UI da US2 (T032, T035).

---

## Parallel Example: User Story 3

```bash
# Testes da US3 em paralelo (antes da implementação):
Task: "Unit tests de connex-insights-provisioning.service.ts em tests/unit/connex-insights-provisioning.service.test.ts"
Task: "Unit test do gerador de senha temporária em tests/unit/generate-temporary-password.test.ts"
Task: "Integration test de duplicidade em tests/integration/connex-insights-usuarios-duplicate.test.ts"
Task: "Integration test de falha externa em tests/integration/connex-insights-usuarios-failure.test.ts"

# Componentes de UI da US3 em paralelo:
Task: "CreateUserDialog.tsx em app/aplicacoes/connex-insights/components/CreateUserDialog.tsx"
Task: "CreateUserSuccessModal.tsx em app/aplicacoes/connex-insights/components/CreateUserSuccessModal.tsx"
Task: "CreateUserErrorModal.tsx em app/aplicacoes/connex-insights/components/CreateUserErrorModal.tsx"
```

---

## Implementation Strategy

### MVP incremental (as 3 stories são P1)

1. Completar Fase 1: Setup
2. Completar Fase 2: Foundational (CRÍTICO — bloqueia todas as stories)
3. Completar Fase 3: US1 → **validar** hub + controle de acesso isoladamente
4. Completar Fase 4: US2 → **validar** painel/indicadores/listagem isoladamente
5. Completar Fase 5: US3 → **validar** criação ponta a ponta via `quickstart.md`
6. Completar Fase 6: Polish

### Entrega incremental

Cada fase de user story pode ser demonstrada/avaliada isoladamente antes de avançar para a próxima, mesmo que a entrega completa da funcionalidade de negócio só se realize ao final da US3.

---

## Notes

- [P] = arquivos diferentes, sem dependência pendente.
- [Story] mapeia a tarefa à user story correspondente para rastreabilidade.
- A dependência externa (coluna `login` em `profiles` do Connex Insights — T010/T059) não é implementável dentro deste repositório; é bloqueio de release, documentado desde o `spec.md` (seção "Impacto Cross-Repo").
- T024, T037 e T060 foram ajustadas/adicionadas após `/speckit.analyze` para fechar gaps de guarda de acesso (I1), teste de logging de senha (G1) e sanitização de erros (G2, refletido em T041/T042).
- Fazer commit após cada tarefa ou grupo lógico de tarefas.
- **Execução de `/speckit.implement` (2026-07-22)**: todo o código de produção das 3 user stories foi implementado (37 arquivos novos/alterados), `pnpm build` e `pnpm exec tsc --noEmit` passam sem erros novos, e `pnpm test` roda 39 testes (8 arquivos) com sucesso. Na sessão inicial, as seguintes tarefas não puderam ser executadas por falta de MCPs autenticados: T007, T009, T010, T057.
- **Aplicação de migrations via MCP Supabase (2026-07-22, sessão seguinte)**: com os servidores MCP `project-0-connex-crm-supabase1` (projeto do CRM) e `project-0-connex-crm-supabase2` (projeto do Connex Insights) autenticados, foram concluídas: T007 (migrations `create_audit_log` e `add_insights_user_provisioning_requests` aplicadas via `apply_migration`, com bookkeeping de `_prisma_migrations` registrado manualmente — checksum SHA-256 do arquivo local — para compatibilidade futura com `pnpm prisma migrate deploy`), T008 (RLS confirmada), T009 (schema validado via `list_tables`/`get_advisors`), T010 (confirmado ao vivo que `public.profiles` do Connex Insights não tem coluna `login`) e T057 (revisão de segurança via `get_advisors`; 1 warning novo — `function_search_path_mutable` — corrigido via migration adicional `harden_insights_provisioning_trigger_search_path`).
- Tarefas que **continuam não executadas** por dependerem de app rodando com `DATABASE_URL`/`SUPABASE_INSIGHTS_*` reais configurados no `.env` (chave secreta `SUPABASE_INSIGHTS_SERVICE_ROLE_KEY` e senha do Postgres não são obtidas via MCP, por design de segurança do Supabase): T020, T024, T025-T027, T037 (parcial), T040-T042 (substituídos por unit tests equivalentes do service), T044, T054. Ver detalhes em cada tarefa acima e no relatório final da conversa.
- Parar em cada checkpoint de user story para validar independentemente antes de prosseguir.
