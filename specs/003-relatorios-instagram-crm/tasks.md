---

description: "Task list for feature 003-relatorios-instagram-crm"
---

# Tasks: Visualização de Relatórios do Instagram no Connex CRM

**Input**: Documentos de design de `specs/003-relatorios-instagram-crm/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/instagram-reports-ingestion-api.yaml`, `quickstart.md`

**Tests**: Incluídos — a Constitution (Principle IV, "Comprehensive Testing") e a seção *Testing* do `plan.md` exigem explicitamente unit tests para repositories/services novos e integration tests para os 2 Route Handlers de ingestão (caminho feliz, segredo inválido, payload inválido, cliente inexistente). E2E (Playwright) permanece fora de escopo (não configurado no `connex-crm`).

**Organization**: Tarefas agrupadas por user story (spec.md) para permitir implementação e teste independentes de cada uma.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependências entre si)
- **[Story]**: A qual user story a tarefa pertence (US1, US2, US3) — Setup/Foundational/Polish não têm label
- Caminhos de arquivo exatos incluídos em cada descrição

## Path Conventions

Repositório único (`connex-crm`, Next.js App Router). Estrutura conforme `plan.md` § Project Structure: `app/relatorios/instagram/**` (páginas), `app/api/integrations/connex-insights/relatorios-instagram/**` (ingestão), `lib/{services,repositories,schemas,constants}/**`, `supabase/migrations/**`, `tests/{unit,integration}/instagram-reports/**`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar variáveis de ambiente e primitivos de UI reutilizados por todas as user stories.

- [X]  Adicionar `SUPABASE_SERVICE_ROLE_KEY` (novo, projeto `fkwlzsnkdekcptaatoli`) e `CONNEX_INSIGHTS_INGEST_SECRET` (novo) ao `.env.example`, com comentários explicando o uso exclusivo pelos endpoints de ingestão (research.md § D2/D11)
- [X]  [P] Criar primitivo `components/ui/skeleton.tsx` (shadcn/ui) — usado nos 4 níveis de `loading.tsx` desta feature (research.md § D10)
- [X]  [P] Criar `lib/constants/instagram-reports.ts` com as uniões TypeScript `PostRole` (`BEST`|`WORST`|`TOP_1`|`TOP_2`|`TOP_3`), `ReportStatus` (`AVAILABLE`|`PARTIAL`) e `InstagramIntegrationStatus` (`CONNECTED`|`DISCONNECTED`|`REQUIRES_RECONNECTION`), usadas em `switch` exaustivos (Constitution II)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema de banco, RLS, clients administrativos, repositories base, ingestão HTTP e submenu da sidebar — tudo que as 3 user stories dependem para existir.

**⚠️ CRITICAL**: Nenhuma user story pode ser validada de ponta a ponta (com dados reais) antes desta fase estar completa, pois é aqui que os dados passam a poder ser inseridos e lidos.

