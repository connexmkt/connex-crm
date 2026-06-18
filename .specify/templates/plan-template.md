# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.7 (strict mode)

**Primary Dependencies**: Next.js 16 (App Router), React 19, Supabase JS v2, React Hook Form + Zod, shadcn/ui (Radix UI), Tailwind CSS v4, Framer Motion 12, Recharts, dnd-kit, Sonner

**Storage**: Supabase (PostgreSQL) com RLS habilitado; migrações em `supabase/migrations/`

**Testing**: [NEEDS CLARIFICATION: framework de testes ainda a definir — Jest/Vitest para unit, Playwright para E2E]

**Target Platform**: Web (Vercel), deploy automático de `main`

**Project Type**: Web application (CRM) — Next.js App Router full-stack

**Performance Goals**: LCP < 2.5s; FID < 100ms; CLS < 0.1; queries Supabase < 200ms p95

**Constraints**: RLS obrigatório em todas as tabelas; sem `any` TypeScript; arquivos < 300 linhas; sem queries `SELECT *` em produção

**Scale/Scope**: [NEEDS CLARIFICATION: número de usuários simultâneos e volume de registros esperados]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

> Reference: `.specify/memory/constitution.md` v1.0.0

### Architecture & Code Quality
- [ ] **I. Layered Architecture** — Nenhuma query Supabase fora de `lib/repositories/`; Route Handlers apenas delegam a services.
- [ ] **II. Strict TypeScript** — Sem `any` não justificado; tipos retorno explícitos em `lib/` e `app/api/`; `default: never` em switch de enums.
- [ ] **III. Zod Validation** — Schemas definidos para toda entrada externa (request body, env vars, respostas de API).
- [ ] **XI. Maintainability** — Arquivos planejados < 300 linhas; named exports; constantes em `lib/constants/`; sem valores mágicos.
- [ ] **XII. Next.js App Router** — Server Components como padrão; `"use client"` apenas onde há interatividade real; heavy components com `next/dynamic`.

### Data & Security
- [ ] **VII. Data Integrity** — Transações planejadas para operações multi-tabela; soft delete para entidades críticas; campos `created_at`/`updated_at` nas novas tabelas.
- [ ] **VIII. Auditability** — Eventos `audit_log` mapeados para cada mutação crítica (create/update/delete de clientes, deals, atividades).
- [ ] **X. Supabase RLS** — Políticas RLS definidas para novas tabelas; Service Role Key nunca exposta ao cliente.

### UX & Performance
- [ ] **V. UX Consistency** — Componentes de `components/ui/`; design tokens do `globals.css`; feedback de estado (loading/erro/sucesso) com `sonner` e skeletons.
- [ ] **VI. Performance** — Queries Supabase com seleção explícita de colunas (sem `*`); lazy loading para Recharts e DnD Kit.

### Testing & Observability
- [ ] **IV. Comprehensive Testing** — Testes de unit para services/repositories; integration tests para Route Handlers P1; plano de cobertura documentado.
- [ ] **IX. Observability** — Erros em Route Handlers capturados e logados com contexto; sem `console.log` de debug em código de produção.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
