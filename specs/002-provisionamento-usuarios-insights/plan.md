# Implementation Plan: Provisionamento de Usuários do Connex Insights via CRM

**Branch**: `002-provisionamento-usuarios-insights` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-provisionamento-usuarios-insights/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Criar, no `connex-crm`, um hub "Aplicações" (`/aplicacoes`) restrito a admins, com uma tela dedicada ao Connex Insights que exibe indicadores (usuários/tenants), lista usuários existentes e permite provisionar um novo acesso (nome, e-mail, login, tenant). A criação é transacional/idempotente e escreve diretamente no Supabase do Connex Insights (Service Role, sem nova API HTTP naquele repositório) via uma sequência de duas etapas com compensação: `auth.admin.createUser` seguido de `INSERT` transacional em `profiles`. Uma nova tabela de propriedade do CRM (`insights_user_provisioning_requests`), migrada via Prisma — introduzido por esta feature — garante idempotência e auditoria. A senha temporária é exibida uma única vez. O login do usuário criado usa um identificador (`login`) distinto do e-mail, o que depende de uma alteração de schema no `connex-insights` (coluna `login` em `profiles`) tratada como dependência bloqueante externa, não implementada por este plano.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict mode)

**Primary Dependencies**: Next.js 16 (App Router, Route Handlers), React 19, `@supabase/supabase-js` + `@supabase/ssr` (sessão do CRM e cliente Service Role do Connex Insights), React Hook Form + Zod, shadcn/ui (Radix UI), Tailwind CSS v4, Sonner (toasts/modais de feedback), **Prisma (`@prisma/client` + `prisma`, novo nesta feature, escopo restrito — ver Complexity Tracking)**.

**Storage**:
- Nova tabela `insights_user_provisioning_requests` no Supabase do próprio `connex-crm` (`project_ref=fkwlzsnkdekcptaatoli`), migrada via Prisma Migrate.
- Leitura/escrita de `tenants`, `profiles` e `auth.users` no Supabase do `connex-insights` (`project_ref=dynmchiutefdpucwqifu`) via `@supabase/supabase-js` com Service Role Key dedicada — sem migrations do CRM sobre esse banco (ver `research.md` D1).

**Testing**: Vitest (unit + integration), introduzido nesta feature para o `connex-crm` (mesma ferramenta já usada no `connex-insights`). E2E (Playwright) fora de escopo — ver `research.md` D6.

**Target Platform**: Web (Vercel), deploy automático de `main`.

**Project Type**: Web application (CRM) — Next.js App Router full-stack, com integração cross-repo (cliente administrativo de outro produto Connex).

**Performance Goals**: LCP < 2.5s na tela `/aplicacoes/connex-insights`; criação de usuário concluída (POST) em < 3s p95 mesmo com a chamada externa ao Auth Admin API do Insights.

**Constraints**: RLS obrigatório na nova tabela; sem `any` TypeScript; arquivos < 300 linhas; Service Role Key do Insights nunca exposta ao cliente; senha temporária nunca persistida em texto plano; nenhuma migration do CRM sobre o schema do Insights.

**Scale/Scope**: Uso administrativo interno, baixo volume (poucas dezenas de criações/dia, poucos admins simultâneos) — sem necessidade de fila/processamento assíncrono.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> Reference: `.specify/memory/constitution.md` v1.0.0

### Architecture & Code Quality
- [x] **I. Layered Architecture** — Route Handlers em `app/api/aplicacoes/connex-insights/**` delegam a `lib/services/connex-insights-provisioning.service.ts`; acesso a dados via `lib/repositories/insights-provisioning.repository.ts` (Prisma, tabela própria) e `lib/repositories/connex-insights-remote.repository.ts` (Supabase Admin client do Insights). Nenhuma query embutida nos handlers.
- [x] **II. Strict TypeScript** — Tipos de retorno explícitos em services/repositories; enum `ProvisioningStatus` com `switch` exaustivo (`default: never`) ao mapear status para respostas HTTP.
- [x] **III. Zod Validation** — Schema único (`app/aplicacoes/connex-insights/schemas/criar-usuario.schema.ts`) compartilhado entre formulário (react-hook-form) e Route Handler.
- [x] **XI. Maintainability** — Arquivos planejados < 300 linhas (repository de integração remota separado do repository Prisma local); named exports.
- [x] **XII. Next.js App Router** — Páginas como Server Components buscando dados iniciais; `"use client"` restrito ao formulário/modais/tabela interativa; `runtime = 'nodejs'` explícito nos Route Handlers desta feature (uso de `crypto` e client administrativo).

