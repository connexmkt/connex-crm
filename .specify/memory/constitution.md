<!--
SYNC IMPACT REPORT
==================
Version change: (template) → 1.0.0
Bump type: MAJOR — initial ratification; all principles are new.

Added principles (12 new):
  I.   Layered Architecture
  II.  Strict TypeScript
  III. Zod Validation
  IV.  Comprehensive Testing
  V.   UX Consistency
  VI.  Performance Optimization
  VII. Data Integrity
  VIII.Auditability
  IX.  Observability
  X.   Supabase RLS Security
  XI.  Maintainability
  XII. Scalable Next.js App Router Standards

Added sections:
  - Tech Stack & Constraints
  - Development Workflow & Quality Gates
  - Governance

Templates updated:
  ✅ .specify/memory/constitution.md (this file)
  ✅ .specify/templates/plan-template.md — Constitution Check gates refreshed
  ✅ .specify/templates/spec-template.md — security, auditoria e observabilidade adicionadas
  ✅ .specify/templates/tasks-template.md — tipos de tarefa alinhados à constituição

Deferred items: none.
-->

# Connex CRM Constitution

## Core Principles

### I. Layered Architecture

A aplicação DEVE seguir separação estrita de camadas:
**UI → Hooks/Actions → Services → Repositories → Supabase**.

- Componentes React JAMAIS acessam Supabase diretamente; toda leitura/escrita
  passa por um `repository` ou `service`.
- Lógica de negócio reside exclusivamente em `lib/services/`; lógica de acesso
  a dados em `lib/repositories/`.
- Route Handlers em `app/api/**/route.ts` DEVEM delegar a services — nenhuma
  query SQL embutida no handler.
- Hooks de cliente (`hooks/`) APENAS orquestram chamadas a API Routes ou
  Server Actions e gerenciam estado local; não contêm regras de negócio.

**Rationale**: Inversão de dependência viabiliza testes unitários de services sem
banco, facilita substituição de providers e torna o acoplamento explícito.

### II. Strict TypeScript

Todo código DEVE compilar sem erros com `strict: true` no `tsconfig.json`.

- `any` é PROIBIDO sem anotação `// eslint-disable-next-line` acompanhada de
  justificativa explícita no comentário.
- Tipos gerados pelo Supabase CLI (`types/supabase.ts`) são a fonte de verdade
  para todos os tipos de banco de dados; não duplicar manualmente.
- `unknown` é preferido a `any` em boundaries de I/O externos.
- Enums com `switch` DEVEM ter `default: never` para exaustividade em tempo de
  compilação.
- Exports de função DEVEM ter tipos de retorno explícitos em `lib/` e `app/api/`.

**Rationale**: TypeScript estrito elimina categorias inteiras de bugs em runtime,
especialmente críticas em um CRM onde erros de tipo podem corromper dados de clientes.

### III. Zod Validation

Toda entrada externa DEVE ser validada com Zod antes de qualquer processamento.

- Route Handlers DEVEM validar `request.json()` contra um schema Zod antes de
  passar ao service; erros retornam `400` com `{ error, issues }`.
- Schemas Zod DEVEM ser co-localizados em `schemas/` próximos ao domínio
  (ex.: `app/clientes/schemas/cliente.schema.ts`).
- Schemas compartilhados entre client e server DEVEM viver em `lib/schemas/`.
- Forms usam `react-hook-form` + `@hookform/resolvers/zod`; o mesmo schema Zod
  valida tanto client-side quanto server-side (single source of truth).
- Respostas de API TAMBÉM devem ser tipadas via Zod quando consumidas por
  código externo ou parceiros.

**Rationale**: Validação dupla (client + server) garante integridade mesmo quando
a UI é contornada; Zod produz mensagens de erro tipadas que facilitam feedback ao usuário.

### IV. Comprehensive Testing

Testes DEVEM cobrir comportamentos observáveis, não implementações internas.

- **Unit tests**: services e repositories com mocks de Supabase client; cobertura
  mínima de 80% para `lib/services/` e `lib/repositories/`.
