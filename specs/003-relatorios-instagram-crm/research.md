# Research: Visualização de Relatórios do Instagram no Connex CRM

**Feature**: `003-relatorios-instagram-crm`
**Data**: 2026-07-26

Este documento resolve as incertezas técnicas do Technical Context antes do desenho de Fase 1, com base na exploração do código atual de `connex-crm` e `connex-insights`. Achado crítico: **o `connex-insights` ainda não possui nenhuma entidade, job ou pipeline de "relatório semanal/mensal"** — existe apenas sync diário de mídia/métricas cruas (`instagram_media`, `instagram_metric_snapshots`) e um dashboard de analytics sob demanda. Isso significa que esta feature, no `connex-crm`, precisa desenhar tanto o **lado de recebimento/persistência** (dentro do escopo deste plano) quanto **o contrato** que uma feature futura do `connex-insights` (fora do escopo deste plano/repositório) deverá implementar para gerar e enviar os relatórios já processados.

---

## D1. Onde persistir os relatórios recebidos

**Pergunta**: Os relatórios semanais/mensais devem ser persistidos em tabelas próprias do `connex-crm`, ou o CRM deve ler diretamente do banco do `connex-insights` (como já ocorre para `tenants`/`profiles` na feature 002)?

**Decision**: Três tabelas novas, de propriedade do `connex-crm`, migradas via **SQL puro em `supabase/migrations/`** (não Prisma — ver rationale abaixo): `instagram_weekly_reports`, `instagram_monthly_reports`, `instagram_report_posts`; mais uma tabela auxiliar `instagram_report_views` (rastreio de "última visualização" por usuário, para o indicador de "novos relatórios"). Ver estrutura completa em [data-model.md](./data-model.md).

**Rationale**:
- FR-024 exige que o CRM trate os relatórios como "registros persistidos e consultáveis" recebidos do Insights — isso implica posse de dados própria no CRM, não apenas leitura remota sob demanda.
- O `connex-insights` **não tem** hoje uma tabela de "relatório" para o CRM ler remotamente (só métricas cruas por dia). Se o CRM lesse os snapshots crus remotamente e calculasse melhor/pior/top-3 por conta própria, violaria diretamente **FR-027** (proibição de lógica de negócio própria sobre postagens) — essa responsabilidade é exclusiva do Insights.
- Manter Prisma restrito à feature 002 (única exceção documentada na Constitution/Complexity Tracking daquela feature) evita reabrir essa exceção; as tabelas de domínio do próprio CRM seguem o padrão dominante (`supabase/migrations/` + `lib/repositories/` com `supabase-js`), igual a `clientes`, `pipeline_leads`, `audit_log`.

**Alternatives considered**:
- *Ler o banco do Insights remotamente e computar melhor/pior/top-3 no CRM*: rejeitado — viola FR-027 (clarificação da spec) e duplicaria, no CRM, uma lógica de negócio que pertence ao domínio do Insights.
- *Usar Prisma também para essas 3 tabelas*: rejeitado — reabriria a exceção já registrada na Constitution/Complexity Tracking da feature 002 sem necessidade nova (nenhum requisito desta feature pede Prisma explicitamente).

---

## D2. Mecanismo de envio Connex Insights → Connex CRM

**Pergunta**: Como o CRM recebe os relatórios já processados, já que hoje **não existe nenhum mecanismo de push/export** do Insights para o CRM (o único fluxo cross-repo existente é o inverso: CRM provisiona usuários no Insights)?

**Decision**: O `connex-crm` expõe **dois endpoints de ingestão HTTP** (service-to-service, não sessão de usuário do CRM): `POST /api/integrations/connex-insights/relatorios-instagram/semanais` e `POST /api/integrations/connex-insights/relatorios-instagram/mensais`. Autenticação via segredo compartilhado enviado em um header (`x-connex-insights-secret`), comparado a uma nova variável de ambiente server-only `CONNEX_INSIGHTS_INGEST_SECRET` (comparação em tempo constante). Contrato completo em [contracts/instagram-reports-ingestion-api.yaml](./contracts/instagram-reports-ingestion-api.yaml).

