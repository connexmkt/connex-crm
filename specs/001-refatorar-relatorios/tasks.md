# Tasks: Refatoração da Aba de Relatórios

**Input**: `specs/001-refatorar-relatorios/spec.md`

**Documentos disponíveis**: `spec.md` (user stories + requisitos), `constitution.md` (tech stack + princípios)

**Nota**: `plan.md` não existe ainda (gerado por `/speckit-plan`). Tasks baseadas na spec + análise do código existente em `app/relatorios/` e `app/api/relatorios/route.ts`.

**Stack confirmada**: Next.js 16 App Router · TypeScript strict · Supabase · Tailwind CSS v4 · shadcn/ui · Recharts · Sonner

**Estrutura atual** (arquivos que serão refatorados):
- `app/relatorios/page.tsx` — 5 abas: overview, sales, cs, financial, activity
- `app/relatorios/components/overview-tab.tsx`
- `app/relatorios/components/sales-tab.tsx`
- `app/relatorios/components/cs-tab.tsx`
- `app/relatorios/components/financial-tab.tsx`
- `app/relatorios/components/activity-tab.tsx`
- `app/relatorios/components/kpi-card.tsx`
- `app/api/relatorios/route.ts`

## Formato: `[ID] [P?] [Story] Descrição com caminho de arquivo`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência de tarefa incompleta)
- **[Story]**: A qual User Story a tarefa pertence (US1, US2, US3, US4)

---

## Phase 1: Setup — Preparação de estrutura de arquivos

**Objetivo**: Criar a nova estrutura de arquivos antes de qualquer implementação. Não quebra o código existente ainda.

- [x] T001 Criar arquivo vazio `app/relatorios/components/visao-geral-tab.tsx` com export nomeado placeholder (`export function VisaoGeralTab`)
- [x] T002 [P] Criar arquivo vazio `app/relatorios/components/pipeline-vendas-tab.tsx` com export nomeado placeholder (`export function PipelineVendasTab`)
- [x] T003 [P] Criar arquivo vazio `app/relatorios/components/clientes-financeiro-tab.tsx` com export nomeado placeholder (`export function ClientesFinanceiroTab`)

---

## Phase 2: Foundational — Reestruturação da API e tipos

**Objetivo**: Atualizar o contrato de dados (`app/api/relatorios/route.ts`) para a nova estrutura de 3 blocos. Esta fase DEVE ser concluída antes de qualquer implementação de aba.

**⚠️ CRÍTICO**: Toda implementação de tab depende dos novos tipos exportados aqui.

- [x] T004 Definir novos tipos de payload em `app/api/relatorios/route.ts`: renomear blocos para `visaoGeral`, `pipeline`, `clientes`; exportar `RelatoriosPayloadV2` mantendo os tipos antigos como referência temporária
- [x] T005 [P] Adicionar tipo `LostLeadDetail` (id, name, stageLost, reason, responsible) e campo `lostLeadsDetail: LostLeadDetail[]` ao tipo `PipelineData` em `app/api/relatorios/route.ts`
- [x] T006 [P] Adicionar tipo `RevenueVsChurnItem` (month, gained, churned) e campo `revenueVsChurn: RevenueVsChurnItem[]` ao tipo `ClientesData` em `app/api/relatorios/route.ts`
- [x] T007 Mover campo `staleItems` de `ActivityData` para `VisaoGeralData` nos tipos; mover campo `renewalsNext30` de `CsData` para `VisaoGeralData` nos tipos — em `app/api/relatorios/route.ts`
- [x] T008 Mover campo `salesLeaderboard` de `ActivityData` para `PipelineData` nos tipos — em `app/api/relatorios/route.ts`
- [x] T009 Implementar helper `buildRevenueVsChurn(clients, year): RevenueVsChurnItem[]` em `app/api/relatorios/route.ts` — MRR ganho = soma de contract_value de clientes com onboarding_date no mês; MRR perdido = soma de contract_value de clientes com status 'Inativo' cujo updated_at caiu no mês (aproximação com dados disponíveis; documentar limitação como comentário)
- [x] T010 Implementar helper `buildLostLeadsDetail(leads): LostLeadDetail[]` em `app/api/relatorios/route.ts` — filtra leads com stage 'perdido', mapeia id, company_name, stage_entered_at como stageLost, lost_reason, responsible.name
- [x] T011 Atualizar função `GET()` em `app/api/relatorios/route.ts` para montar e retornar `RelatoriosPayloadV2` com os 3 blocos (`visaoGeral`, `pipeline`, `clientes`), chamando todos os builders atualizados e os novos (T009, T010)
- [x] T012 Remover export `RelatoriosPayload` (antigo) de `app/api/relatorios/route.ts` e exportar apenas `RelatoriosPayloadV2`; corrigir importação em `app/relatorios/page.tsx`