- **Integration tests**: Route Handlers testados contra banco de dados de teste
  Supabase local (via `supabase start`).
- **E2E tests** (quando solicitados): fluxos críticos como autenticação, criação de
  cliente e movimentação no pipeline.
- TDD é RECOMENDADO (não obrigatório): testes escritos antes da implementação
  em features P1.
- Nenhum PR que remova cobertura de testes existente pode ser aprovado sem
  justificativa documentada.

**Rationale**: CRM gerencia dados sensíveis de clientes; regressões em fluxos de
pipeline ou faturamento têm impacto direto no negócio.

### V. UX Consistency

A interface DEVE ser coesa, previsível e acessível em todas as seções.

- Componentes de UI DEVEM vir de `components/ui/` (shadcn/ui); novos primitivos
  seguem o mesmo padrão antes de criar componentes ad-hoc.
- Design tokens do `globals.css` (cores, radius, espaçamentos) são obrigatórios;
  valores hardcoded de cor são PROIBIDOS no JSX.
- Feedback de estado (loading, erro, sucesso) DEVE usar `sonner` para toasts e
  estados de skeleton para carregamentos assíncronos.
- Formulários DEVEM desabilitar o botão de submit durante envio e exibir erros
  inline por campo via `react-hook-form`.
- Animações de entrada na viewport usam `framer-motion` com `{ once: true }`.

**Rationale**: Consistência reduz carga cognitiva dos usuários do CRM e acelera
onboarding de novos colaboradores da Connex.

### VI. Performance Optimization

A aplicação DEVE priorizar percepção de velocidade e eficiência de dados.

- Server Components são o padrão; `"use client"` é adicionado apenas quando há
  interatividade real (event handlers, state, browser APIs).
- Queries ao Supabase DEVEM selecionar apenas colunas necessárias (nunca `*`
  em produção) e usar `.limit()` em listagens.
- Imagens usam `next/image` com `width`/`height` explícitos ou `fill` + `sizes`.
- Route Handlers de leitura PODEM usar `revalidate` ou `cache` quando os dados
  são semi-estáticos (ex.: listas de configuração).
- Bundle splitting é garantido pelo App Router; componentes pesados (gráficos
  Recharts, DnD Kit) DEVEM ser importados com `next/dynamic`.

**Rationale**: Um CRM lento reduz produtividade dos agentes; Core Web Vitals
afetam diretamente a adoção interna da ferramenta.

### VII. Data Integrity

Mutações de dados DEVEM ser atômicas e consistentes.

- Operações que envolvem múltiplas tabelas DEVEM usar transações Supabase
  (via RPC ou `supabase.rpc()` com função PL/pgSQL).
- Soft delete é o padrão para entidades críticas (clientes, deals, atividades);
  colunas `deleted_at TIMESTAMPTZ` são preferidas a DELETE físico.
- Migrações de banco DEVEM ser versionadas em `supabase/migrations/` e NUNCA
  editadas retroativamente após aplicação em produção.
- Constraints de banco (FK, UNIQUE, NOT NULL) são a última linha de defesa e
  DEVEM refletir as regras de negócio; não confiar apenas em validação na aplicação.
- Campos de auditoria `created_at` e `updated_at` (com trigger `moddatetime`)
  são OBRIGATÓRIOS em todas as tabelas de domínio.

**Rationale**: Dados de clientes e pipeline são ativos críticos do negócio; perda
ou corrupção têm consequências legais e comerciais diretas.

### VIII. Auditability

Toda mutação significativa DEVE ser rastreável para diagnóstico e conformidade.

- Criação, atualização e exclusão de entidades críticas (clientes, deals,
  atividades, usuários) DEVEM gerar registros em tabela `audit_log` com
  `user_id`, `action`, `entity_type`, `entity_id`, `old_value`, `new_value`,
  `timestamp`.
- A tabela `audit_log` é append-only; nenhum registro pode ser excluído ou
  atualizado via aplicação.
