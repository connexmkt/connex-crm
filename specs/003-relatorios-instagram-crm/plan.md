# Implementation Plan: Visualização de Relatórios do Instagram no Connex CRM

**Branch**: `003-relatorios-instagram-crm` | **Date**: 2026-07-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-relatorios-instagram-crm/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Criar, no `connex-crm`, uma nova área "Relatórios de Instagram" (sidebar `Relatórios` → submenu novo) onde qualquer usuário autenticado (sem conceito de tenant dentro do CRM — clarificado no `spec.md`) visualiza, de forma paginada, os clientes com relatórios de Instagram disponíveis e navega hierarquicamente (ano → mês [→ semana]) até o conteúdo já processado desses relatórios. **Achado crítico da pesquisa**: o `connex-insights` ainda não gera relatórios semanais/mensais (só sync diário de métricas cruas); portanto este plano define e implementa **apenas o lado de recebimento** — três tabelas novas no Supabase do próprio CRM (`instagram_weekly_reports`, `instagram_monthly_reports`, `instagram_report_posts`) mais uma tabela de suporte (`instagram_report_views`, indicador de "novo"), populadas por dois endpoints de ingestão HTTP autenticados por segredo compartilhado (service-to-service, não sessão de usuário). A implementação do job que gera e envia esses relatórios a partir do `connex-insights` é uma **dependência externa bloqueante, fora de escopo** deste plano/repositório (análogo à coluna `login` tratada como dependência externa na feature 002). O username/avatar/status de Instagram exibidos nos cards continuam sendo lidos ao vivo do Supabase do Insights, reaproveitando o client Service Role já existente da feature 002. A navegação hierárquica é modelada como segmentos de rota do App Router (não uma SPA client-side), usando `loading.tsx`/`error.tsx` nativos para skeletons e isolamento de erro por nível/cliente.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)

**Primary Dependencies**: Next.js 16 (App Router, Route Handlers), React 19, `@supabase/supabase-js` + `@supabase/ssr`, Zod, shadcn/ui (Radix UI) + novo primitivo `components/ui/skeleton.tsx`, Tailwind CSS v4, `date-fns` (formatação de períodos/meses/semanas em pt-BR), Sonner (toasts de erro/retry client-side onde aplicável), Framer Motion (reaproveitado no submenu da sidebar). **Sem Prisma** nesta feature — mantido restrito à feature 002 (ver `research.md` § D1).

**Storage**:
- 4 tabelas novas + 1 view no Supabase do próprio `connex-crm` (`project_ref=fkwlzsnkdekcptaatoli`), migradas via SQL puro em `supabase/migrations/`: `instagram_weekly_reports`, `instagram_monthly_reports`, `instagram_report_posts`, `instagram_report_views`, view `instagram_client_report_summary`.
- Leitura remota, somente leitura, de `instagram_integrations` no Supabase do `connex-insights` (`project_ref=dynmchiutefdpucwqifu`) via `@supabase/supabase-js` com a Service Role Key já configurada na feature 002 — nenhuma escrita nesse projeto por esta feature.
- Novo client administrativo **do próprio Supabase do CRM** (`lib/server-admin.ts`, Service Role local), usado exclusivamente pelos 2 Route Handlers de ingestão para contornar RLS de forma controlada (ver `research.md` § D11).

**Testing**: Vitest (unit + integration), já configurado no `connex-crm` desde a feature 002. Unit tests para repositories/services novos (mocks de `SupabaseClient` local e do admin client remoto); integration tests para os 2 Route Handlers de ingestão (401/400/404/200/201). E2E (Playwright) fora de escopo — não configurado no CRM.

**Target Platform**: Web (Vercel), deploy automático de `main`.

**Project Type**: Web application (CRM) — Next.js App Router full-stack, com integração cross-repo em duas direções: leitura remota (Insights → CRM, já existente) e novo endpoint de ingestão (Insights → CRM, escrita).

**Performance Goals**: Skeleton visível em até 1s percebido em todos os 4 níveis de navegação (lista de clientes, meses, semanas, conteúdo do relatório); listagem de clientes sempre paginada (`page`/`limit`, nunca lista completa); leitura remota de `instagram_integrations` em lote (uma query por página, não uma por cliente).