**Checkpoint**: Rodar `pnpm build` — deve compilar sem erros TypeScript antes de prosseguir para as fases de UI.

---

## Phase 3: US4 — Remoção das abas obsoletas e nova navegação (Priority: P1)

**Objetivo**: Atualizar `page.tsx` para exibir exatamente 3 abas com os novos componentes placeholder. As abas antigas (financial, activity) são removidas da navegação. Sem implementação de conteúdo ainda.

**Independent Test**: Ao acessar `/relatorios`, apenas 3 abas aparecem na navegação. A aba "Visão Geral" é a padrão. As abas "Financeiro" e "Atividades" não existem.

- [x] T013 [US4] Atualizar `app/relatorios/page.tsx`: substituir os 5 `<TabsTrigger>` pelos 3 novos (`visao-geral`, `pipeline-vendas`, `clientes-financeiro`); atualizar importações para os 3 novos componentes; atualizar tipo de `payload` para `RelatoriosPayloadV2`
- [x] T014 [US4] Remover importações de `OverviewTab`, `SalesTab`, `CsTab`, `FinancialTab`, `ActivityTab` de `app/relatorios/page.tsx`
- [x] T015 [US4] Deletar `app/relatorios/components/financial-tab.tsx` (conteúdo migra para Clientes & Financeiro)
- [x] T016 [US4] Deletar `app/relatorios/components/activity-tab.tsx` (leaderboard migra para Pipeline, staleItems migra para Visão Geral, recentInteractions é descontinuada)
- [x] T017 [US4] Deletar `app/relatorios/components/cs-tab.tsx` (conteúdo migra para Clientes & Financeiro)
- [x] T018 [US4] Deletar `app/relatorios/components/overview-tab.tsx` (conteúdo migra para Visão Geral refatorada)
- [x] T019 [US4] Deletar `app/relatorios/components/sales-tab.tsx` (conteúdo migra para Pipeline & Vendas refatorada)

**Checkpoint**: Após T013–T019, a página deve renderizar 3 abas com conteúdo placeholder sem erros.

---

## Phase 4: US1 — Visão Geral executiva (Priority: P1) 🎯 MVP

**Objetivo**: Implementar a aba Visão Geral completa: 4 KPI cards, gráfico dual-axis MRR+Clientes, card de leads parados e card de renovações.

**Independent Test**: Acessar `/relatorios` (aba padrão) → todos os KPIs, gráfico e cards de alerta exibem dados corretos (ou estado vazio com mensagem descritiva).

### Implementação — Visão Geral