- RLS na tabela `audit_log` deve permitir apenas INSERT para usuários autenticados
  e SELECT restrito a admins.
- Server Actions e Route Handlers que mutam dados DEVEM registrar o audit event
  antes de retornar resposta ao cliente.

**Rationale**: Auditoria permite reconstruir o histórico de um cliente/deal em
disputas comerciais e facilita debugging de comportamentos inesperados.

### IX. Observability

Erros e comportamentos inesperados DEVEM ser visíveis sem acesso direto ao servidor.

- `@vercel/analytics` está configurado no layout raiz para métricas de uso.
- Erros não tratados em Route Handlers DEVEM ser capturados e logados com
  contexto suficiente (user_id, endpoint, payload sanitizado).
- `console.error` é reservado para erros genuínos; `console.log` de debug DEVE
  ser removido antes do merge.
- Em produção, um provider de error tracking (ex.: Sentry) DEVE ser configurado
  quando o volume de usuários tornar o monitoramento manual inviável.
- Métricas de negócio chave (conversão de pipeline, tempo médio em stage) DEVEM
  ser consultáveis via queries no Supabase sem instrumentação adicional.

**Rationale**: Visibilidade de erros em produção é essencial para um CRM com
múltiplos usuários simultâneos; problemas silenciosos podem corromper dados sem
alerta imediato.

### X. Supabase RLS Security

Row Level Security DEVE ser habilitado e configurado em todas as tabelas de domínio.

- Nenhuma tabela de dados sensíveis pode ter RLS desabilitado em produção.
- Políticas RLS são escritas pelo princípio do menor privilégio: acesso negado por
  padrão, concedido explicitamente.
- Usuários acessam apenas dados de sua organização (`org_id`); políticas DEVEM
  filtrar por `auth.uid()` ou `auth.jwt() ->> 'org_id'`.
- Service Role Key JAMAIS é exposta ao cliente; usada apenas em Server Actions,
  Route Handlers ou Edge Functions com contexto de servidor.
- Senhas, tokens e secrets NUNCA são commitados; variáveis de ambiente seguem o
  padrão `NEXT_PUBLIC_` (público) vs sem prefixo (servidor).
- Permissões de banco são revisadas a cada nova tabela ou política via
  `supabase db diff` antes do deploy.

**Rationale**: RLS é a garantia de isolamento multi-tenant no Supabase; sem ela,
um bug de código pode expor dados de todos os clientes da Connex.

### XI. Maintainability

O código DEVE ser legível, previsível e fácil de modificar por qualquer membro da equipe.

- Arquivos com mais de 300 linhas DEVEM ser decompostos em módulos menores,
  salvo justificativa documentada.
- Named exports são obrigatórios; default exports são permitidos apenas em
  Page components (`app/**/page.tsx`) e Layout components.
- Comentários descrevem **por quê**, não **o quê**; comentários que narram o
  código óbvio são removidos.
- Constantes compartilhadas vivem em `lib/constants/`; valores mágicos no código
  são PROIBIDOS.
- Dependências novas requerem aprovação explícita antes da instalação; preferir
  soluções nativas quando viável.

**Rationale**: O CRM crescerá em features ao longo do tempo; manutenibilidade
garante que a velocidade de desenvolvimento não degrade com o tamanho da base de código.

### XII. Scalable Next.js App Router Standards

A estrutura do App Router DEVE ser organizada para suportar crescimento sem
reorganização periódica.

- Rotas de página vivem em `app/[módulo]/page.tsx`; lógica co-localizada em
  `app/[módulo]/` (hooks, schemas, constants, components do módulo).
- Componentes compartilhados entre módulos vivem em `components/`; específicos
  de módulo vivem junto ao módulo.
- Route Groups `(layout)` agrupam rotas com layout compartilhado sem afetar URL.
- Middleware (`middleware.ts`) trata apenas autenticação/redirecionamento; sem
  lógica de negócio.
