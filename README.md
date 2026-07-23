# Connex CRM

## Getting Started

Instale as dependências com pnpm:

```bash
pnpm install
```

Em seguida, rode o servidor de desenvolvimento:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha os valores reais:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase do próprio `connex-crm`.
- `DATABASE_URL` / `DIRECT_URL`: Postgres do próprio `connex-crm`, usado exclusivamente pelo Prisma
  (tabela `insights_user_provisioning_requests`).
- `SUPABASE_INSIGHTS_URL` / `SUPABASE_INSIGHTS_SERVICE_ROLE_KEY`: acesso administrativo (server-only) ao
  Supabase da Connex Insights, usado pelo hub `/aplicacoes/connex-insights`.

## Banco de dados (Prisma)

```bash
pnpm db:generate        # gera o Prisma Client em lib/generated/prisma
pnpm prisma migrate deploy   # aplica as migrations pendentes (produção/CI)
pnpm db:migrate          # gera + aplica uma nova migration (desenvolvimento)
```

## Testes

```bash
pnpm test        # roda a suíte Vitest uma vez
pnpm test:watch  # modo watch
```

## API Endpoints

Todas as rotas (exceto `/api/auth/login` e `/api/auth/register`) exigem usuário autenticado via Supabase Auth e retornam `401 Unauthorized` caso contrário. Respostas seguem o formato `{ data: ... }`; erros de validação retornam `400 Bad Request` com o detalhamento do Zod.

### Auth

- **POST `/api/auth/login`** — Body: `email` (string), `password` (string, mín. 6). Retorna `{ user: { id, email }, session: { expires_at } }`. `401` em credenciais inválidas.
- **POST `/api/auth/logout`** — Encerra a sessão do usuário autenticado e limpa os cookies. Retorna `{ message }`.
- **POST `/api/auth/register`** — Apenas usuários com role `Admin`. Body: `email`, `password` (mín. 8), `name` (2–100), `role` (`Admin` | `Gestor` | `Analista`). Cria o usuário no Supabase Auth e o perfil em `profiles`. `403` se role insuficiente, `409` se e-mail já cadastrado.
- **GET `/api/auth/me`** — Retorna o perfil completo do usuário autenticado (Supabase Auth + tabela `profiles`): `{ id, email, name, role, avatar }`. `404` se o perfil não existir.

### Clientes

- **GET `/api/clientes`** — Query: `page?`, `limit?` (máx. 100), `status?` (`Ativo`|`Lead`|`Inativo`|`Em risco`), `search?` (busca por nome). Retorna `{ items: Client[], total, page, limit }`.
- **POST `/api/clientes`** — Body: `name`, `segment`, `status`, `contractValue`, `responsibleId?` (default: usuário autenticado), `contact.{email,phone,website?}`, entre outros. Retorna `201` com o cliente criado.
- **GET `/api/clientes/:id`** — Retorna o cliente. `404` se não encontrado.
- **PUT `/api/clientes/:id`** — Todos os campos opcionais (`name?`, `segment?`, `status?`, `contractValue?`, `logo?`, `contact?`, etc.).
- **DELETE `/api/clientes/:id`** — Remove o cliente. `204 No Content`.
- **GET `/api/clientes/:id/arquivos`** — Lista arquivos do cliente, cada item com `signedUrl` temporária.
- **POST `/api/clientes/:id/arquivos`** — `multipart/form-data`: `file` (máx. 50 MB), `name`, `fileType` (`contrato_assinado`|`briefing`|`proposta`|`outro`).
- **DELETE `/api/clientes/:id/arquivos/:arquivoId`** — Remove o registro e o objeto do Storage.
- **GET `/api/clientes/:id/contatos`** — Lista contatos do cliente.
- **POST `/api/clientes/:id/contatos`** — Body: `name`, `role`, `type` (`decisor`|`financeiro`|`operacional`|`outro`), `email?`, `whatsapp?`, `preferredChannel?`.
- **PUT `/api/clientes/:id/contatos/:contatoId`** — Todos os campos opcionais.
- **DELETE `/api/clientes/:id/contatos/:contatoId`** — Remove o contato.

### Pipeline