- [x] T020 [P] [US1] Implementar seção de 4 KPI cards no topo de `app/relatorios/components/visao-geral-tab.tsx` usando `KpiCard` existente (`app/relatorios/components/kpi-card.tsx`): MRR, Clientes Ativos, Leads no Pipeline, Taxa de Conversão — com variação vs. mês anterior
- [x] T021 [US1] Implementar gráfico de linha dupla MRR + Novos Clientes em `app/relatorios/components/visao-geral-tab.tsx` usando `<LineChart>` do Recharts com `yAxisId="left"` (MRR em reais) e `yAxisId="right"` (contagem de leads/clientes); importar com `next/dynamic` (Principle VI)
- [x] T022 [P] [US1] Implementar card "Leads Parados" em `app/relatorios/components/visao-geral-tab.tsx`: lista de leads do campo `visaoGeral.staleItems` com nome, responsável e `daysIdle` em badge de cor laranja/vermelho conforme gravidade; estado vazio "Nenhum lead parado"
- [x] T023 [P] [US1] Implementar card "Renovações em 30 dias" em `app/relatorios/components/visao-geral-tab.tsx`: lista de contratos do campo `visaoGeral.renewalsNext30` com nome do cliente, data formatada em pt-BR e valor em reais; estado vazio "Nenhuma renovação nos próximos 30 dias"
- [x] T024 [US1] Adicionar tratamento de erro isolado por seção em `app/relatorios/components/visao-geral-tab.tsx`: se `data` for `null` ou campo ausente, exibir mensagem de erro inline na seção sem afetar as outras (Principle OBS-001 / FR-019)

**Checkpoint**: Aba Visão Geral totalmente funcional. KPIs, gráfico e alertas renderizam com dados reais ou estado vazio correto.

---

## Phase 5: US2 — Pipeline & Vendas (Priority: P1)

**Objetivo**: Implementar a aba Pipeline & Vendas completa: volume por etapa (com valores), funil visual de conversão, canais de origem (leads vs. fechados), donut + tabela de motivos de perda, leaderboard.

**Independent Test**: Acessar aba "Pipeline & Vendas" → funil visual, canais, motivos de perda com tabela e leaderboard renderizam com dados reais ou estado vazio.

### Implementação — Pipeline & Vendas

- [x] T025 [P] [US2] Implementar 6 cards de volume por etapa em `app/relatorios/components/pipeline-vendas-tab.tsx`: exibir label da etapa, contagem de leads e valor total em reais (campo `pipeline.stageBreakdown`); estado vazio por etapa
- [x] T026 [US2] Implementar gráfico de funil visual em `app/relatorios/components/pipeline-vendas-tab.tsx` usando `<FunnelChart>` do Recharts (ou fallback com barras horizontais de largura decrescente se FunnelChart não estiver disponível na versão instalada): cada etapa proporcional ao volume, com taxa de conversão entre etapas exibida como texto entre barras (campo `pipeline.funnelConversions`); importar com `next/dynamic`
- [x] T027 [P] [US2] Implementar seção Canais de Origem em `app/relatorios/components/pipeline-vendas-tab.tsx`: gráfico de barras agrupadas (`<BarChart>` do Recharts) com duas barras por canal — "Captados" e "Fechados" — usando dados de `pipeline.sources`; importar com `next/dynamic`
- [x] T028 [P] [US2] Implementar seção Motivos de Perda em `app/relatorios/components/pipeline-vendas-tab.tsx`: donut `<PieChart>` do Recharts com `pipeline.lostReasons` + tabela abaixo listando `pipeline.lostLeadsDetail` com colunas: Nome, Etapa de Saída, Motivo, Responsável; estado vazio "Nenhum lead perdido com motivo registrado"
- [x] T029 [P] [US2] Implementar Leaderboard de Vendas em `app/relatorios/components/pipeline-vendas-tab.tsx`: lista ranqueada a partir de `pipeline.salesLeaderboard`, exibindo posição, avatar (ou iniciais), nome, negócios fechados e valor gerado formatado em reais; estado vazio "Nenhum negócio fechado no período"
- [x] T030 [US2] Adicionar tratamento de erro isolado por seção em `app/relatorios/components/pipeline-vendas-tab.tsx` (mesma lógica de T024)

**Checkpoint**: Aba Pipeline & Vendas totalmente funcional. Funil, canais, motivos + tabela e leaderboard renderizam corretamente.

---

## Phase 6: US3 — Clientes & Financeiro (Priority: P2)

**Objetivo**: Implementar a aba Clientes & Financeiro: 3 cards financeiros, gráfico receita vs. churn, health score com lista clicável, renovações 30+60 dias, cards "Em breve" para inadimplência e LTV.

