# Feature Specification: Refatoração da Aba de Relatórios

**Feature Branch**: `001-refatorar-relatorios`

**Created**: 2026-06-18

**Status**: Draft

**Input**: Refatoração da seção de relatórios do CRM — reestruturação de 5+ abas fragmentadas em 3 abas coesas (Visão Geral, Pipeline & Vendas, Clientes & Financeiro), com remoção de abas redundantes e melhoria da hierarquia de informação.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Visão Geral executiva em segundos (Priority: P1)

Um gestor da Connex abre a aba de relatórios e, sem clicar em nada, consegue responder "como está o negócio hoje" em menos de 10 segundos: MRR atual, quantos clientes ativos existem, quantos leads estão no pipeline, qual a taxa de conversão, se há leads parados precisando de ação e se há renovações próximas.

**Por que P1**: É a porta de entrada do módulo de relatórios. Se o cockpit executivo não funcionar bem, o usuário perde a confiança em todo o módulo.

**Independent Test**: Pode ser totalmente testada abrindo a aba Relatórios sem outras interações — todos os dados do cockpit devem estar visíveis e corretos com apenas esse carregamento.

**Acceptance Scenarios**:

1. **Given** o usuário está autenticado e acessa Relatórios, **When** a aba Visão Geral carrega, **Then** são exibidos 4 cards de KPI (MRR, Clientes Ativos, Leads no Pipeline, Taxa de Conversão) com valores atualizados.
2. **Given** existem leads sem atividade há mais de X dias, **When** a aba Visão Geral carrega, **Then** o card "Leads Parados" exibe a lista desses leads com o número de dias em destaque visual de alerta.
3. **Given** existem contratos com renovação nos próximos 30 dias, **When** a aba Visão Geral carrega, **Then** o card "Renovações em 30 dias" lista esses contratos com cliente, data e valor.
4. **Given** o gráfico principal carrega, **When** o usuário observa o gráfico MRR + Novos Clientes, **Then** ele exibe duas linhas (MRR em reais no eixo Y esquerdo; contagem de clientes/leads no eixo Y direito) no mesmo espaço visual.
5. **Given** não há leads parados nem renovações próximas, **When** a aba carrega, **Then** os cards de alerta exibem mensagem de "tudo em dia" sem erro.

---

### User Story 2 — Análise do processo comercial (Priority: P1)

Um gestor comercial acessa a aba Pipeline & Vendas para entender onde os leads estão travando no funil, de onde vêm os leads mais qualificados, quais motivos causam mais perdas e quem está performando melhor no time.

**Por que P1**: Dados de funil e conversão são o core do CRM; sem essa visão o sistema perde sua proposta de valor central.

**Independent Test**: Testada acessando a aba Pipeline & Vendas com dados de leads em múltiplas etapas — o funil visual, canais, motivos de perda e leaderboard devem renderizar corretamente.

**Acceptance Scenarios**:

1. **Given** existem leads distribuídos nas 6 etapas do pipeline, **When** o usuário acessa Pipeline & Vendas, **Then** são exibidos 6 cards de volume por etapa, cada um com contagem de leads e valor total em reais acumulado na etapa.
2. **Given** o funil de conversão carrega, **When** o usuário visualiza o gráfico, **Then** cada etapa aparece com altura proporcional ao volume, e entre etapas consecutivas é exibida a taxa de avanço (ex.: "40% avançaram para Proposta Enviada").
3. **Given** existem leads de múltiplos canais de origem, **When** o usuário visualiza Canais de Origem, **Then** cada canal exibe duas barras lado a lado: total de leads captados e total de leads fechados, permitindo comparar volume vs. qualidade.
4. **Given** existem leads marcados como perdidos com motivo registrado, **When** o usuário visualiza Motivos de Perda, **Then** o donut exibe os motivos proporcionalmente e a tabela abaixo lista os leads perdidos com nome, etapa de saída, motivo e responsável.
5. **Given** existem usuários que fecharam negócios no período, **When** o usuário visualiza o Leaderboard, **Then** o ranking exibe cada usuário com número de negócios fechados e valor total gerado, ordenado do maior para o menor.

