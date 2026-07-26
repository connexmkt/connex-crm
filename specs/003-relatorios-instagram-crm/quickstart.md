# Quickstart: Visualização de Relatórios do Instagram no Connex CRM

**Feature**: `003-relatorios-instagram-crm`

Este guia valida a feature de ponta a ponta **sem depender** da implementação (fora de escopo — ver [research.md § D2](./research.md#d2-mecanismo-de-envio-connex-insights--connex-crm)) do lado que gera e envia relatórios no `connex-insights`. Os dados de exemplo são inseridos diretamente via ingestão HTTP (simulando o Insights) ou via SQL de seed.

## Pré-requisitos

- `connex-crm` rodando localmente (`pnpm dev`) com as variáveis de ambiente configuradas:
  - `SUPABASE_INSIGHTS_URL` / `SUPABASE_INSIGHTS_SERVICE_ROLE_KEY` (já existentes, feature 002) — usadas para ler `instagram_integrations`.
  - `SUPABASE_SERVICE_ROLE_KEY` (nova, projeto do próprio CRM) — usada pelos endpoints de ingestão.
  - `CONNEX_INSIGHTS_INGEST_SECRET` (nova) — segredo compartilhado para autenticar as chamadas de ingestão.
- Um cliente já cadastrado em `/clientes` no CRM (anote o `id` — ele é o `clienteId` usado abaixo, igual ao `tenant_id` no Insights).
- Migrations desta feature aplicadas (`instagram_weekly_reports`, `instagram_monthly_reports`, `instagram_report_posts`, `instagram_report_views`, view `instagram_client_report_summary`).
- Usuário autenticado no CRM (login normal via `/auth/login`).

## 1. Popular um relatório semanal (simulando o Connex Insights)

```bash
curl -X POST http://localhost:3000/api/integrations/connex-insights/relatorios-instagram/semanais \
  -H "Content-Type: application/json" \
  -H "x-connex-insights-secret: $CONNEX_INSIGHTS_INGEST_SECRET" \
  -d '{
    "sourceReportId": "insights-weekly-demo-001",
    "clienteId": "<UUID_DO_CLIENTE>",
    "referenceYear": 2026,
    "referenceMonth": 7,
    "referenceWeek": 3,
    "periodStart": "2026-07-13",
    "periodEnd": "2026-07-19",
    "generatedAt": "2026-07-20T03:00:00Z",
    "status": "AVAILABLE",
    "bestPost": {
      "instagramMediaId": "17999999999",
      "permalink": "https://instagram.com/p/demo-best",
      "thumbnailUrl": "https://picsum.photos/seed/best/400",
      "contentType": "REELS",
      "publishedAt": "2026-07-15T12:00:00Z",
      "primaryMetricName": "engagement",
      "primaryMetricValue": 8452,
      "metrics": { "reach": 40233, "likes": 7100, "comments": 320, "shares": 210, "saves": 822 }
    },
    "worstPost": {
      "instagramMediaId": "17888888888",
      "permalink": "https://instagram.com/p/demo-worst",
      "thumbnailUrl": "https://picsum.photos/seed/worst/400",
      "contentType": "IMAGE",
      "publishedAt": "2026-07-17T09:00:00Z",
      "primaryMetricName": "engagement",
      "primaryMetricValue": 112,
      "metrics": { "reach": 980, "likes": 90, "comments": 4, "shares": 0, "saves": 18 }
    }
  }'
```

**Esperado**: `201 Created` com `{ "data": { "id": "...", "action": "created" } }`. Repetir a mesma chamada deve retornar `200 OK` com `"action": "updated"` (idempotência por `sourceReportId`).

## 2. Popular um relatório mensal

```bash
curl -X POST http://localhost:3000/api/integrations/connex-insights/relatorios-instagram/mensais \
  -H "Content-Type: application/json" \
  -H "x-connex-insights-secret: $CONNEX_INSIGHTS_INGEST_SECRET" \
  -d '{
    "sourceReportId": "insights-monthly-demo-001",
    "clienteId": "<UUID_DO_CLIENTE>",
    "referenceYear": 2026,
    "referenceMonth": 7,
    "generatedAt": "2026-08-01T03:00:00Z",
    "status": "AVAILABLE",
    "topPosts": [
      { "instagramMediaId": "1", "primaryMetricName": "engagement", "primaryMetricValue": 9000, "metrics": {} },
      { "instagramMediaId": "2", "primaryMetricName": "engagement", "primaryMetricValue": 7000, "metrics": {} },
      { "instagramMediaId": "3", "primaryMetricName": "engagement", "primaryMetricValue": 5000, "metrics": {} }
    ],
    "worstPost": { "instagramMediaId": "4", "primaryMetricName": "engagement", "primaryMetricValue": 50, "metrics": {} },
    "followersGained": 340,
    "followersStart": 12000,
    "followersEnd": 12340,
    "followersGrowthPct": 2.83,
    "accountsReached": 58210
  }'
```

**Esperado**: `201 Created`.

## 3. Validar segurança da ingestão

```bash
# Sem o header do segredo
curl -i -X POST http://localhost:3000/api/integrations/connex-insights/relatorios-instagram/semanais -d '{}'
# Esperado: 401 Unauthorized

# clienteId inexistente
curl -i -X POST http://localhost:3000/api/integrations/connex-insights/relatorios-instagram/semanais \
  -H "x-connex-insights-secret: $CONNEX_INSIGHTS_INGEST_SECRET" \
  -d '{"sourceReportId":"x","clienteId":"00000000-0000-0000-0000-000000000000", ...}'
# Esperado: 404 Not Found
```

## 4. Validar a navegação no CRM

1. Login no CRM → sidebar → **Relatórios** → expandir → **Relatórios de Instagram**.
2. **Esperado**: o cliente populado nos passos 1–2 aparece como card, com status de integração (lido do Insights), data do último relatório (19/07/2026, do relatório semanal) e indicador de "novo" (nenhuma visualização registrada ainda).
3. Clicar no card → página do cliente → tab **Semanais** selecionada por padrão → mês **Julho 2026** visível.
4. Clicar em Julho 2026 → **3ª Semana** visível com período 13/07–19/07.
5. Clicar na 3ª Semana → relatório semanal exibido, com a postagem de melhor performance (engagement 8452) visualmente destacada da pior (engagement 112).
6. Voltar, trocar para tab **Mensais** → Julho 2026 visível → abrir → Top 3 postagens exibidas, a de ranking 1 (engagement 9000) com destaque "🏆 Melhor Performance do Mês"; pior postagem, seguidores ganhos (340, de 12000 para 12340, +2.83%) e contas alcançadas (58210) visíveis.
7. Recarregar a página do cliente → o indicador de "novo" no card da lista de clientes deve ter desaparecido (registro em `instagram_report_views` criado no passo 5/6).

## 5. Validar isolamento de erro e retry

1. Derrubar a conexão com o Supabase remoto do Insights (ou usar `SUPABASE_INSIGHTS_URL` inválida temporariamente) e recarregar a lista de clientes.
2. **Esperado**: o card do cliente ainda aparece (dados de relatório vêm do próprio CRM), mas o username/avatar/status do Instagram exibem um estado de erro localizado (não uma tela em branco), sem impedir a navegação para o relatório em si.
3. Provocar um erro na busca do conteúdo de uma semana específica (ex.: `reference_week` inexistente na URL) → **Esperado**: `error.tsx` daquele segmento exibe mensagem amigável + botão "Tentar novamente", sem afetar a navegação de outros clientes/meses/semanas.

## 6. Testes automatizados

```bash
pnpm test        # unit + integration (Vitest)
pnpm typecheck
pnpm lint
```

**Esperado**: cobertura para os repositories/services novos (mocks de `SupabaseClient` local e do admin client remoto do Insights) e para os dois Route Handlers de ingestão (401 sem segredo, 400 payload inválido, 404 cliente inexistente, 200/201 conforme idempotência).