**Independent Test**: Acessar aba "Clientes & Financeiro" → todos os cards financeiros, gráfico e health score renderizam; clicar em card de health score abre lista de clientes; inadimplência e LTV exibem "Em breve".

### Implementação — Clientes & Financeiro

- [x] T031 [P] [US3] Implementar 3 cards financeiros no topo de `app/relatorios/components/clientes-financeiro-tab.tsx` usando `KpiCard`: Ticket Médio, MRR, Contratos Ativos — dados de `clientes.financialCards`
- [x] T032 [US3] Implementar gráfico Receita vs. Churn em `app/relatorios/components/clientes-financeiro-tab.tsx`: `<LineChart>` do Recharts com duas linhas — "MRR Ganho" e "MRR Perdido" — usando `clientes.revenueVsChurn`; se dados insuficientes, exibir card "Em breve — requer histórico de contratos por mês"; importar com `next/dynamic`
- [x] T033 [P] [US3] Implementar 3 cards de Health Score em `app/relatorios/components/clientes-financeiro-tab.tsx`: Saudável (verde), Em Risco (amarelo), Inativo (vermelho) com contagens de `clientes.healthScore`; ao clicar em um card, exibir lista inline (ou Sheet do shadcn/ui) com os clientes daquela categoria a partir de `clientes.clientsByHealth`
- [x] T034 [US3] Adicionar campo `clientsByHealth: { healthy: ClientSummary[]; atRisk: ClientSummary[]; inactive: ClientSummary[] }` ao tipo `ClientesData` e ao builder `buildClientesData()` em `app/api/relatorios/route.ts` — necessário para o clique em T033
- [x] T035 [P] [US3] Implementar seção de Renovações em `app/relatorios/components/clientes-financeiro-tab.tsx`: dois grupos "Até 30 dias" e "31 a 60 dias" com lista de contratos (cliente, data, valor) de `clientes.renewalsNext30` e `clientes.renewalsNext60`; estado vazio por grupo
- [x] T036 [P] [US3] Implementar cards "Em breve" para Inadimplência e LTV em `app/relatorios/components/clientes-financeiro-tab.tsx`: exibir ícone de relógio, título ("Inadimplência" / "LTV"), critério descritivo ("Contratos com pagamento em atraso há mais de X dias" / "Requer histórico de cancelamentos") e badge "Em breve"
- [x] T037 [US3] Adicionar tratamento de erro isolado por seção em `app/relatorios/components/clientes-financeiro-tab.tsx` (mesma lógica de T024)

**Checkpoint**: Aba Clientes & Financeiro totalmente funcional. Health score clicável, gráfico ou "Em breve", renovações e placeholders renderizam corretamente.

---

## Phase 7: Polish & Cross-Cutting

**Objetivo**: Qualidade, consistência visual e estados de borda.

- [x] T038 [P] Verificar e corrigir todos os estados de loading nas 3 abas: skeleton adequado (`<Skeleton>` do shadcn/ui) durante carregamento inicial — garantir que nenhuma aba pisca com conteúdo vazio antes dos dados chegarem
- [x] T039 [P] Verificar que todos os gráficos Recharts estão importados com `next/dynamic` e `ssr: false` em `app/relatorios/components/` (Principle VI — lazy loading para heavy components)
- [x] T040 [P] Verificar que nenhum arquivo em `app/relatorios/components/` ultrapassa 300 linhas; se ultrapassar, extrair subcomponentes (ex.: `FunnelChart`, `LostLeadsTable`, `AlertCard`) em arquivos separados dentro de `app/relatorios/components/` (Principle XI)
- [x] T041 Extrair constante `STALE_THRESHOLD_DAYS = 7` para `lib/constants/relatorios.ts` — remover valor mágico `7` do route handler e do componente (Principle XI)
- [x] T042 [P] Revisar `app/api/relatorios/route.ts`: confirmar que queries Supabase selecionam apenas colunas necessárias (sem `*`), que erros são logados com contexto (`[GET /api/relatorios]`, user_id sanitizado) e que o arquivo não ultrapassa 300 linhas — se ultrapassar, extrair builders para `lib/services/relatorios.service.ts` e queries para `lib/repositories/relatorios.repository.ts` (Principles I, IX, XI)
- [x] T043 [P] Garantir que `RelatoriosPayloadV2` e todos os tipos exportados em `app/api/relatorios/route.ts` têm tipos de retorno explícitos nas funções `build*` (Principle II)
- [x] T044 Rodar `pnpm lint` e corrigir todos os erros de linting; rodar `pnpm build` e confirmar compilação TypeScript sem erros

