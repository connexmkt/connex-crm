# Feature Specification: Visualização de Relatórios do Instagram no Connex CRM

**Feature Branch**: `003-relatorios-instagram-crm`

**Created**: 2026-07-26

**Status**: Draft

**Input**: User description: "Visualização de Relatórios do Instagram no Connex CRM — Como um usuário autenticado do Connex CRM, quero acessar os relatórios de performance do Instagram enviados pelo Connex Insights, para acompanhar os resultados dos clientes e analisar a evolução de suas estratégias de conteúdo. Os relatórios devem ser disponibilizados dentro da seção Relatórios da sidebar do CRM, com uma área específica para relatórios de Instagram. A funcionalidade deve estar disponível somente para usuários autenticados, respeitando multi-tenancy e RLS. Na sidebar deve existir a seção Relatórios > Relatórios de Instagram, listando clientes com relatórios disponíveis em cards clicáveis (nome do cliente, usuário do Instagram, avatar, status da integração, data do último relatório, indicador de novos relatórios). A página do cliente exibe tabs Semanais e Mensais (Semanais como padrão). Semanais são organizados por ano → mês → semana, com melhor e pior performance de postagem por semana. Mensais são organizados por ano → mês, com top 3 postagens (destaque para o 1º lugar), pior performance, seguidores ganhos e contas alcançadas. A ordenação usa o período de referência do relatório, do mais recente para o mais antigo. Devem existir estados de carregamento (skeleton), estados vazios e tratamento de erros com opção de tentar novamente, sem que a falha de um cliente afete os demais. O CRM não deve consultar diretamente a API do Instagram — apenas exibir relatórios já persistidos, enviados pelo Connex Insights. O carregamento deve ser progressivo (lista de clientes → meses → semana/mês → conteúdo completo), com paginação/carregamento incremental quando necessário. A autorização deve ser validada no backend, impedindo acesso cross-tenant mesmo via manipulação de URL."

## Clarifications

### Session 2026-07-26

- Q: O acesso aos clientes e relatórios de Instagram dentro do Connex CRM deve ser restrito por tenant (multi-tenancy), ou todos os usuários autenticados do CRM podem visualizar todos os clientes cadastrados, já que o conceito de tenant existe apenas no Connex Insights? → A: O Connex CRM não possui conceito de tenant. Qualquer usuário autenticado no CRM consegue ver todos os clientes cadastrados e seus relatórios de Instagram, sem limitação de tenant. O tenant é um conceito interno exclusivo do Connex Insights.
- Q: O Connex CRM deve aplicar alguma regra de negócio própria sobre as postagens (cálculo de melhor/pior performance, rankings, métricas), ou deve apenas exibir o que o Connex Insights já processou e enviou? → A: O CRM não deve implementar nenhuma regra de negócio sobre as postagens. Toda a lógica de elaboração do relatório (melhor/pior performance, ranking do top 3, cálculo de métricas) é responsabilidade exclusiva do Connex Insights; o CRM apenas recebe, persiste e exibe fielmente o que foi enviado.
- Q: O carregamento da lista de clientes e dos relatórios deve ser paginado apenas quando a quantidade de itens justificar, ou deve ser sempre paginado, independentemente da quantidade? → A: O carregamento da lista de clientes e das listagens de relatórios (meses, semanas, postagens) deve ser sempre paginado, independentemente da quantidade de itens existentes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acessar a área de Relatórios de Instagram e localizar um cliente (Priority: P1)

Como usuário autenticado do Connex CRM, acesso a seção **Relatórios** na sidebar, entro em **Relatórios de Instagram** e visualizo a lista de todos os clientes cadastrados que possuem relatórios disponíveis, cada um em um card com suas informações essenciais, para decidir rapidamente qual cliente quero analisar.

**Why this priority**: É o ponto de entrada de toda a funcionalidade. Sem essa navegação e listagem, nenhum outro fluxo pode ser alcançado. Também é onde a exigência de autenticação é validada pela primeira vez (apenas usuários logados no CRM acessam a área).