**Constraints**: RLS obrigatório nas 4 tabelas novas; sem `any` TypeScript; arquivos < 300 linhas; sem conceito de tenant dentro do CRM (clarificado no `spec.md`); zero lógica de negócio do CRM sobre postagens/métricas (FR-027 — o CRM persiste e exibe fielmente o que o Insights envia); paginação sempre ativa (FR-026, sem exceção por volume).

**Scale/Scope**: Uso interno da equipe Connex; dezenas a poucas centenas de clientes cadastrados, cada um com até ~52 relatórios semanais/ano e 12 mensais/ano — volume que não exige fila assíncrona nem cache adicional além da paginação e das queries indexadas.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> Reference: `.specify/memory/constitution.md` v1.0.0

### Architecture & Code Quality
- [x] **I. Layered Architecture** — Route Handlers de ingestão (`app/api/integrations/connex-insights/relatorios-instagram/**`) delegam a `lib/services/instagram-reports-ingestion.service.ts`; páginas (Server Components) chamam `lib/services/instagram-reports.service.ts` diretamente (sem API HTTP interna, já que é o próprio CRM renderizando sua UI); acesso a dados via `lib/repositories/instagram-weekly-reports.repository.ts`, `instagram-monthly-reports.repository.ts`, `instagram-report-views.repository.ts` e extensão do `connex-insights-remote.repository.ts` existente.
- [x] **II. Strict TypeScript** — Tipos de retorno explícitos em services/repositories; `switch` exaustivo (`default: never`) para `PostRole`, `ReportStatus` e `InstagramIntegrationStatus` ao renderizar badges/seções condicionais.
- [x] **III. Zod Validation** — Schemas dedicados para os 2 payloads de ingestão (`weekly-report-ingest.schema.ts`, `monthly-report-ingest.schema.ts`) e para query params de paginação (`page`/`limit`, reaproveitando o padrão de `clientes`/`usuarios connex-insights`).
- [x] **XI. Maintainability** — Repositories separados por tabela (evita um único arquivo grande); named exports; nenhuma constante mágica (enums `PostRole`/`ReportStatus` centralizados em `lib/constants/instagram-reports.ts`).
- [x] **XII. Next.js App Router** — Server Components como padrão em todas as páginas novas; `"use client"` restrito a `InstagramReportTabs` (persistência de tab via `sessionStorage`) e à sidebar (já client hoje); `loading.tsx`/`error.tsx` por segmento de rota para skeleton/erro nativos (ver `research.md` § D8).

### Data & Security
- [x] **VII. Data Integrity** — `created_at`/`updated_at` (trigger `moddatetime`) em todas as tabelas novas; upsert idempotente por `source_report_id` (sem duplicar relatórios em reingestão); constraints `UNIQUE`/`CHECK` garantindo no máximo 1 postagem por papel/relatório. Sem fluxo de exclusão nesta spec — soft delete não se aplica.
- [x] **VIII. Auditability** — Eventos de ingestão **não** usam `audit_log` (schema exige `actor_profile_id` humano — ver `research.md` § D13); a trilha de auditoria é o próprio registro (`source_report_id` único + timestamps) somada a logs estruturados (OBS-001/OBS-002).
- [x] **X. Supabase RLS** — RLS habilitado nas 4 tabelas novas; políticas sem tenant (autenticação apenas); escrita das 3 tabelas de relatório restrita a Service Role local, nunca exposta ao cliente (ver `research.md` § D11); `instagram_report_views` gravável apenas pelo próprio usuário (`user_id = auth.uid()`).

### UX & Performance
- [x] **V. UX Consistency** — Novo primitivo `components/ui/skeleton.tsx` (shadcn) usado nos 4 níveis; cards clicáveis seguindo o estilo já usado (`rounded-xl border ... hover:border-primary/30`); `error.tsx` com mensagem amigável + botão "Tentar novamente" (`reset()`).
- [x] **VI. Performance** — Queries com seleção explícita de colunas (sem `select('*')` nas tabelas novas); paginação sempre ativa; leitura de `instagram_integrations` em lote por página (não N+1).