- [X]  Criar migration `supabase/migrations/<timestamp>_create_instagram_reports.sql` com as 4 tabelas (`instagram_weekly_reports`, `instagram_monthly_reports`, `instagram_report_posts`, `instagram_report_views`), a view `instagram_client_report_summary` (`security_invoker = true`), índices, constraints `CHECK`/`UNIQUE` e triggers `moddatetime` em `updated_at`, exatamente conforme `data-model.md`
- [X]  Habilitar RLS e criar as policies das 4 tabelas novas conforme a tabela de RLS em `data-model.md` (`SELECT` para `authenticated` nas 3 tabelas de relatório/posts, sem policy de escrita para `authenticated`; `instagram_report_views` com `SELECT`/`INSERT`/`UPDATE` restritos a `user_id = auth.uid()`) — parte da mesma migration de T004
- [X]  Aplicar a migration de T004/T005 no Supabase do `connex-crm` e validar com `list_tables`/`get_advisors` que as 4 tabelas, a view e as policies foram criadas sem alertas de segurança
- [X]  [P] Criar `lib/server-admin.ts` — client administrativo (Service Role) do próprio Supabase do CRM, usado exclusivamente pelos 2 Route Handlers de ingestão para contornar RLS de forma controlada (research.md § D11, espelha `lib/integrations/connex-insights/admin-client.ts`)
- [X]  [P] Adicionar método `listIntegrationsByTenantIds(admin, tenantIds: string[])` em `lib/repositories/connex-insights-remote.repository.ts`, lendo `instagram_integrations` (`username`, `profile_picture_url`, `status`) em lote por `tenant_id IN (...)` (research.md § D3)
- [X]  [P] Criar `lib/repositories/instagram-weekly-reports.repository.ts`: `upsertBySourceReportId` (idempotente, com posts `BEST`/`WORST` associados), `listMonthsByCliente` (paginado), `listWeeksByClienteAndMonth` (paginado), `findByClienteAndReference(ano, mes, semana)`
- [X]  [P] Criar `lib/repositories/instagram-monthly-reports.repository.ts`: `upsertBySourceReportId` (idempotente, com posts `TOP_1..3`/`WORST` associados), `listMonthsByCliente` (paginado), `findByClienteAndReference(ano, mes)`
- [X]  [P] Criar `lib/repositories/instagram-report-views.repository.ts`: `getLastViewedAt(userId, clienteId)`, `upsertViewedNow(userId, clienteId)`
- [X]  Criar `lib/repositories/instagram-report-summary.repository.ts`: `listClientesComRelatorios(page, limit)` consultando `clientes` filtrado por `EXISTS` na view `instagram_client_report_summary`, ordenado por `last_report_reference_date DESC` (FR-003/FR-018/FR-026), depende de T004
- [X]  [P] Criar `lib/schemas/instagram-reports/weekly-report-ingest.schema.ts` (Zod, espelhando `WeeklyReportIngestRequest` do contrato — `sourceReportId`, `clienteId` UUID, `referenceYear/Month/Week`, `periodStart`/`periodEnd` com `periodStart <= periodEnd`, `status`, `bestPost`/`worstPost` opcionais)
- [X]  [P] Criar `lib/schemas/instagram-reports/monthly-report-ingest.schema.ts` (Zod, espelhando `MonthlyReportIngestRequest` — `topPosts` máx. 3 itens, `worstPost` opcional, `followersGained/Start/End`, `followersGrowthPct`, `accountsReached` opcionais)
- [X]  Criar `lib/services/instagram-reports-ingestion.service.ts`: valida `clienteId` existente (404), faz upsert idempotente via T009/T010, loga sucesso/falha com contexto (OBS-001), depende de T009, T010, T013, T014
- [X]  [P] Criar `app/api/integrations/connex-insights/relatorios-instagram/semanais/route.ts` (POST — valida header `x-connex-insights-secret` em tempo constante contra `CONNEX_INSIGHTS_INGEST_SECRET` → 401; parseia com T013 → 400; delega a T015 → 200/201/404), depende de T007, T013, T015
- [X]  [P] Criar `app/api/integrations/connex-insights/relatorios-instagram/mensais/route.ts` (mesmo padrão de T016, usando T014), depende de T007, T014, T015
- [X]  [P] Registrar tentativas de segredo inválido nas rotas de ingestão para auditoria de segurança (OBS-002), em T016 e T017
- [X]  [P] Testes de integração dos 2 endpoints de ingestão em `tests/integration/instagram-reports/ingestion.test.ts` (401 sem segredo/segredo errado, 400 payload inválido, 404 `clienteId` inexistente, 201 na criação e 200 idempotente na reingestão pelo mesmo `sourceReportId`), depende de T016, T017
- [X]  [P] Testes unitários de `instagram-weekly-reports.repository.ts` e `instagram-monthly-reports.repository.ts` (mock de `SupabaseClient`) em `tests/unit/instagram-reports/instagram-weekly-reports.repository.test.ts` e `tests/unit/instagram-reports/instagram-monthly-reports.repository.test.ts`
- [X]  [P] Estender `components/layout/sidebar.tsx` para suportar `children?: { href: string; label: string }[]` no item `Relatórios`, com expandir/colapsar (`ChevronDown`, estado local) e `Relatórios de Instagram` apontando para `/relatorios/instagram`; destacar o pai quando `pathname.startsWith(child.href)` (research.md § D7)