**Independent Test**: Pode ser testado de forma isolada fazendo login no Connex CRM, navegando até Relatórios > Relatórios de Instagram, e verificando que todos os clientes cadastrados com relatórios disponíveis aparecem como cards clicáveis com as informações disponíveis (nome, usuário do Instagram, avatar, status, data do último relatório, indicador de novidade), carregados de forma paginada. Entrega valor por si só ao dar visibilidade de quais clientes têm dados disponíveis.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado no Connex CRM, **When** ele acessa Relatórios > Relatórios de Instagram, **Then** o sistema exibe, de forma paginada, um card por cliente cadastrado com relatórios disponíveis, contendo as informações disponíveis (nome, usuário do Instagram, avatar, status da integração, data do último relatório, indicador de novos relatórios).
2. **Given** um usuário autenticado, **When** a lista de clientes está sendo carregada, **Then** o sistema exibe skeletons no lugar dos cards até que os dados estejam disponíveis.
3. **Given** um usuário autenticado sem nenhum cliente com relatórios de Instagram disponíveis, **When** ele acessa a área de Relatórios de Instagram, **Then** o sistema exibe uma mensagem de estado vazio explicando que relatórios aparecerão após o processamento pelo Connex Insights.
4. **Given** uma falha ao carregar a lista de clientes, **When** o usuário acessa a área de Relatórios de Instagram, **Then** o sistema exibe uma mensagem de erro amigável (sem detalhes técnicos) com uma ação para tentar novamente.
5. **Given** um usuário autenticado, **When** ele clica em um card de cliente, **Then** ele é direcionado para a página de relatórios daquele cliente específico.

---

### User Story 2 - Visualizar relatórios semanais de um cliente (Priority: P1)

Como usuário autenticado, ao entrar na página de um cliente quero navegar pela tab **Semanais**, escolher um mês e depois uma semana, para visualizar as postagens de melhor e pior performance daquele período.

**Why this priority**: Representa o núcleo do valor de negócio da feature — acompanhar a evolução semanal de conteúdo é o principal motivo pelo qual o usuário acessa essa área. É a tab padrão da página do cliente.

**Independent Test**: Pode ser testado isoladamente acessando a página de um cliente com relatórios semanais processados, verificando que a tab Semanais é exibida por padrão, que os meses aparecem em ordem cronológica decrescente, que ao selecionar um mês as semanas aparecem com seus períodos, e que ao selecionar uma semana o relatório com melhor/pior performance é exibido corretamente.

**Acceptance Scenarios**:

1. **Given** um cliente com relatórios semanais em múltiplos meses, **When** o usuário acessa a página do cliente pela primeira vez na sessão, **Then** a tab Semanais é exibida por padrão, e os meses são listados do mais recente para o mais antigo, com base no período de referência do relatório.
2. **Given** um usuário navegando na página do cliente, **When** ele seleciona outra tab (Mensais) e depois retorna à página do cliente durante a mesma sessão, **Then** a última tab selecionada é mantida.
3. **Given** um mês com relatórios semanais, **When** o usuário seleciona esse mês, **Then** o sistema exibe as semanas daquele mês identificadas (1ª, 2ª, 3ª... semana) com período inicial, período final, data de geração/envio, status e indicador de disponibilidade.
4. **Given** uma semana com relatório disponível, **When** o usuário a seleciona, **Then** o sistema exibe a postagem de melhor performance e a de pior performance daquela semana, com thumbnail, data de publicação, link, tipo de conteúdo e métricas, quando disponíveis, com diferenciação visual clara entre as duas.
5. **Given** um cliente sem nenhum relatório semanal, **When** o usuário acessa a tab Semanais, **Then** o sistema exibe a mensagem "Nenhum relatório semanal disponível.".
6. **Given** uma falha ao carregar os meses, semanas ou o conteúdo de um relatório semanal, **When** o erro ocorre, **Then** o sistema informa o usuário de forma clara, sem termos técnicos, e oferece uma ação para tentar novamente, sem afetar o acesso aos relatórios de outros clientes.

---