- **GET `/api/pipeline`** — Query: `page?`, `limit?`, `stage?`, `responsibleId?`, `search?`. Retorna `{ items: PipelineLead[], total, page, limit }`.
- **POST `/api/pipeline`** — Body: `companyName`, `contactName`, `estimatedValue`, `source`, `stage?` (default `novo_lead`), `responsibleId?`, `temperature?` (default `morno`), entre outros. Dispara notificação de novo lead.
- **GET `/api/pipeline/:id`** — Retorna o lead.
- **PUT `/api/pipeline/:id`** — Atualiza campos do lead sem mover o estágio (use `PATCH /api/pipeline/:id/stage` para isso). Todos os campos opcionais.
- **DELETE `/api/pipeline/:id`** — Remove o lead.
- **PATCH `/api/pipeline/:id/stage`** — Move o lead para um novo estágio no kanban e reseta o contador de dias no estágio. Body: `stage` (obrigatório), `lostReason?` (obrigatório se `stage = 'perdido'`), `meetingDate?` (recomendado se `stage = 'reuniao_agendada'`), `clienteId?` (se `stage = 'fechado'`). Dispara notificação da movimentação.

### Conteúdo

- **GET `/api/conteudo`** — Query: `clientId?`, `status?`, `from?`, `to?`, `limit?` (máx. 200, default 100).
- **POST `/api/conteudo`** — Body: `clientId`, `platform` (`Instagram`|`LinkedIn`|`YouTube`|`Blog`), `type` (`Feed`|`Stories`|`Reels`|`Artigo`), `title`, `publishDate`, `publishTime?`, `status?`, `responsibleId`. Dispara notificação de novo conteúdo agendado.
- **PUT `/api/conteudo/:id`** — Atualiza um item de conteúdo (campos opcionais).
- **DELETE `/api/conteudo/:id`** — Remove um item de conteúdo.

### Atividades

- **GET `/api/atividades`** — Lista as atividades mais recentes. Query: `limit?` (máx. 50, default 20), `associacaoTipo?`, `associacaoId?`, `responsavelId?`.
- **POST `/api/atividades`** — Registra uma nova atividade. Body: `tipo` (`reuniao`|`ligacao`|`email`|`mensagem`|`proposta`|`contrato`), `associacaoTipo` (`cliente`|`lead`), `associacaoId`, `associacaoNome`, `responsavelId`, `descricao`, `ocorridoEm?`, `resultado?`, `proximoPasso?`.
- **DELETE `/api/atividades/:id`** — Remove uma atividade (somente o criador).

### Dashboard e Relatórios

- **GET `/api/dashboard`** — Retorna `kpiData`, `pipelineChartData`, `activities`, `tasks` e `atRiskClients` para a tela de Dashboard (dados reais do Supabase).
- **GET `/api/relatorios`** — Retorna dados para a página de Relatórios em 3 blocos: `visaoGeral` (KPIs, gráfico dual-axis, alertas), `pipeline` (funil, canais, motivos de perda, leaderboard) e `clientes` (saúde, financeiro, receita vs. churn).

### Outros

- **GET `/api/campanhas`** — Lista todas as campanhas (dados simulados até a tabela `campanhas` existir no Supabase).
- **GET `/api/leads`** — Lista todos os leads do pipeline (dados simulados até a tabela `leads` existir no Supabase).
- **GET `/api/team`** — Retorna os membros do time (tabela `profiles`, com fallback para dados simulados se a tabela estiver vazia).
- **GET `/api/notifications`** — Retorna as 30 notificações mais recentes do usuário autenticado.
- **PATCH `/api/notifications`** — Marca notificações como lidas. Body: `id?` (omitir marca todas como lidas).

### Connex Insights (`/api/aplicacoes/connex-insights`)

Hub administrativo para a aplicação Connex Insights — usa o `SUPABASE_INSIGHTS_SERVICE_ROLE_KEY` (server-only).

- **GET `/api/aplicacoes/connex-insights/dashboard`** — Retorna `{ totalUsers, totalTenants }` (FR-005, FR-006). `502` se a Connex Insights estiver indisponível.
- **GET `/api/aplicacoes/connex-insights/tenants`** — Lista todos os tenants para popular o seletor do formulário de criação de usuário (FR-011).
- **GET `/api/aplicacoes/connex-insights/usuarios`** — Lista usuários paginada, com nome do tenant (FR-007). Query: `page?` (default 1), `limit?` (default 20, máx. 100).
- **POST `/api/aplicacoes/connex-insights/usuarios`** — Cria um novo usuário no Connex Insights (FR-012 a FR-017). Body: `name`, `email`, `login`, `tenantId` (uuid). Retorna `201` com `{ temporaryPassword, profileId }`. `404` se o tenant não existir, `409` se e-mail/login já em uso, `502` em falha de comunicação com o Connex Insights.
