# connex-crm-front

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_HOMvNe3c9Q7npu4SGHlMGqSSWigI)

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

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/luuizfernando/connex-crm-front" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