### User Story 3 - Visualizar relatórios mensais de um cliente (Priority: P2)

Como usuário autenticado, ao entrar na página de um cliente quero navegar pela tab **Mensais**, escolher um mês, para visualizar um resumo consolidado com as três melhores postagens, a pior postagem, seguidores ganhos e contas alcançadas naquele período.

**Why this priority**: Complementa a visão semanal com uma visão consolidada de mais alto nível, útil para relatórios executivos e análises de tendência, mas depende da existência da navegação e da página do cliente (US1) para fazer sentido.

**Independent Test**: Pode ser testado isoladamente acessando a tab Mensais de um cliente com relatórios mensais processados, verificando que os meses aparecem em ordem cronológica decrescente sem subdivisão por semana, e que ao selecionar um mês o relatório exibe corretamente o top 3 de postagens (com destaque visual para o 1º lugar), a pior performance, seguidores ganhos e contas alcançadas.

**Acceptance Scenarios**:

1. **Given** um cliente com relatórios mensais em múltiplos meses, **When** o usuário seleciona a tab Mensais, **Then** os meses são listados do mais recente para o mais antigo, sem qualquer subdivisão por semana.
2. **Given** um mês com relatório mensal disponível, **When** o usuário o seleciona, **Then** o sistema exibe as três postagens de melhor performance, com a postagem em 1º lugar recebendo destaque visual de "Melhor Performance do Mês", cada uma com ranking, thumbnail, data de publicação, link, tipo de conteúdo e métricas disponíveis (engajamento, alcance, impressões, curtidas, comentários, compartilhamentos, salvamentos, visualizações e outras quando disponibilizadas).
3. **Given** o relatório mensal selecionado, **When** exibido, **Then** o sistema também apresenta a postagem de pior desempenho do mês, os seguidores ganhos (com totais de início/fim e crescimento percentual quando disponíveis) e o número de contas alcançadas.
4. **Given** um cliente sem nenhum relatório mensal, **When** o usuário acessa a tab Mensais, **Then** o sistema exibe a mensagem "Nenhum relatório mensal disponível.".
5. **Given** uma falha ao carregar os meses ou o conteúdo de um relatório mensal, **When** o erro ocorre, **Then** o sistema informa o usuário de forma clara, sem termos técnicos, e oferece uma ação para tentar novamente, sem afetar o acesso aos relatórios de outros clientes.

---

### Edge Cases