**Checkpoint**: Fundação pronta — schema, RLS, ingestão funcional e sidebar navegável. As 3 user stories podem começar (dados de teste populáveis via `quickstart.md`).

---

## Phase 3: User Story 1 - Acessar a área de Relatórios de Instagram e localizar um cliente (Priority: P1) 🎯 MVP

**Goal**: Usuário autenticado acessa Relatórios > Relatórios de Instagram e vê, paginados, os cards clicáveis de todos os clientes com relatórios disponíveis (nome, usuário do Instagram, avatar, status, data do último relatório, indicador de "novo").

**Independent Test**: Login no CRM → Relatórios > Relatórios de Instagram → cards paginados com as informações essenciais aparecem; skeleton durante carregamento; estado vazio quando não há clientes com relatórios; erro amigável com retry em caso de falha; clique no card navega para a página do cliente.

### Tests for User Story 1

- [X]  [P] [US1] Teste unitário de `instagram-report-summary.repository.ts` (paginação, filtro `EXISTS`, ordenação por `last_report_reference_date DESC`) em `tests/unit/instagram-reports/instagram-report-summary.repository.test.ts`
- [X]  [P] [US1] Teste unitário de `InstagramReportsService.listClientsWithReports` (combina resumo local + status/avatar remoto em lote + indicador de "novo", isola erro de leitura remota por cliente sem quebrar os demais — FR-023) em `tests/unit/instagram-reports/instagram-reports.service.test.ts`

### Implementation for User Story 1

- [X]  [US1] Criar `lib/services/instagram-reports.service.ts` com `listClientsWithReports(page, limit, userId)`: pagina via T012, busca `username`/`avatar`/`status` em lote via T008, calcula indicador de "novo" comparando `last_report_reference_date` com `getLastViewedAt` (T011); falha na leitura remota de um cliente não deve interromper os demais (loga com OBS-001 e marca status como indisponível para aquele cliente), depende de T008, T011, T012
- [X]  [US1] Criar `app/relatorios/instagram/page.tsx` (Server Component): `requireAuthOrRedirect()`, lê `page`/`limit` da query string, chama T024, exibe estado vazio quando não houver clientes com relatórios (FR-020), depende de T024
- [X]  [P] [US1] Criar `app/relatorios/instagram/loading.tsx` (skeleton dos cards, usando T002)
- [X]  [P] [US1] Criar `app/relatorios/instagram/error.tsx` (mensagem amigável sem termos técnicos + botão "Tentar novamente" via `reset()`)
- [X]  [P] [US1] Criar `app/relatorios/instagram/components/ClientReportCard.tsx` (nome, usuário do Instagram, avatar, badge de status via `switch` exaustivo sobre `InstagramIntegrationStatus`, data do último relatório, indicador de "novo", clicável para `/relatorios/instagram/[clienteId]`)
- [X]  [P] [US1] Criar `app/relatorios/instagram/components/ClientReportCardSkeleton.tsx`
- [X]  [P] [US1] Criar `app/relatorios/instagram/components/InstagramReportsPagination.tsx` (paginação sempre ativa, FR-026)

**Checkpoint**: User Story 1 completa e testável de forma independente — lista de clientes navegável, com estados de carregamento/vazio/erro.

---

## Phase 4: User Story 2 - Visualizar relatórios semanais de um cliente (Priority: P1)