- Variáveis de ambiente são validadas em `lib/env.ts` com Zod na inicialização
  do servidor; a aplicação DEVE falhar fast se variável crítica estiver ausente.
- Server Actions (`"use server"`) são preferidos a Route Handlers para mutações
  iniciadas pelo cliente quando não há necessidade de endpoint HTTP público.

**Rationale**: Estrutura previsível reduz onboarding time e evita conflitos de
merge em times maiores; o App Router de Next.js favorece essa organização nativamente.

## Tech Stack & Constraints

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 16.x |
| Linguagem | TypeScript (strict) | 5.7.x |
| Banco de Dados | Supabase (PostgreSQL) | — |
| Autenticação | Supabase Auth + SSR | — |
| Estilização | Tailwind CSS v4 | 4.x |
| Componentes UI | shadcn/ui (Radix UI) | — |
| Formulários | React Hook Form + Zod | — |
| Drag & Drop | dnd-kit | — |
| Gráficos | Recharts | — |
| Animações | Framer Motion | 12.x |
| Notificações | Sonner | — |
| Analytics | Vercel Analytics | — |
| Gerenciador de pacotes | pnpm | 11.x |

**Constraints**:
- Node.js LTS; sem runtime alternativo (Deno, Bun) sem aprovação.
- Deploy exclusivo na Vercel; sem Docker em produção.
- Banco de dados exclusivo no Supabase; sem outros ORMs ou clientes SQL diretos.
- Sem dependências de UI adicionais além das já listadas sem avaliação prévia.

## Development Workflow & Quality Gates

### Pull Request Requirements

Toda PR DEVE:
1. Passar em `pnpm lint` sem erros.
2. Compilar sem erros TypeScript (`tsc --noEmit`).
3. Ter testes cobrindo o caminho feliz e ao menos um caminho de erro para features P1.
4. Incluir item de Complexity Tracking se violar algum princípio da constituição.
5. Não reduzir cobertura de testes existente sem justificativa documentada.

### Constitution Check (gates obrigatórios no plan.md)

Antes de iniciar implementação, verificar:
- [ ] Layered Architecture: nenhuma query Supabase fora de `repositories/`
- [ ] Strict TypeScript: sem `any` não justificado
- [ ] Zod Validation: schemas definidos para todas as entradas externas
- [ ] RLS Security: políticas RLS planejadas para novas tabelas
- [ ] Data Integrity: transações planejadas para operações multi-tabela
- [ ] Auditability: eventos de audit_log mapeados para mutações críticas
- [ ] Performance: Server Components como padrão; lazy loading para heavy components
- [ ] Maintainability: arquivos < 300 linhas; named exports; sem valores mágicos

### Branch Strategy

- `main` → produção (Vercel deploy automático)
- `feature/[###-nome]` → features individuais
- Merge via PR com ao menos uma revisão

## Governance

Esta constituição é o documento de mais alta autoridade do Connex CRM.
Ela supera decisões locais, convenções implícitas e preferências individuais.

**Emendas**: Qualquer alteração requer:
1. PR dedicada à constituição com descrição do motivo.
2. Bump de versão semântico (`MAJOR`/`MINOR`/`PATCH` conforme impacto).
3. Atualização de todos os templates dependentes na mesma PR.
4. Aprovação de ao menos um maintainer do projeto.

**Versioning Policy**:
- `MAJOR`: remoção ou redefinição incompatível de princípio existente.
- `MINOR`: novo princípio, seção ou expansão material de guidance.
- `PATCH`: clarificações, correções de redação, ajustes não-semânticos.

**Compliance Review**: A cada sprint de planejamento, verificar se PRs recentes
violaram princípios sem registro no Complexity Tracking. Violações recorrentes
indicam necessidade de refinamento da constituição.

**Referência de runtime**: Para guidance de desenvolvimento em curso, consulte
`.cursor/rules/` e os arquivos `front-agent.md` / `api-agent.md` em `.specify/`.

**Version**: 1.0.0 | **Ratified**: 2026-06-18 | **Last Amended**: 2026-06-18