A implementação do **lado que efetivamente gera e envia** esses relatórios (job/cron novo no `connex-insights` que agrega `instagram_media`/`instagram_metric_snapshots` em relatórios semanais/mensais e chama esses endpoints) é uma **dependência externa bloqueante, fora do escopo deste plano e deste repositório** — análogo a como a feature 002 tratou a coluna `login` em `profiles` do Insights. Sem essa dependência implementada, os endpoints de ingestão existem e funcionam, mas nenhum dado chega organicamente (pode-se popular manualmente via `execute_sql`/seed para validar a UI).

**Rationale**: Sessão de usuário do CRM não se aplica — quem chama esse endpoint é um processo do `connex-insights`, não um usuário logado no CRM. Um segredo compartilhado simples (comparável a um webhook secret) é consistente com a escala do projeto (uso interno, dois produtos da mesma empresa) e evita a complexidade de mTLS ou OAuth service-to-service sem necessidade real.

**Alternatives considered**:
- *CRM lê diretamente o Postgres do Insights via Service Role (como na feature 002)*: rejeitado para os relatórios em si — exigiria que o Insights já tivesse tabelas de relatório prontas (não tem) e, se o CRM tivesse que agregá-las, cairia no mesmo problema do D1 (violaria FR-027). Continua sendo usado, porém, só para o status/username/avatar da integração (ver D3), que já existe pronto no Insights.
- *Fila assíncrona (SQS/Pub-Sub)*: over-engineering para o volume esperado (dezenas de clientes, relatórios semanais/mensais); rejeitado por complexidade desnecessária.

---

## D3. Fonte dos dados de status/username/avatar do Instagram exibidos no card do cliente

**Pergunta**: O card do cliente (FR-004) exige nome de usuário do Instagram, avatar e status de integração. Isso deve ser duplicado nas tabelas novas do CRM, ou lido do Insights?

**Decision**: Ler diretamente da tabela `instagram_integrations` do `connex-insights` via o client remoto Service Role **já existente** (`createConnexInsightsAdminClient()`), reaproveitando o padrão de `ConnexInsightsRemoteRepository` (feature 002) com um novo método de leitura em lote por `tenant_id IN (...)` (`tenant_id` = `clientes.id`, join 1:1 já estabelecido). Nenhuma tabela nova é criada no CRM para espelhar esses dados.

**Rationale**: `instagram_integrations` já existe no Insights com exatamente os campos necessários (`username`, `profile_picture_url`, `status: CONNECTED | DISCONNECTED | REQUIRES_RECONNECTION`). Duplicar esses dados no CRM criaria uma segunda fonte de verdade sujeita a drift (a integração pode mudar de status a qualquer momento no Insights, sem nenhum evento notificando o CRM). Isso não viola FR-024 (que proíbe o CRM de falar com a API do Instagram diretamente) nem FR-027 (não há nenhuma lógica de negócio aqui — é apenas leitura de metadados de conexão).

**Alternatives considered**:
- *Insights envia username/avatar/status junto de cada relatório*: rejeitado como fonte primária — ficaria desatualizado entre o envio de um relatório e o próximo (podem passar dias/semanas), dando uma UX pior do que ler o status ao vivo.

---

## D4. Modelagem das postagens dentro dos relatórios

**Decision**: Tabela normalizada `instagram_report_posts` (não JSONB solto por postagem), com uma coluna `role` (`BEST` | `WORST` | `TOP_1` | `TOP_2` | `TOP_3`) definida pelo Insights no payload de ingestão, e uma coluna `metrics JSONB` para as métricas variáveis do Instagram (engajamento, alcance, impressões, curtidas, comentários, compartilhamentos, salvamentos, visualizações e "outras métricas disponibilizadas" — FR-017 pede explicitamente extensibilidade aqui).

**Rationale**: Estrutura relacional para os campos estáveis (permalink, thumbnail, tipo de conteúdo, data de publicação, ranking) permite queries e constraints (Data Integrity); `metrics JSONB` absorve a variabilidade do conjunto de métricas do Instagram sem exigir migration a cada novo campo que a Graph API passe a expor — trade-off documentado explicitamente (não é uma "regra de negócio", é apenas armazenamento de um payload de métricas cujo formato é definido pelo Insights).

**Alternatives considered**: Uma coluna por métrica (`likes_count`, `comments_count`, ...) — rejeitada por exigir migration toda vez que uma nova métrica do Instagram precisar ser exibida, indo contra FR-017 ("outras métricas disponibilizadas pelo Instagram").