**Goal**: Na página do cliente, tab "Semanais" (padrão) exibe meses em ordem decrescente; ao escolher um mês, as semanas daquele mês; ao escolher uma semana, a postagem de melhor e de pior performance, visualmente diferenciadas.

**Independent Test**: Acessar a página de um cliente com relatórios semanais processados → tab Semanais selecionada por padrão → meses em ordem cronológica decrescente → selecionar mês exibe semanas com período/status → selecionar semana exibe melhor/pior performance com diferenciação visual clara; tab persiste durante a sessão; estado vazio "Nenhum relatório semanal disponível." quando aplicável; erro isolado por nível com retry.

### Tests for User Story 2

- [X]  [P] [US2] Teste unitário dos métodos `listWeeklyMonths`, `listWeeksForMonth` e `getWeeklyReport` de `InstagramReportsService` (ordenação decrescente por período de referência — FR-018, paginação — FR-026) em `tests/unit/instagram-reports/instagram-reports-weekly.service.test.ts`

### Implementation for User Story 2

- [X]  [US2] Adicionar a `lib/services/instagram-reports.service.ts` os métodos: `getClienteHeader(clienteId)` (nome, conta do Instagram, avatar, última atualização — FR-006), `listWeeklyMonths(clienteId, page, limit)`, `listWeeksForMonth(clienteId, ano, mes, page, limit)`, `getWeeklyReport(clienteId, ano, mes, semana)`, depende de T008, T009
- [X]  [US2] Criar `app/relatorios/instagram/[clienteId]/page.tsx` (Server Component): header do cliente (T032), tabs Semanais/Mensais, registra visualização via `upsertViewedNow` (T011) para atualizar o indicador de "novo" da lista (FR-004), depende de T032, T011
- [X]  [P] [US2] Criar `app/relatorios/instagram/[clienteId]/loading.tsx`
- [X]  [P] [US2] Criar `app/relatorios/instagram/[clienteId]/error.tsx`
- [X]  [P] [US2] Criar `app/relatorios/instagram/[clienteId]/components/ClienteInstagramHeader.tsx` (nome, conta do Instagram, avatar, última atualização, link de volta para a lista — FR-006)
- [X]  [US2] Criar `app/relatorios/instagram/[clienteId]/components/InstagramReportTabs.tsx` (`"use client"`, persiste a tab ativa em `sessionStorage` chaveado por `clienteId`, padrão `"semanais"` — FR-008, research.md § D9)
- [X]  [US2] Criar `app/relatorios/instagram/[clienteId]/components/MonthGrid.tsx` (lista paginada de meses em ordem decrescente, reutilizável entre as tabs Semanais e Mensais — FR-010/FR-015/FR-026), exibe "Nenhum relatório semanal/mensal disponível." quando vazio (FR-019)
- [X]  [US2] Criar `app/relatorios/instagram/[clienteId]/semanais/[ano]/[mes]/page.tsx` (lista paginada de semanas do mês: ordinal, período inicial/final, data de geração, status, indicador de disponibilidade — FR-011), depende de T032
- [X]  [P] [US2] Criar `.../semanais/[ano]/[mes]/loading.tsx` e `.../semanais/[ano]/[mes]/error.tsx`
- [X]  [US2] Criar `app/relatorios/instagram/[clienteId]/semanais/[ano]/[mes]/[semana]/page.tsx` (conteúdo do relatório semanal: postagem de melhor e pior performance com thumbnail, data, permalink, tipo de conteúdo e métricas, com diferenciação visual clara entre as duas — FR-012/FR-013/FR-017), depende de T032
- [X]  [P] [US2] Criar `.../semanais/[ano]/[mes]/[semana]/loading.tsx` e `.../semanais/[ano]/[mes]/[semana]/error.tsx`

**Checkpoint**: User Stories 1 e 2 funcionando de forma independente — navegação completa até o conteúdo semanal.

---

