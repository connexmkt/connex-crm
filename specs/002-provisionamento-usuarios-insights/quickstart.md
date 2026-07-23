# Quickstart: Provisionamento de Usuários do Connex Insights via CRM

**Feature**: `002-provisionamento-usuarios-insights`

> **Atualização (2026-07-22)**: a restrição por papel `Admin` mencionada nos
> pré-requisitos e no Cenário 1 abaixo foi removida — ver nota em `spec.md`.
> Qualquer usuário autenticado no CRM pode executar os cenários a seguir.

Guia de validação ponta a ponta após a implementação (`/speckit.tasks` → `/speckit.implement`). Não contém código de implementação — apenas pré-requisitos, comandos e critérios de sucesso observáveis.

## Pré-requisitos

1. **Dependência bloqueante externa**: a coluna `login` (TEXT, UNIQUE, NOT NULL) deve existir em `public.profiles` no projeto Supabase do Connex Insights (`dynmchiutefdpucwqifu`), e o login do Connex Insights deve aceitar `login` como identificador de autenticação. Confirmar via MCP:
   - Servidor MCP `supabase-insights` → `list_tables` no schema `public` → inspecionar `profiles.columns`.
   - Se a coluna não existir, esta feature não pode ser validada ponta a ponta (fluxo de login do usuário final falhará) — tratar como bloqueio, não como bug desta feature.
2. Variáveis de ambiente novas no `connex-crm` (`.env`, nunca versionadas):
   - `SUPABASE_INSIGHTS_URL`
   - `SUPABASE_INSIGHTS_SERVICE_ROLE_KEY`
   - `DATABASE_URL` (novo — Postgres do próprio CRM, para a tabela `insights_user_provisioning_requests` via Prisma)
3. Qualquer usuário de teste autenticado no CRM (não há mais restrição por `profiles.role`).
4. Ao menos dois tenants existentes no Connex Insights (ex.: "Zeh Motoca", "ICON Fitbrands").

## Setup

```powershell
pnpm install
pnpm prisma migrate dev --name add_insights_user_provisioning_requests
pnpm prisma generate
```

Validar o schema resultante com o MCP `supabase` (projeto do próprio CRM):
- `list_tables` → confirmar `insights_user_provisioning_requests` com as colunas de `data-model.md`.
- Confirmar RLS habilitado (`rowsecurity = true`) e as policies descritas em `data-model.md`.

## Cenário 1 — Hub de Aplicações e acesso restrito à autenticação

1. Sem sessão (deslogado) → acessar `/aplicacoes` → **esperado**: redirecionado para `/auth/login`.
2. Login com qualquer usuário do CRM (`Admin`, `Gestor` ou `Analista`) → a partir de qualquer página do CRM, contar os cliques até chegar à tela do Connex Insights (`/aplicacoes` → card "Connex Insights") → **esperado (SC-001)**: no máximo 2 cliques; card "Connex Insights" clicável, demais cards "Em breve".

## Cenário 2 — Painel do Connex Insights

1. Autenticado com qualquer usuário do CRM, abrir `/aplicacoes/connex-insights`.
2. **Esperado**: indicadores de "Usuários" e "Tenants" carregam com valores reais (comparar com contagem manual via MCP `supabase-insights`: `select count(*) from profiles;` e `select count(*) from tenants;`).

## Cenário 3 — Criação de usuário (caminho feliz)

1. Clicar em "Criar usuário" e iniciar cronômetro.
2. Preencher nome, e-mail único, login único, selecionar um tenant existente.
3. Confirmar e parar o cronômetro assim que a senha temporária for exibida.
4. **Esperado (SC-002)**: tempo decorrido do passo 1 ao 3 é inferior a 1 minuto (assumindo dados válidos em mãos).
5. **Esperado**:
   - Modal de sucesso exibe a senha temporária uma única vez.
   - Lista de usuários é atualizada com o novo registro (status `INACTIVE`).
   - Via MCP `supabase-insights`: `select id, login, status, tenant_id from profiles where login = '<login-de-teste>';` retorna exatamente 1 linha com `status = 'INACTIVE'`.
   - Via MCP `supabase` (CRM): `insights_user_provisioning_requests` tem 1 linha com `status = 'SUCCEEDED'` e `temporary_password_issued = true`, sem nenhuma coluna contendo a senha em texto plano.

## Cenário 4 — Duplicidade / idempotência

1. Repetir o Cenário 3 com o **mesmo e-mail ou login**.
2. **Esperado**: erro `409`, modal de erro amigável, nenhum novo registro em `profiles` (Insights) nem novo `auth.users`, formulário preserva os valores digitados para edição.
3. Duplo-clique no botão "Criar usuário" durante uma criação em andamento → **esperado**: botão desabilitado após o primeiro clique; apenas uma requisição é enviada.

## Cenário 5 — Falha de comunicação com o Connex Insights

1. Simular indisponibilidade (ex.: apontar temporariamente `SUPABASE_INSIGHTS_URL` para uma URL inválida em ambiente de teste).
2. **Esperado**: `502`, modal de erro amigável sem detalhes internos, nenhum registro parcial em `profiles`/`auth.users` do Insights, log estruturado no servidor do CRM com contexto (sem incluir a senha).

## Critérios de sucesso (ligados ao `spec.md`)

- SC-001 a SC-006 do `spec.md` observáveis manualmente nos cenários acima.
- Nenhum cenário deixa estado inconsistente (usuário Auth sem perfil, ou perfil sem usuário Auth) — validar com:
  ```sql
  -- via MCP supabase-insights
  select au.id from auth.users au
  left join public.profiles p on p.id = au.id
  where p.id is null;
  ```
  Deve retornar 0 linhas relacionadas a esta feature após os cenários de teste.