- O que acontece quando um cliente tem integração com Instagram configurada, mas ainda nenhum relatório foi processado pelo Connex Insights? O card do cliente deve indicar isso claramente (ex.: status "sem relatórios ainda"), sem quebrar a listagem dos demais clientes.
- Como o sistema se comporta quando um cliente perde a conexão com o Instagram (status de integração inativo)? O card deve refletir o status atual, mas relatórios históricos já recebidos continuam acessíveis.
- O que acontece com uma semana que abrange dois meses (ex.: última semana de um mês se estende para o mês seguinte)? A semana deve ser agrupada no mês ao qual seu período de referência pertence, conforme definido pelo Connex Insights.
- Como o sistema trata uma semana ou mês com apenas uma postagem publicada? Melhor e pior performance (ou top 3) devem exibir apenas o que existe, sem duplicar ou exibir placeholders enganosos.
- O que acontece se um usuário não autenticado tentar acessar diretamente a URL de um relatório de um cliente? O backend deve negar o acesso e redirecionar para a autenticação, independentemente do que a URL contenha.
- Como o sistema se comporta se o Connex Insights enviar um relatório com dados parciais (ex.: faltando thumbnail ou uma métrica específica)? O relatório deve ser exibido normalmente, omitindo apenas os campos indisponíveis, sem impedir a visualização do restante.
- O que acontece quando a lista de clientes ou de relatórios é muito grande? O sistema deve carregar os dados progressivamente (paginação/carregamento incremental), evitando travamentos ou tempos de espera excessivos.
- Como o sistema trata o erro de carregamento de um único cliente dentro de uma lista com vários outros carregados com sucesso? Apenas o card ou seção daquele cliente deve indicar erro, sem afetar os demais.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE exibir a seção "Relatórios" na sidebar do Connex CRM, visível apenas para usuários autenticados.
- **FR-002**: Dentro da seção "Relatórios", o sistema DEVE oferecer uma opção específica "Relatórios de Instagram".
- **FR-003**: Ao acessar "Relatórios de Instagram", o sistema DEVE listar, em cards individuais e clicáveis, todos os clientes cadastrados no Connex CRM que possuam ao menos um relatório de Instagram disponível, sem qualquer restrição por tenant (conceito inexistente no CRM).
- **FR-004**: Cada card de cliente DEVE apresentar, quando disponível: nome do cliente, nome de usuário do Instagram conectado, imagem/avatar do Instagram, status da integração, data do último relatório disponível e um indicador de existência de novos relatórios.
- **FR-005**: Ao clicar em um card, o sistema DEVE direcionar o usuário para a página de relatórios daquele cliente específico.
- **FR-006**: A página de relatórios do cliente DEVE exibir nome do cliente, conta do Instagram vinculada, imagem/avatar, data da última atualização dos dados e uma navegação de retorno para a lista de clientes.
- **FR-007**: A página de relatórios do cliente DEVE organizar o conteúdo em duas tabs: "Semanais" e "Mensais".
- **FR-008**: A tab "Semanais" DEVE ser selecionada por padrão ao acessar a página do cliente, exceto quando o usuário já tiver selecionado outra tab para aquele cliente durante a sessão atual, caso em que a última tab escolhida deve prevalecer.
- **FR-009**: Na tab "Semanais", o sistema DEVE agrupar os relatórios hierarquicamente por ano, mês e semana, com base no período de referência do relatório (não na data de recebimento pelo CRM).
- **FR-010**: Na tab "Semanais", os meses disponíveis DEVEM ser listados em ordem cronológica decrescente (mais recente primeiro).
- **FR-011**: Ao selecionar um mês na tab "Semanais", o sistema DEVE exibir as semanas daquele mês identificadas ordinalmente (1ª, 2ª, 3ª...), cada uma com período inicial, período final, data de geração/envio, status do relatório e indicador de disponibilidade.
- **FR-012**: Ao selecionar uma semana, o sistema DEVE exibir o relatório semanal correspondente, destacando a postagem de melhor performance e a de pior performance da semana, cada uma com thumbnail, data de publicação, link/permalink, tipo de conteúdo, métrica(s) de performance e demais métricas relevantes, quando disponíveis.
- **FR-013**: O sistema DEVE diferenciar visualmente a postagem de melhor performance da de pior performance dentro do relatório semanal.
- **FR-014**: Na tab "Mensais", o sistema DEVE agrupar os relatórios somente por ano e mês (sem subdivisão por semana), com base no período de referência do relatório.
- **FR-015**: Na tab "Mensais", os meses disponíveis DEVEM ser listados em ordem cronológica decrescente.
- **FR-016**: Ao selecionar um mês na tab "Mensais", o sistema DEVE exibir o relatório mensal correspondente, incluindo: top 3 postagens (com destaque visual "Melhor Performance do Mês" para a 1ª colocada), postagem de pior performance, seguidores ganhos (incluindo, quando disponíveis, seguidores no início e no final do período e crescimento percentual) e número de contas alcançadas no período.
- **FR-017**: Cada postagem exibida (semanal ou mensal) DEVE apresentar, quando disponível, ranking (quando aplicável), thumbnail, data de publicação, link/permalink, tipo de conteúdo e métricas do Instagram (engajamento, alcance, impressões, curtidas, comentários, compartilhamentos, salvamentos, visualizações e outras disponibilizadas).
- **FR-018**: O sistema DEVE exibir os relatórios (semanais e mensais) ordenados do mais recente para o mais antigo, com base no período de referência do relatório, e não na data de criação do registro no CRM.
- **FR-019**: Quando um cliente não possuir relatórios de um determinado tipo (semanal ou mensal), o sistema DEVE exibir uma mensagem informativa específica (ex.: "Nenhum relatório semanal disponível." / "Nenhum relatório mensal disponível.").
- **FR-020**: Quando um cliente não possuir nenhum relatório de Instagram, o sistema DEVE exibir um estado vazio explicando que os relatórios serão disponibilizados após o processamento pelo Connex Insights.
- **FR-021**: O sistema DEVE exibir estados de carregamento (skeletons ou equivalentes) para a lista de clientes, lista de meses, lista de semanas e conteúdo do relatório, evitando telas completamente vazias durante o carregamento.
- **FR-022**: Quando não for possível carregar relatórios, o sistema DEVE informar o usuário de forma clara, sem expor mensagens técnicas, e DEVE oferecer uma ação para tentar novamente.
- **FR-023**: Uma falha ao carregar dados de um cliente NÃO DEVE impedir o acesso aos relatórios de outros clientes.
- **FR-024**: O sistema DEVE exibir os relatórios de Instagram exclusivamente a partir de dados previamente recebidos e persistidos do Connex Insights; o Connex CRM NÃO DEVE consultar diretamente a API do Instagram para montar os relatórios.
- **FR-025**: O carregamento de dados DEVE ocorrer progressivamente: a listagem inicial de clientes NÃO DEVE carregar o conteúdo completo de todos os relatórios; o conteúdo detalhado de um relatório só é carregado quando o usuário efetivamente navega até ele (cliente → mês → semana/mês → conteúdo).
- **FR-026**: O sistema DEVE utilizar paginação em todas as listagens (clientes, meses, semanas, postagens), sempre, independentemente da quantidade de itens existentes.
- **FR-027**: O sistema NÃO DEVE aplicar nenhuma lógica de negócio própria para calcular, reclassificar, reordenar ou reinterpretar métricas e classificações das postagens (ex.: melhor/pior performance, ranking do top 3); toda essa definição é responsabilidade exclusiva do Connex Insights, cabendo ao CRM apenas persistir e exibir fielmente os dados recebidos.