## Phase 5: User Story 3 - Visualizar relatórios mensais de um cliente (Priority: P2)

**Goal**: Na tab "Mensais", meses em ordem decrescente (sem subdivisão por semana); ao escolher um mês, top 3 postagens (destaque para a 1ª), pior postagem, seguidores ganhos e contas alcançadas.

**Independent Test**: Acessar a tab Mensais de um cliente com relatórios mensais processados → meses em ordem cronológica decrescente sem subdivisão por semana → selecionar mês exibe top 3 (com destaque visual "Melhor Performance do Mês" na 1ª posição), pior performance, seguidores ganhos e contas alcançadas; estado vazio "Nenhum relatório mensal disponível." quando aplicável; erro isolado com retry.

### Tests for User Story 3

- [X]  [P] [US3] Teste unitário dos métodos `listMonthlyMonths` e `getMonthlyReport` de `InstagramReportsService` (ordem do `topPosts` = ranking, índice 0 = Top 1 — FR-016) em `tests/unit/instagram-reports/instagram-reports-monthly.service.test.ts`

### Implementation for User Story 3

- [X]  [US3] Adicionar a `lib/services/instagram-reports.service.ts` os métodos `listMonthlyMonths(clienteId, page, limit)` e `getMonthlyReport(clienteId, ano, mes)`, depende de T010
- [X]  [US3] Criar `app/relatorios/instagram/[clienteId]/mensais/[ano]/[mes]/page.tsx` (top 3 postagens com destaque visual "🏆 Melhor Performance do Mês" na `TOP_1`, pior postagem, seguidores ganhos com início/fim/crescimento percentual quando disponíveis, contas alcançadas — FR-016/FR-017), reutiliza `MonthGrid.tsx` (T038) na tab Mensais, depende de T038, T044
- [X]  [P] [US3] Criar `.../mensais/[ano]/[mes]/loading.tsx` e `.../mensais/[ano]/[mes]/error.tsx`

**Checkpoint**: As 3 user stories funcionando de forma independente e integrada.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validação final de qualidade, segurança e performance sobre as 3 user stories.

- [X]  Rodar `pnpm typecheck`, `pnpm lint` e `pnpm test` na raiz do `connex-crm` e corrigir quaisquer falhas
- [X]  [P] Revisar todos os arquivos novos desta feature quanto ao limite de 300 linhas (Constitution XI), extraindo componentes/funções quando necessário
- [X]  [P] Revisar com `get_advisors` (Supabase) se as políticas RLS das 4 tabelas novas não introduziram alertas de segurança/performance (Constitution X)
- [X]  [P] Revisão de acessibilidade dos novos componentes (contraste do destaque "Melhor Performance", foco em cards/tabs/paginação, `aria-label` em ícones de status) — Constitution V
- [X]  Validar manualmente o `quickstart.md` de ponta a ponta (ingestão simulada → navegação → indicador de "novo" → isolamento de erro/retry)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente
- **Foundational (Phase 2)**: Depende da conclusão do Setup — BLOQUEIA todas as user stories (schema/RLS de T004-T006 bloqueiam qualquer leitura/escrita real; ingestão de T013-T019 é necessária para popular dados de teste end-to-end)
- **User Stories (Phase 3-5)**: Todas dependem da conclusão da Fase Foundational
  - US1 (P1) não depende de US2/US3
  - US2 (P1) reutiliza `[clienteId]/page.tsx` e `MonthGrid.tsx`, mas é testável de forma independente com dados de relatório semanal
  - US3 (P2) reutiliza `[clienteId]/page.tsx` (T033) e `MonthGrid.tsx` (T038) de US2 — única dependência cross-story real desta feature; sem eles, a tab Mensais não tem onde ser renderizada
- **Polish (Phase 6)**: Depende da conclusão das user stories desejadas

### User Story Dependencies