---

### User Story 3 — Saúde financeira e dos clientes (Priority: P2)

Um gestor de CS e financeiro acessa a aba Clientes & Financeiro para entender a saúde da base de clientes (ativos, em risco, inativos), a evolução de receita versus churn e quais clientes têm contratos próximos da renovação.

**Por que P2**: Importante para retenção, mas depende de dados de contratos e health score já implementados. A aba pode ser entregue com seções "Em breve" para inadimplência e LTV sem perder valor.

**Independent Test**: Testada acessando a aba Clientes & Financeiro com clientes em diferentes health scores — cards de saúde, gráfico de receita vs. churn e renovações devem renderizar; inadimplência e LTV exibem estado "Em breve".

**Acceptance Scenarios**:

1. **Given** o usuário acessa Clientes & Financeiro, **When** a aba carrega, **Then** são exibidos 3 cards financeiros: Ticket Médio, MRR e Contratos Ativos, com valores corretos.
2. **Given** existem dados de MRR por mês, **When** o gráfico Receita vs. Churn carrega, **Then** são exibidas duas linhas: MRR ganho no mês (novos contratos) e MRR perdido (churned), com eixo temporal horizontal.
3. **Given** os clientes têm health score calculado, **When** o usuário visualiza os cards de Health Score, **Then** três cards exibem as contagens de clientes Saudável, Em Risco e Inativo; ao clicar em qualquer card, abre uma lista com os clientes daquela categoria.
4. **Given** existem contratos com renovação nos próximos 60 dias, **When** o usuário visualiza Renovações, **Then** contratos com renovação em até 30 dias e entre 31 e 60 dias são exibidos em grupos distintos com cliente, data e valor.
5. **Given** a funcionalidade de inadimplência ainda não foi implementada, **When** o usuário visualiza a seção de Inadimplência, **Then** um card exibe "Em breve — contratos com pagamento em atraso há mais de X dias" sem erro ou conteúdo quebrado.
6. **Given** a funcionalidade de LTV ainda não foi implementada, **When** o usuário visualiza a seção de LTV, **Then** um card exibe "Em breve — requer histórico de cancelamentos" sem erro ou conteúdo quebrado.

---

### User Story 4 — Remoção de abas obsoletas (Priority: P1)

As abas "Atividades" e "Financeiro" deixam de existir como abas independentes. Seus conteúdos migram para as novas abas ou são descontinuados.

**Por que P1**: A remoção das abas redundantes é parte integral da refatoração — sem ela, o objetivo de simplificar a navegação não é atingido.

**Independent Test**: Testada verificando que as abas antigas não existem mais na navegação e que seus dados relevantes aparecem corretamente nas novas abas.

**Acceptance Scenarios**:

1. **Given** o usuário acessa a página de Relatórios, **When** a página carrega, **Then** apenas 3 abas são exibidas na navegação: Visão Geral, Pipeline & Vendas, Clientes & Financeiro.
2. **Given** "Leads Parados" estava na aba Atividades, **When** o usuário acessa Visão Geral, **Then** o conteúdo equivalente está presente no card de alertas de Visão Geral.
3. **Given** "Leaderboard de Vendas" estava na aba Atividades, **When** o usuário acessa Pipeline & Vendas, **Then** o leaderboard está presente nessa aba.
4. **Given** "Interações Recentes" estava na aba Atividades, **When** o usuário procura essa informação nos relatórios, **Then** ela não está nos relatórios (foi descontinuada para a timeline da ficha do cliente).

---

### Edge Cases