---

## D5. Indicador de "novos relatórios" por usuário

**Decision**: Tabela `instagram_report_views (user_id, cliente_id, last_viewed_at)` com `UNIQUE(user_id, cliente_id)`, upsertada pelo próprio usuário (RLS: `user_id = auth.uid()`) ao abrir a página de relatórios de um cliente. O indicador "novo" compara `last_viewed_at` contra a data de referência do relatório mais recente daquele cliente (view `instagram_client_report_summary`, ver D6).

**Rationale**: Atende à premissa já registrada no `spec.md` ("indicador de novos relatórios" = período de referência mais recente que a última visualização do usuário) de forma simples, sem depender de `localStorage` (que não sincroniza entre dispositivos/sessões) e sem exigir nenhuma lógica de negócio sobre o conteúdo do relatório em si.

---

## D6. Agregação para a lista de clientes (paginação + "último relatório")

**Decision**: Uma **view** Postgres `instagram_client_report_summary` (com `security_invoker = true`, para respeitar RLS das tabelas base) que une `instagram_weekly_reports` e `instagram_monthly_reports` por `cliente_id`, expondo `last_report_reference_date` e `last_generated_at`. A listagem paginada de clientes (FR-003) consulta `clientes` filtrando por `EXISTS` nessa view, ordenando por `last_report_reference_date DESC` (FR-018), com `page`/`limit` no mesmo padrão já usado em `ClientesRepository.findMany` e `ConnexInsightsRemoteRepository.listUsers`.

**Rationale**: Evita duplicar a lógica de "data do período de referência mais recente" (que combina duas tabelas com formatos de período diferentes — semana vs. mês) em múltiplos lugares do código; a viewencapsula essa união uma única vez.

---

## D7. Sidebar com submenu

**Pergunta**: A sidebar atual (`components/layout/sidebar.tsx`) usa uma lista plana de `navItems`, sem suporte a itens aninhados. A spec exige "Relatórios" → "Relatórios de Instagram".

**Decision**: Estender o item `Relatórios` existente para aceitar um array opcional `children` (`{ href, label }[]`); quando presente, o item expande/colapsa (estado local, ícone `ChevronDown`) mostrando os filhos (`Visão Geral` → `/relatorios`, `Relatórios de Instagram` → `/relatorios/instagram`). O estado "ativo" passa a considerar `pathname.startsWith(child.href)` para destacar o pai quando qualquer neto de rota estiver ativo.

**Rationale**: Menor mudança possível no componente existente; não introduz uma dependência nova de navegação (menu multinível) para um único caso de uso.

---

## D8. Rotas de página e carregamento progressivo (App Router)

**Decision**: Modelar a navegação hierárquica como **segmentos de rota** aninhados (não como estado client-side dentro de uma única página), aproveitando os arquivos de convenção do Next.js App Router (`loading.tsx`, `error.tsx`) para satisfazer FR-021/FR-022/FR-023/FR-025 de forma nativa:

```text
/relatorios/instagram                                        → lista paginada de clientes
/relatorios/instagram/[clienteId]                             → header do cliente + tabs (meses)
/relatorios/instagram/[clienteId]/semanais/[ano]/[mes]         → semanas do mês
/relatorios/instagram/[clienteId]/semanais/[ano]/[mes]/[semana] → conteúdo do relatório semanal
/relatorios/instagram/[clienteId]/mensais/[ano]/[mes]          → conteúdo do relatório mensal
```

Cada segmento é um **Server Component** que busca apenas os dados daquele nível diretamente via service/repository (sem round-trip HTTP interno — Constitution XII, "Server Components como padrão"); cada segmento tem seu próprio `loading.tsx` (skeleton) e `error.tsx` (mensagem amigável + botão "Tentar novamente" usando `reset()`), isolando falhas por cliente/nível sem afetar os demais (FR-023).

**Rationale**: Essa é a forma idiomática do App Router de resolver exatamente os requisitos de carregamento progressivo, skeletons por nível e isolamento de erro, sem reimplementar manualmente (via hooks + estado) o que o framework já oferece — reduz código e é mais alinhado à Constitution do que o padrão legado usado em `/relatorios` (fetch client-side via `useEffect`).