- **User Story 1 (P1)**: Pode começar após a Fase Foundational — sem dependência de US2/US3
- **User Story 2 (P1)**: Pode começar após a Fase Foundational — implementa o shell da página do cliente (`[clienteId]/page.tsx`, tabs, header) usado também por US3
- **User Story 3 (P2)**: Depende de T033/T038 (shell da página do cliente e `MonthGrid`), entregues em US2 — deve ser sequenciada após o início de US2, mesmo que o restante do conteúdo mensal seja independente

### Within Each User Story

- Testes (quando incluídos) antes da implementação correspondente (Constitution IV)
- Repositories (Foundational) antes de services (Constitution I)
- Services antes de páginas/Route Handlers (Constitution I)
- RLS (T005) antes de qualquer código de acesso a dados (Constitution X)
- Componente shell da página do cliente (T033) antes das rotas de conteúdo semanal/mensal

### Parallel Opportunities

- Todas as tarefas [P] do Setup podem rodar em paralelo
- Dentro do Foundational, os repositories (T007-T011), os schemas de ingestão (T013-T014) e os testes (T019-T020) marcados [P] podem rodar em paralelo entre si
- Após o Foundational, US1 pode ser implementada inteiramente em paralelo com o início de US2 (não compartilham arquivos até T033)
- Dentro de cada user story, os componentes de UI marcados [P] (cards, skeletons, `loading.tsx`/`error.tsx`) podem ser feitos em paralelo entre si

---

## Parallel Example: User Story 1

```bash
# Testes de US1 em paralelo:
Task: "Teste unitário de instagram-report-summary.repository.ts em tests/unit/instagram-reports/instagram-report-summary.repository.test.ts"
Task: "Teste unitário de InstagramReportsService.listClientsWithReports em tests/unit/instagram-reports/instagram-reports.service.test.ts"

# Componentes de UI de US1 em paralelo (após T025 existir):
Task: "Criar app/relatorios/instagram/components/ClientReportCard.tsx"
Task: "Criar app/relatorios/instagram/components/ClientReportCardSkeleton.tsx"
Task: "Criar app/relatorios/instagram/components/InstagramReportsPagination.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Fase 1: Setup
2. Completar Fase 2: Foundational (CRÍTICO — inclui a ingestão HTTP, necessária para haver dados reais)
3. Completar Fase 3: User Story 1
4. **PARAR e VALIDAR**: testar User Story 1 de forma independente (login → lista de clientes → skeleton/vazio/erro → clique navega)
5. Deploy/demo se pronto

### Incremental Delivery

1. Setup + Foundational → fundação pronta (schema, RLS, ingestão, sidebar)
2. Adicionar User Story 1 → testar de forma independente → Deploy/Demo (MVP!)
3. Adicionar User Story 2 → testar de forma independente → Deploy/Demo
4. Adicionar User Story 3 → testar de forma independente → Deploy/Demo
5. Cada story adiciona valor sem quebrar as anteriores

### Parallel Team Strategy

Com múltiplos desenvolvedores:

1. Equipe completa Setup + Foundational em conjunto
2. Após o Foundational:
   - Dev A: User Story 1 (lista de clientes)
   - Dev B: User Story 2 (shell da página do cliente + semanais) — priorizado por ser bloqueio de US3
   - Dev C: aguarda T033/T038 de US2, depois assume User Story 3 (mensais)
3. Stories completam e se integram de forma independente

---

## Notes

- [P] = arquivos diferentes, sem dependências entre si
- [Story] mapeia a tarefa à user story correspondente para rastreabilidade
- Verificar que os testes falham antes de implementar (Constitution IV)
- Fazer commit após cada tarefa ou grupo lógico de tarefas
- Parar em cada checkpoint para validar a story de forma independente
- Nenhuma lógica de negócio própria sobre postagens/métricas deve ser introduzida no CRM em nenhuma tarefa (FR-027) — toda tarefa de serviço/página apenas persiste e exibe fielmente o que a ingestão recebeu