- O que acontece quando não há dados de leads, clientes ou receita? Todos os gráficos e cards devem exibir estado vazio com mensagem descritiva, sem erros de renderização.
- O que acontece quando o usuário troca de aba rapidamente? Cada aba carrega seus dados de forma independente; dados de uma aba não interferem em outra.
- O que acontece quando a API retorna erro em uma seção específica? A seção com erro exibe mensagem de falha isolada sem afetar as outras seções da mesma aba.
- O que acontece quando há leads parados mas nenhum com renovação próxima? Cada card de alerta é renderizado independentemente — um pode estar cheio e o outro vazio.
- O que acontece com os gráficos de linha dupla quando os eixos Y têm ordens de grandeza muito diferentes (ex.: MRR em R$ 50.000 vs. 12 novos clientes)? Os eixos Y devem ser independentes (dual axis) com escala adequada para cada série.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A página de Relatórios DEVE exibir exatamente 3 abas de navegação: "Visão Geral", "Pipeline & Vendas" e "Clientes & Financeiro".
- **FR-002**: A aba "Visão Geral" DEVE ser a aba ativa por padrão ao acessar a página de Relatórios.
- **FR-003**: A aba Visão Geral DEVE exibir 4 cards de KPI no topo: MRR, Clientes Ativos, Leads no Pipeline e Taxa de Conversão.
- **FR-004**: A aba Visão Geral DEVE exibir um gráfico de linha dupla com MRR (eixo Y esquerdo, em reais) e Novos Clientes/Leads (eixo Y direito, contagem), compartilhando o mesmo eixo temporal.
- **FR-005**: A aba Visão Geral DEVE exibir dois cards de alerta lado a lado: "Leads Parados" (com lista de leads e dias sem atividade em destaque de alerta) e "Renovações em 30 dias" (com lista de contratos, cliente, data e valor).
- **FR-006**: A aba Pipeline & Vendas DEVE exibir 6 cards de volume por etapa, cada um com contagem de leads e valor total em reais acumulado.
- **FR-007**: A aba Pipeline & Vendas DEVE exibir um gráfico de funil visual (cada etapa menor que a anterior) com a taxa de conversão entre etapas consecutivas.
- **FR-008**: A aba Pipeline & Vendas DEVE exibir a seção Canais de Origem com duas barras por canal: total de leads captados e total de leads fechados.
- **FR-009**: A aba Pipeline & Vendas DEVE exibir um donut de Motivos de Perda acompanhado de tabela com leads perdidos (nome, etapa de saída, motivo, responsável).
- **FR-010**: A aba Pipeline & Vendas DEVE exibir o Leaderboard de Vendas com ranking por negócios fechados e valor gerado no período.
- **FR-011**: A aba Clientes & Financeiro DEVE exibir 3 cards financeiros: Ticket Médio, MRR e Contratos Ativos.
- **FR-012**: A aba Clientes & Financeiro DEVE exibir um gráfico de linha dupla de Receita vs. Churn (MRR ganho vs. MRR perdido por mês).
- **FR-013**: A aba Clientes & Financeiro DEVE exibir 3 cards de Health Score (Saudável, Em Risco, Inativo) com contagem de clientes em cada categoria; ao clicar em um card, exibe lista dos clientes daquela categoria.
- **FR-014**: A aba Clientes & Financeiro DEVE exibir renovações agrupadas em "até 30 dias" e "31 a 60 dias" com cliente, data e valor.
- **FR-015**: A aba Clientes & Financeiro DEVE exibir cards de "Em breve" para Inadimplência (com critério descrito: "contratos com pagamento em atraso há mais de X dias") e LTV (com critério: "requer histórico de cancelamentos").
- **FR-016**: As abas "Atividades" e "Financeiro" (se existentes como abas independentes) DEVEM ser removidas da navegação de Relatórios.
- **FR-017**: "Interações Recentes" DEVE ser removida dos relatórios (pertence à timeline da ficha do cliente).
- **FR-018**: Todos os gráficos e cards DEVEM exibir estado vazio com mensagem descritiva quando não houver dados disponíveis.
- **FR-019**: Erros de carregamento em uma seção específica NÃO DEVEM afetar outras seções da mesma aba.

### Security & Access Control