**Alternatives considered**: Página única client-side com estado de navegação e um hook de fetch por nível (como `useConnexInsightsUsers`) — rejeitado para este caso por exigir reimplementar manualmente skeleton/erro por nível que o App Router já resolve de graça com arquivos de convenção.

---

## D9. Persistência da tab selecionada (Semanais/Mensais) durante a sessão

**Decision**: `sessionStorage`, chaveado por `clienteId` (`instagram-report-tab:<clienteId>`), lido/escrito por um Client Component (`InstagramReportTabs`) que envolve o conteúdo de `[clienteId]/page.tsx`. Cai para `"semanais"` quando não há entrada.

**Rationale**: Atende literalmente à premissa "lembrada apenas durante a sessão ativa do usuário no navegador" já registrada no `spec.md`, sem exigir uma tabela nova no banco para algo que é puramente de UX e não precisa sobreviver a fechar a aba.

---

## D10. Skeletons

**Decision**: Introduzir `components/ui/skeleton.tsx` (primitivo padrão shadcn/ui, ainda inexistente no projeto — hoje o CRM usa `Loader2` ou `animate-pulse` ad-hoc). Usado nos 4 níveis de `loading.tsx` desta feature.

**Rationale**: Constitution V exige "skeletons" explicitamente para carregamentos assíncronos; não há esse primitivo hoje, e introduzi-lo como componente de UI reutilizável (em vez de `animate-pulse` ad-hoc) beneficia features futuras também.

---

## D11. Escrita nas tabelas novas do CRM a partir do endpoint de ingestão (bypass de RLS)

**Pergunta**: RLS fica habilitado nas tabelas novas (Constitution X), mas a chamada de ingestão vem do `connex-insights` sem sessão de usuário do CRM — nenhuma policy de `authenticated` deveria permitir esse INSERT/UPSERT.

**Decision**: Introduzir um client administrativo **do próprio Supabase do CRM** (`lib/server-admin.ts`, novo — usa `SUPABASE_SERVICE_ROLE_KEY` do projeto `fkwlzsnkdekcptaatoli`, nova env var server-only), usado **exclusivamente** dentro dos dois Route Handlers de ingestão, depois de validado o segredo compartilhado (D2). RLS permanece habilitado e é a linha de defesa para qualquer acesso via sessão de usuário comum ou chave anônima; não há policy de `INSERT`/`UPDATE` para o papel `authenticated` nessas 3 tabelas.

**Rationale**: Espelha o mesmo princípio já usado para chamadas administrativas ao Insights (Service Role restrita a contexto de servidor, nunca exposta ao cliente), aplicado desta vez ao próprio banco do CRM — não é uma tabela nova de exceção, é o mesmo padrão de "porta de serviço" já validado na feature 002, apenas na direção inversa.

---

## D12. Testes

**Decision**: Vitest (já configurado no `connex-crm` desde a feature 002) para unit tests de repositories/services (mocks de `SupabaseClient`, tanto local quanto o admin client remoto do Insights) e integration tests dos Route Handlers de ingestão (segredo ausente/errado → 401; payload inválido → 400; `clienteId` inexistente → 404; upsert idempotente por `sourceReportId` → 200 em chamada repetida). Testes E2E permanecem fora de escopo (sem Playwright configurado no CRM).

---

## D13. Auditoria da ingestão

**Pergunta**: `audit_log` exige `actor_profile_id NOT NULL` referenciando `profiles(id)` — um evento de ingestão automática não tem um usuário humano por trás.

**Decision**: Eventos de ingestão **não** são gravados em `audit_log` (que é para ações humanas). A trilha de auditoria da ingestão é o próprio registro persistido (`created_at`/`updated_at` + `source_report_id` único) somado a logs estruturados de servidor (OBS-001/OBS-002) — sucesso, falha de validação e tentativas com segredo inválido são logados com contexto (sem o segredo em si).

**Rationale**: Evita alterar a constraint `NOT NULL` de uma tabela de auditoria já em uso por outra feature só para acomodar um evento de sistema; os requisitos de observabilidade da spec (OBS-001/OBS-002) já são satisfeitos por log estruturado, sem exigir uma linha em `audit_log`.