### Data & Security
- [x] **VII. Data Integrity** — `INSERT` em `profiles` (Insights) dentro de transação Postgres; compensação (`deleteUser`) documentada em `research.md` D2 para o caso não coberto por transação SQL (chamada Auth Admin API externa); `created_at`/`updated_at` na nova tabela.
- [x] **VIII. Auditability** — `insights_user_provisioning_requests` é a trilha de auditoria primária (append-only); evento de sucesso também replicado em `audit_log` existente do CRM (`action = 'CREATE_CONNEX_INSIGHTS_USER'`).
- [x] **X. Supabase RLS** — RLS habilitado e políticas definidas para `insights_user_provisioning_requests` (ver `data-model.md`); Service Role Key do Insights usada exclusivamente em Route Handlers (contexto de servidor).

### UX & Performance
- [x] **V. UX Consistency** — Formulário com `react-hook-form` + Zod, erros inline, botão desabilitado durante submit, `sonner` para toasts, modal de sucesso/erro via `components/ui/dialog`.
- [x] **VI. Performance** — Consultas ao Insights com seleção explícita de colunas; paginação na listagem de usuários (`page`/`pageSize`).

### Testing & Observability
- [x] **IV. Comprehensive Testing** — Unit tests para services/repositories (mocks de Supabase Admin client e Prisma Client); integration tests para os 4 Route Handlers cobrindo caminho feliz + duplicidade + falha externa.
- [x] **IX. Observability** — Logs estruturados em cada falha (sem senha); `console.log` de debug proibido no código final.

**Resultado do gate**: Aprovado, com uma exceção registrada em Complexity Tracking (introdução de Prisma).

## Project Structure

### Documentation (this feature)

```text
specs/002-provisionamento-usuarios-insights/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── connex-insights-provisioning-api.yaml
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root — connex-crm)

```text
prisma/
├── schema.prisma                          # NOVO — apenas InsightsUserProvisioningRequest
└── migrations/
    └── <timestamp>_add_insights_user_provisioning_requests/

app/
├── aplicacoes/
│   ├── page.tsx                           # Hub — lista de aplicações
│   ├── constants/
│   │   └── aplicacoes.ts                  # Catálogo estático (Connex Insights + placeholders)
│   └── connex-insights/
│       ├── page.tsx                       # Painel: indicadores + tabela + botão de criação
│       ├── components/
│       │   ├── DashboardStats.tsx
│       │   ├── UsersTable.tsx
│       │   ├── CreateUserDialog.tsx
│       │   └── CreateUserSuccessModal.tsx
│       ├── hooks/
│       │   └── useConnexInsightsUsers.ts
│       └── schemas/
│           └── criar-usuario.schema.ts
└── api/
    └── aplicacoes/
        └── connex-insights/
            ├── dashboard/route.ts         # GET
            ├── tenants/route.ts           # GET
            └── usuarios/
                └── route.ts               # GET (lista) + POST (criação)

lib/
├── services/
│   └── connex-insights-provisioning.service.ts
├── repositories/
│   ├── insights-provisioning.repository.ts        # Prisma — tabela local do CRM
│   └── connex-insights-remote.repository.ts       # supabase-js — Insights (Service Role)
├── generated/prisma/                       # Prisma Client gerado (gitignored)
└── constants/
    └── aplicacoes.ts

middleware.ts / lib/middleware.ts           # Extensão: exigir role Admin em /aplicacoes/**
```

**Structure Decision**: Segue a convenção já existente do CRM (`app/[módulo]/` co-localizado + `lib/services|repositories/`), com a única adição estrutural sendo `prisma/` na raiz — introduzido exclusivamente para a tabela `insights_user_provisioning_requests` (ver Complexity Tracking). Os dois repositories de acesso a dados ficam deliberadamente separados (`insights-provisioning.repository.ts` via Prisma vs. `connex-insights-remote.repository.ts` via `supabase-js`) para deixar explícito, no próprio código, qual banco cada um acessa.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Introdução do Prisma no `connex-crm` (stack atual usa exclusivamente `supabase-js` + repository pattern, sem ORM — ver Constitution "Tech Stack & Constraints") | O usuário exigiu explicitamente "Prisma ORM + Prisma Migrations" com validação de schema via Supabase MCP para a nova entidade de auditoria/idempotência (`insights_user_provisioning_requests`) | Manter 100% `supabase-js` (SQL manual em `supabase/migrations/`, como as demais tabelas do CRM) atenderia à consistência do stack atual, mas não ao requisito explícito do usuário nesta rodada de planejamento; optou-se por introduzir Prisma com escopo **estritamente limitado** a essa única tabela nova, evitando estender seu uso às tabelas já existentes do CRM |
| Duas fontes de acesso a dados para a mesma feature (Prisma local + `supabase-js` remoto) | O schema `tenants`/`profiles` já é migrado e possuído pelo `connex-insights`; uma segunda árvore de migrations Prisma no CRM apontando para o mesmo Postgres causaria drift de schema (ver `research.md` D1) | Usar Prisma também para ler/escrever no banco do Insights foi rejeitado por criar dois donos de migration para o mesmo schema — risco concreto de corrupção de metadados do Prisma (`_prisma_migrations`) em ambos os repositórios |