- **SEC-001**: Os dados exibidos nos relatórios DEVEM respeitar as políticas RLS existentes — cada usuário vê apenas dados da sua organização, filtrados por `org_id`.
- **SEC-002**: Todos os parâmetros de filtro (período, responsável) recebidos pelo servidor DEVEM ser validados via schema Zod antes de qualquer consulta.

### Data Integrity & Auditability

- **DI-001**: A refatoração é predominantemente de leitura (read-only); nenhuma mutação de dados é introduzida por esta feature.
- **OBS-001**: Erros nas consultas de relatório DEVEM ser capturados e logados com `user_id`, endpoint e contexto sanitizado.
- **OBS-002**: As métricas de MRR, taxa de conversão e churn DEVEM ser consultáveis diretamente via queries no Supabase para validação de valores exibidos.

### Key Entities

- **Relatório / Visão Geral**: Agregação de KPIs em tempo real do estado atual do negócio — MRR, clientes ativos, leads no pipeline, taxa de conversão, leads parados, renovações próximas.
- **Relatório / Pipeline**: Distribuição de leads por etapa, taxas de conversão entre etapas, volume e qualidade por canal de origem, motivos de perda e ranking de performance por usuário.
- **Relatório / Clientes & Financeiro**: Saúde financeira (ticket médio, MRR, contratos) e saúde dos clientes (health score, renovações, churn vs. receita nova).
- **Card de Alerta**: Componente exibido em Visão Geral contendo lista acionável de itens que requerem atenção imediata (leads parados, renovações).
- **Health Score**: Classificação de cada cliente em uma de 3 categorias (Saudável, Em Risco, Inativo) com base em critérios já definidos no sistema.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um gestor consegue visualizar o estado completo do negócio (KPIs, alertas, tendência de MRR) na aba Visão Geral sem nenhuma interação adicional além de abrir a página.
- **SC-002**: A página de Relatórios exibe exatamente 3 abas — qualquer outra estrutura de navegação representa uma falha.
- **SC-003**: Todos os cards e gráficos de cada aba exibem estado vazio adequado quando não há dados, sem nenhuma mensagem de erro técnica visível ao usuário.
- **SC-004**: Ao clicar em um card de Health Score (Saudável, Em Risco, Inativo), a lista de clientes daquela categoria é exibida em menos de 2 segundos.
- **SC-005**: Os dados de "Leads Parados" e "Renovações em 30 dias" aparecem na Visão Geral sem que o usuário precise navegar para outra aba.
- **SC-006**: O funil de conversão em Pipeline & Vendas exibe visualmente a taxa de queda entre cada par de etapas consecutivas, permitindo identificar o gargalo principal do processo comercial em menos de 5 segundos.
- **SC-007**: As abas "Atividades" e "Financeiro" como abas independentes deixam de existir, e nenhum dado relevante (exceto Interações Recentes) é perdido na migração.

---

## Assumptions

- O sistema já possui as etapas do pipeline definidas e os leads já contêm dados de etapa, canal de origem e, em alguns casos, motivo de perda.
- O health score dos clientes já é calculado em alguma parte do sistema — esta feature apenas consome e exibe esse dado, não o calcula.
- A tabela de faturas/pagamentos ainda não existe no banco de dados, justificando os cards de "Em breve" para Inadimplência e LTV.
- O período de análise padrão dos gráficos é os últimos 12 meses; filtros de período podem ser adicionados em iteração futura.
- "X dias" no critério de leads parados é uma constante configurável que já existe ou será definida durante a implementação (assumption: 7 dias como padrão razoável).
- A feature é de refatoração de front-end e camada de dados de leitura — nenhuma migração de banco de dados é necessária para as funcionalidades principais.
- Interações Recentes (lista de atividades agregadas) é descontinuada nos relatórios pois pertence semanticamente à timeline da ficha do cliente, não a um relatório gerencial.
- O gráfico de Receita vs. Churn (MRR ganho vs. perdido) requer que o sistema já calcule ou registre o MRR por mês — se esse dado não existir, a seção exibirá estado "Em breve" similar a Inadimplência e LTV.