### Testing & Observability
- [x] **IV. Comprehensive Testing** — Unit tests para os 4 repositories + 2 services; integration tests para os 2 Route Handlers de ingestão cobrindo caminho feliz, segredo inválido, payload inválido e cliente inexistente.
- [x] **IX. Observability** — Falhas de leitura (remota ou local) e de ingestão logadas com contexto (usuário/cliente/tipo de relatório ou tentativa de ingestão), sem `console.log` de debug; tentativas de ingestão com segredo inválido logadas (OBS-002).

**Resultado do gate**: Aprovado, sem violações que exijam Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-relatorios-instagram-crm/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── instagram-reports-ingestion-api.yaml
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root — connex-crm)

```text
supabase/
└── migrations/
    └── <timestamp>_create_instagram_reports.sql   # NOVO — 4 tabelas + view + RLS

app/
├── relatorios/
│   ├── instagram/
│   │   ├── page.tsx                                # Lista paginada de clientes (Server Component)
│   │   ├── loading.tsx                             # Skeleton dos cards
│   │   ├── error.tsx                                # Erro + retry
│   │   ├── components/
│   │   │   ├── ClientReportCard.tsx
│   │   │   ├── ClientReportCardSkeleton.tsx
│   │   │   └── InstagramReportsPagination.tsx
│   │   └── [clienteId]/
│   │       ├── page.tsx                            # Header do cliente + tabs (Server Component)
│   │       ├── loading.tsx
│   │       ├── error.tsx
│   │       ├── components/
│   │       │   ├── ClienteInstagramHeader.tsx
│   │       │   ├── InstagramReportTabs.tsx          # "use client" — sessionStorage
│   │       │   └── MonthGrid.tsx
│   │       ├── semanais/
│   │       │   └── [ano]/[mes]/
│   │       │       ├── page.tsx                    # Semanas do mês
│   │       │       ├── loading.tsx
│   │       │       ├── error.tsx
│   │       │       └── [semana]/
│   │       │           ├── page.tsx                # Conteúdo do relatório semanal
│   │       │           ├── loading.tsx
│   │       │           └── error.tsx
│   │       └── mensais/
│   │           └── [ano]/[mes]/
│   │               ├── page.tsx                    # Conteúdo do relatório mensal
│   │               ├── loading.tsx
│   │               └── error.tsx
└── api/
    └── integrations/
        └── connex-insights/
            └── relatorios-instagram/
                ├── semanais/route.ts               # POST — ingestão (Insights → CRM)
                └── mensais/route.ts                 # POST — ingestão (Insights → CRM)

lib/
├── services/
│   ├── instagram-reports.service.ts                 # Leitura — orquestra repositories locais + remoto
│   └── instagram-reports-ingestion.service.ts        # Escrita — valida + upsert idempotente
├── repositories/
│   ├── instagram-weekly-reports.repository.ts
│   ├── instagram-monthly-reports.repository.ts
│   ├── instagram-report-views.repository.ts
│   └── connex-insights-remote.repository.ts          # ESTENDIDO — novo método listIntegrationsByTenantIds
├── constants/
│   └── instagram-reports.ts                          # PostRole, ReportStatus, IntegrationStatus (união TS)
├── schemas/
│   └── instagram-reports/
│       ├── weekly-report-ingest.schema.ts
│       └── monthly-report-ingest.schema.ts
└── server-admin.ts                                    # NOVO — Service Role client do próprio Supabase do CRM

components/
├── ui/
│   └── skeleton.tsx                                   # NOVO — primitivo shadcn
└── layout/
    └── sidebar.tsx                                     # ESTENDIDO — suporte a `children` (submenu)
```

**Structure Decision**: Segue a convenção já existente do CRM (`app/[módulo]/` co-localizado + `lib/services|repositories/`), com duas adições estruturais: (1) segmentação de rota profunda usando `loading.tsx`/`error.tsx` nativos do App Router para resolver skeleton/erro por nível sem reimplementar manualmente (diferente do padrão legado client-side de `/relatorios`); (2) `lib/server-admin.ts`, um Service Role client **do próprio Supabase do CRM**, introduzido apenas para os 2 Route Handlers de ingestão — espelha exatamente o padrão já aprovado em `lib/integrations/connex-insights/admin-client.ts` (feature 002), aplicado desta vez ao banco do próprio CRM em vez do banco remoto.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Nenhuma violação da Constitution identificada nesta feature — tabela vazia intencionalmente.