---

## Dependências & Ordem de Execução

### Dependências entre fases

- **Phase 1** (T001–T003): Sem dependências — iniciar imediatamente
- **Phase 2** (T004–T012): Depende de Phase 1 — bloqueia todas as fases de UI
- **Phase 3/US4** (T013–T019): Depende de Phase 2 (novos tipos) — bloqueia fases 4, 5, 6
- **Phase 4/US1** (T020–T024): Depende de Phase 3
- **Phase 5/US2** (T025–T030): Depende de Phase 3 — pode rodar em paralelo com Phase 4
- **Phase 6/US3** (T031–T037): Depende de Phase 3 e T034 (novo campo API) — pode rodar em paralelo com Phases 4 e 5
- **Phase 7/Polish** (T038–T044): Depende de todas as fases anteriores

### Dependências dentro das fases

- **Phase 2**: T004 → T005, T006, T007, T008 (paralelos) → T009, T010 (paralelos) → T011 → T012
- **Phase 3**: T013 → T014 → T015, T016, T017, T018, T019 (paralelos)
- **Phase 6**: T034 deve ser completo antes de T033

### Oportunidades de paralelismo

```
Phase 1: T001 | T002 | T003  (todos em paralelo)

Phase 2: T004 → [T005 | T006 | T007 | T008] → [T009 | T010] → T011 → T012

Phase 3: T013 → T014 → [T015 | T016 | T017 | T018 | T019]

Após Phase 3:
  Phase 4: [T020 | T022 | T023] → T021 → T024
  Phase 5: [T025 | T027 | T028 | T029] → T026 → T030  (em paralelo com Phase 4)
  Phase 6: T034 → T033; [T031 | T035 | T036] → T032 → T037  (em paralelo com Phases 4 e 5)

Phase 7: [T038 | T039 | T040 | T041 | T042 | T043] → T044
```

---

## Estratégia de Implementação

### MVP (somente US4 + US1)

1. Completar Phase 1: Setup
2. Completar Phase 2: API reestruturada
3. Completar Phase 3: Nova navegação de 3 abas (abas antigas removidas)
4. Completar Phase 4: Aba Visão Geral funcional
5. **PARAR E VALIDAR**: acessar `/relatorios`, conferir 3 abas, KPIs corretos, alertas e gráfico funcionando
6. Demo/deploy se aprovado

### Entrega incremental

1. Setup + API → navegação nova com placeholders → **aba Visão Geral** → Demo MVP
2. → **aba Pipeline & Vendas** → Demo com 2 abas funcionais
3. → **aba Clientes & Financeiro** → Release completo
4. → Polish → Qualidade final

---

## Notas

- `[P]` = arquivo diferente, sem dependência de tarefa incompleta — seguro para paralelismo
- `[Story]` mapeia a tarefa para a User Story correspondente na spec
- Nenhuma migração de banco de dados necessária (feature é read-only)
- `financial-tab.tsx`, `activity-tab.tsx`, `cs-tab.tsx`, `overview-tab.tsx`, `sales-tab.tsx` serão deletados na Phase 3 — não editar esses arquivos antes da deleção
- O gráfico `revenueVsChurn` pode exibir "Em breve" se os dados não existirem — isso é aceitável conforme spec (Assumption 8)
- Commitar após cada fase completa para facilitar rollback se necessário