### Security & Access Control

- **SEC-001**: O acesso à área de Relatórios de Instagram e a todo o seu conteúdo DEVE ser restrito a usuários autenticados no Connex CRM.
- **SEC-002**: Qualquer usuário autenticado no Connex CRM DEVE poder visualizar todos os clientes cadastrados e seus relatórios de Instagram; o CRM não possui conceito de tenant, portanto não há segmentação de clientes/relatórios por tenant dentro do CRM (a segmentação por tenant existe apenas internamente no Connex Insights, para fins de geração dos relatórios).
- **SEC-003**: Políticas de Row Level Security (RLS) DEVEM ser aplicadas a todas as entidades envolvidas (clientes, integrações de Instagram, relatórios semanais, relatórios mensais e postagens associadas), exigindo autenticação válida para qualquer leitura, sem necessidade de segmentação adicional por tenant no escopo do CRM.
- **SEC-004**: A autorização de acesso a um cliente e aos seus relatórios DEVE ser validada no backend em toda requisição, garantindo que apenas usuários com sessão autenticada válida no Connex CRM consigam consultar esses dados, independentemente de parâmetros manipulados na URL.
- **SEC-005**: Cada relatório (semanal ou mensal) DEVE estar associado a exatamente um cliente, garantindo rastreabilidade direta entre relatório e cliente dentro do Connex CRM.

### Observability

- **OBS-001**: Falhas ao buscar ou carregar relatórios (lista de clientes, meses, semanas ou conteúdo) DEVEM ser capturadas e logadas no backend com contexto suficiente (usuário, cliente, tipo de relatório) para diagnóstico, sem expor esse contexto técnico ao usuário final.
- **OBS-002**: Tentativas de acesso não autenticado (sem sessão válida) às rotas de relatórios de Instagram DEVEM ser registradas para fins de auditoria de segurança.

### Key Entities

- **Cliente**: Representa a empresa/conta atendida pela Connex, cadastrada no Connex CRM e visível a qualquer usuário autenticado; ponto de entrada para os relatórios de Instagram exibidos no CRM.
- **Integração de Instagram**: Representa a conexão do cliente com uma conta de Instagram, incluindo nome de usuário, avatar e status atual da integração (ex.: conectado, desconectado, pendente).
- **Relatório Semanal**: Registro persistido enviado pelo Connex Insights, já totalmente processado, associado a um cliente e a um período de referência (ano, mês, semana), contendo a postagem de melhor e a de pior performance da semana, com suas métricas, conforme definido pelo Connex Insights.
- **Relatório Mensal**: Registro persistido enviado pelo Connex Insights, já totalmente processado, associado a um cliente e a um período de referência (ano, mês), contendo o top 3 de postagens, a postagem de pior performance, dados de seguidores ganhos e contas alcançadas no período, conforme definido pelo Connex Insights.
- **Postagem**: Item de conteúdo do Instagram referenciado dentro de um relatório (semanal ou mensal), com atributos como thumbnail, data de publicação, link/permalink, tipo de conteúdo e métricas de performance (engajamento, alcance, impressões, curtidas, comentários, compartilhamentos, salvamentos, visualizações), recebidos prontos do Connex Insights.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário autenticado consegue chegar à lista de clientes com relatórios de Instagram em no máximo 2 cliques a partir de qualquer página do Connex CRM.
- **SC-002**: A partir da lista de clientes, um usuário consegue visualizar o conteúdo de um relatório semanal ou mensal específico em no máximo 3 cliques.
- **SC-003**: 100% das tentativas de acesso não autenticado às rotas de relatórios de Instagram (inclusive via manipulação de URL) são bloqueadas pelo backend, validado por testes de autenticação.
- **SC-004**: A lista de clientes exibe um estado visual (skeleton ou dados) em até 1 segundo percebido pelo usuário, mesmo quando há centenas de clientes cadastrados no Connex CRM.
- **SC-005**: Uma falha ao carregar os dados de um cliente específico não impede a visualização bem-sucedida dos relatórios de nenhum outro cliente, em 100% dos casos testados.
- **SC-006**: Usuários conseguem identificar visualmente qual postagem teve a melhor e qual teve a pior performance em um relatório semanal ou mensal sem precisar ler texto explicativo adicional.
- **SC-007**: 100% dos clientes sem relatórios de um determinado tipo (semanal, mensal, ou ambos) exibem uma mensagem de estado vazio específica, nunca uma tela em branco ou erro.

## Assumptions

- O Connex Insights é o único responsável por gerar, processar e persistir os dados dos relatórios de Instagram, incluindo toda a lógica de melhor/pior performance, ranking e cálculo de métricas; o Connex CRM apenas consulta e exibe esses dados já processados, tratando-os como registros persistidos, consultáveis e imutáveis do ponto de vista de regras de negócio.
- O Connex CRM não possui conceito de tenant; qualquer usuário autenticado pode visualizar todos os clientes cadastrados e seus relatórios de Instagram. A segmentação por tenant é um conceito interno exclusivo do Connex Insights, utilizado somente na geração dos relatórios, sem impacto na autorização de acesso dentro do CRM.
- A tab selecionada (Semanais/Mensais) é lembrada apenas durante a sessão ativa do usuário no navegador, não sendo persistida entre sessões ou dispositivos diferentes.
- O "indicador de existência de novos relatórios" refere-se a relatórios com período de referência mais recente do que a última vez que o usuário visualizou os relatórios daquele cliente.
- As semanas seguem o padrão de calendário já definido pelo processo de geração de relatórios do Connex Insights (incluindo como semanas que cruzam a virada do mês são atribuídas a um mês específico), sem necessidade de configuração adicional pelo usuário do CRM.
- Todos os usuários autenticados no Connex CRM têm o mesmo nível de acesso aos relatórios de Instagram de qualquer cliente cadastrado, sem granularidade adicional de permissão por papel/role nesta versão.
- A paginação é aplicada de forma consistente e obrigatória em todas as listagens (clientes, meses, semanas, postagens), independentemente da quantidade de itens disponíveis; o tamanho de página específico é definido na fase de planejamento técnico.
