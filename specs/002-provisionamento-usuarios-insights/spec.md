# Feature Specification: Provisionamento de Usuários do Connex Insights via CRM

**Feature Branch**: `002-provisionamento-usuarios-insights`

**Created**: 2026-07-22

**Status**: Draft

**Input**: User description: "Como um usuário admin do CRM, quero uma tela de cadastro de usuários para o Connex Insights. Na sidebar, irá ser criada uma nova aba (Aplicações) que irá direcionar para uma página nova (/aplicacoes). Lá irá conter todas as aplicações, automações, entre outros, que a Connex é dona. Ao acessar a página, irei selecionar a aplicação correspondente que desejo acessar. No caso da Connex Insights, deve haver um pequeno dashboard contendo quantidade de usuários e quantidade de tenants (clientes). Deve haver um botão de criação de usuário/acesso, lá irei preencher um formulário contendo o nome e email do usuário, login e tenant. A opção de tenant deve ser uma lista com todos os clientes da Connex, atualmente temos Zeh Motoca e ICON Fitbrands. O tenant obrigatoriamente deve estar associado ao usuário. Ao preencher o formulário e criar o usuário, deve ser disponibilizada uma senha temporária, que o usuário usará somente para o primeiro acesso. O fluxo deve ser: Criar o usuário pelo CRM -> fornecer o acesso e senha ao usuário -> usuário loga e acessa a plataforma Connex Insights."

**Depende de (repositório externo `connex-insights`)**: [002-first-time-account-activation](../../../connex-insights/specs/002-first-time-account-activation/spec.md) — define o fluxo de ativação de conta com senha temporária que o usuário provisionado por esta feature deverá seguir no primeiro acesso à Connex Insights.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Acessar o hub de Aplicações (Priority: P1)

Como admin do CRM, quero uma nova aba "Aplicações" na barra lateral que me leve a uma página central listando todos os produtos e automações de propriedade da Connex, para que eu possa escolher qual aplicação administrar.

**Por que esta prioridade**: É o ponto de entrada obrigatório para todo o fluxo; sem o hub, não há como chegar à tela do Connex Insights.

**Independent Test**: Pode ser testada fazendo login como admin, clicando em "Aplicações" na sidebar e verificando que a página `/aplicacoes` carrega listando ao menos o card "Connex Insights".

**Acceptance Scenarios**:

1. **Given** estou autenticado como admin do CRM, **When** clico em "Aplicações" na sidebar, **Then** sou levado à página `/aplicacoes`.
2. **Given** estou na página `/aplicacoes`, **When** a página carrega, **Then** vejo um card "Connex Insights" clicável e demais cards de aplicações/automações futuras marcados como "Em breve" (não clicáveis).
3. **Given** sou um usuário com papel diferente de Admin, **When** tento acessar `/aplicacoes` diretamente pela URL, **Then** o acesso é negado e sou redirecionado para fora da página.

---

### User Story 2 — Visualizar o painel do Connex Insights (Priority: P1)

Como admin do CRM, quero, ao selecionar "Connex Insights" no hub, ver um pequeno dashboard com a quantidade total de usuários e de tenants (clientes) da plataforma, para entender rapidamente o tamanho da base antes de criar um novo acesso.

**Por que esta prioridade**: Fornece contexto imediato e é a tela onde a ação principal (criar usuário) é iniciada.

**Independent Test**: Pode ser testada acessando `/aplicacoes/connex-insights` (ou rota equivalente) e verificando que os contadores de usuários e tenants exibidos correspondem aos dados reais da Connex Insights.

**Acceptance Scenarios**:

1. **Given** seleciono "Connex Insights" no hub de Aplicações, **When** a tela carrega, **Then** vejo dois indicadores: quantidade total de usuários e quantidade total de tenants da Connex Insights.
2. **Given** a tela do Connex Insights está carregada, **When** observo a área principal, **Then** vejo um botão "Criar usuário" em destaque.
3. **Given** a busca pelos contadores falha (indisponibilidade da Connex Insights), **When** a tela carrega, **Then** um estado de erro amigável é exibido nos indicadores, sem quebrar o restante da tela.

---

### User Story 3 — Criar um novo acesso de usuário para o Connex Insights (Priority: P1)

Como admin do CRM, quero preencher um formulário com nome, e-mail, login e tenant, e ao confirmar receber uma senha temporária, para provisionar um novo acesso à Connex Insights que eu possa entregar ao usuário final.

**Por que esta prioridade**: É o núcleo de valor da feature — sem esta capacidade, o hub de Aplicações não resolve o problema de negócio (provisionar acesso sem depender de intervenção manual no banco de dados).

**Independent Test**: Pode ser testada clicando em "Criar usuário", preenchendo todos os campos obrigatórios com um tenant válido, confirmando, e verificando que (a) uma senha temporária é exibida na tela uma única vez e (b) o novo usuário passa a existir na Connex Insights com status inicial `INACTIVE`.

**Acceptance Scenarios**:

1. **Given** clico em "Criar usuário", **When** o formulário abre, **Then** vejo os campos obrigatórios: nome, e-mail, login e tenant (seleção obrigatória a partir de uma lista).
2. **Given** a lista de tenants é exibida no formulário, **When** abro o seletor de tenant, **Then** vejo todos os tenants existentes na Connex Insights (atualmente "Zeh Motoca" e "ICON Fitbrands").
3. **Given** preencho nome, e-mail, login e seleciono um tenant válido, **When** confirmo a criação, **Then** o sistema provisiona a conta na Connex Insights com status `INACTIVE` e exibe uma senha temporária gerada automaticamente, apresentada uma única vez na tela.
4. **Given** tento confirmar o formulário sem preencher algum campo obrigatório ou sem selecionar um tenant, **When** clico em confirmar, **Then** o envio é bloqueado e os campos pendentes são indicados.
5. **Given** informo um e-mail ou login que já existe na Connex Insights, **When** confirmo a criação, **Then** vejo uma mensagem de erro amigável informando que o e-mail/login já está em uso, sem detalhes internos, e nenhum usuário duplicado é criado.
6. **Given** o usuário foi criado com sucesso e a senha temporária foi exibida, **When** fecho ou navego para fora da tela de confirmação, **Then** a senha temporária deixa de ser exibida em qualquer tela do CRM (não é persistida em texto plano para consulta posterior).

---

### Edge Cases

- O que acontece se a conexão com a Connex Insights estiver indisponível no momento da criação? → A criação é bloqueada, nenhum registro parcial é deixado, e uma mensagem de erro amigável é exibida ao admin.
- Como o sistema se comporta se dois admins tentarem criar o mesmo e-mail/login simultaneamente? → Apenas a primeira criação bem-sucedida deve prevalecer; a segunda deve falhar com mensagem de "já em uso".
- O que acontece se o admin atualizar/recarregar a página de confirmação após a criação? → A senha temporária não pode ser recuperada novamente pela tela; o admin precisa criar um novo acesso ou seguir o processo de suporte já existente na Connex Insights caso a senha não tenha sido entregue.
- Como o formulário se comporta se a lista de tenants não puder ser carregada? → O botão "Criar usuário" fica desabilitado (ou o campo de tenant exibe estado de erro) até que a lista seja carregada com sucesso; a criação não pode ocorrer sem um tenant real selecionado.
- O que acontece se um novo tenant for adicionado à Connex Insights depois desta feature estar em produção? → Ele deve aparecer automaticamente na lista de seleção, sem necessidade de alteração de código no CRM.

## Requirements *(mandatory)*

### Functional Requirements

#### Hub de Aplicações

- **FR-001**: O sistema DEVE exibir uma nova entrada "Aplicações" na navegação principal do CRM.
- **FR-002**: A entrada "Aplicações" DEVE direcionar para uma página `/aplicacoes` contendo a lista de aplicações e automações de propriedade da Connex.
- **FR-003**: A página `/aplicacoes` DEVE exibir "Connex Insights" como uma aplicação selecionável; demais aplicações/automações que ainda não possuem integração DEVEM ser exibidas como indisponíveis ("Em breve"), sem ação associada.
- **FR-004**: Somente usuários com papel `Admin` DEVEM acessar a página `/aplicacoes` e suas subpáginas; demais papéis (`Gestor`, `Analista`) DEVEM ter o acesso negado.

#### Painel do Connex Insights

- **FR-005**: Ao selecionar "Connex Insights", o sistema DEVE exibir a quantidade total de usuários e a quantidade total de tenants (clientes) cadastrados na Connex Insights.
- **FR-006**: Os indicadores de usuários e tenants DEVEM refletir dados reais da Connex Insights (não valores fixos ou simulados).
- **FR-007**: A tela do Connex Insights DEVE exibir um botão de destaque para iniciar a criação de um novo usuário/acesso.

#### Criação de usuário/acesso

- **FR-008**: O formulário de criação de usuário DEVE conter os campos obrigatórios: nome, e-mail, login e tenant.
- **FR-009**: O campo "login" DEVE ser um identificador de acesso distinto do e-mail de contato informado.
- **FR-010**: O campo "tenant" DEVE ser uma seleção obrigatória a partir da lista de tenants existentes na Connex Insights (não texto livre); o formulário NÃO DEVE permitir submissão sem um tenant selecionado.
- **FR-011**: A lista de tenants exibida no formulário DEVE ser obtida da Connex Insights e refletir automaticamente novos tenants cadastrados lá, sem necessidade de alteração de código no CRM.
- **FR-012**: Todo usuário criado por esta feature DEVE ser associado a exatamente um tenant.
- **FR-013**: Ao confirmar o formulário com dados válidos, o sistema DEVE provisionar a conta correspondente na Connex Insights com status inicial `INACTIVE` e uma senha temporária gerada automaticamente pelo sistema (não escolhida pelo admin).
- **FR-014**: A senha temporária DEVE ser exibida ao admin uma única vez, imediatamente após a criação, para que seja copiada/entregue ao usuário final por um canal definido pelo processo interno da Connex (fora do sistema).
- **FR-015**: A senha temporária NÃO DEVE ser persistida em texto plano em nenhuma tela ou registro consultável posteriormente pelo CRM.
- **FR-016**: O sistema DEVE validar que e-mail e login informados são únicos na Connex Insights antes de concluir a criação; em caso de conflito, a criação DEVE ser rejeitada com mensagem amigável, sem revelar detalhes internos.
- **FR-017**: Falhas de comunicação com a Connex Insights durante a criação DEVEM impedir a criação parcial do usuário (nenhum registro incompleto) e DEVEM ser comunicadas ao admin com mensagem amigável.
- **FR-018**: Todos os campos obrigatórios do formulário DEVEM ser validados tanto no cliente quanto no servidor antes da criação.

### Security & Access Control

- **SEC-001**: Toda comunicação do CRM com a Connex Insights para leitura de indicadores, leitura de tenants e criação de usuários DEVE ocorrer exclusivamente em contexto de servidor, nunca expondo credenciais de acesso à Connex Insights ao cliente (navegador).
- **SEC-002**: Apenas usuários com papel `Admin` no CRM DEVEM conseguir acionar a criação de usuários na Connex Insights.
- **SEC-003**: Toda entrada do formulário de criação DEVE ser validada via schema antes de qualquer chamada à Connex Insights.
- **SEC-004**: Mensagens de erro exibidas ao admin NÃO DEVEM revelar detalhes de implementação, credenciais ou informações de outros tenants.

### Observability

- **OBS-001**: Falhas na comunicação com a Connex Insights (leitura de indicadores, tenants ou criação de usuário) DEVEM ser registradas em log com contexto suficiente para diagnóstico (sem incluir a senha temporária).
- **OBS-002**: A criação de um novo usuário/acesso é um evento de negócio relevante e DEVE poder ser auditada (quem criou, quando, para qual tenant), sem registrar a senha temporária em texto plano.

### Key Entities

- **Aplicação**: Item do catálogo exibido no hub `/aplicacoes`. Atributos: nome, descrição/ícone, disponibilidade (disponível vs. "em breve").
- **Painel do Connex Insights**: Visão somente-leitura com dois indicadores agregados (total de usuários, total de tenants) da Connex Insights.
- **Tenant (Connex Insights)**: Referência somente-leitura a um tenant/cliente existente na Connex Insights (identificador e nome exibido, ex.: "Zeh Motoca", "ICON Fitbrands"). Não é criado, editado ou removido por esta feature.
- **Conta de usuário provisionada**: Representa o novo acesso criado para a Connex Insights. Atributos: nome, e-mail, login, tenant associado (exatamente um), status inicial `INACTIVE`, senha temporária (efêmera, exibida uma única vez e não recuperável posteriormente pelo CRM).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um admin do CRM consegue localizar o hub de Aplicações e chegar à tela do Connex Insights em no máximo 2 cliques a partir de qualquer página do CRM.
- **SC-002**: Um admin consegue concluir a criação de um novo acesso (do clique em "Criar usuário" até a exibição da senha temporária) em menos de 1 minuto, assumindo dados válidos em mãos.
- **SC-003**: 100% das tentativas de criação com e-mail ou login já existentes na Connex Insights são rejeitadas com mensagem clara, sem gerar contas duplicadas.
- **SC-004**: 100% dos usuários criados por esta feature iniciam com status `INACTIVE` e uma senha temporária válida, consistente com o fluxo de ativação já existente na Connex Insights.
- **SC-005**: 100% das tentativas de acesso ao hub de Aplicações por papéis diferentes de `Admin` são bloqueadas.
- **SC-006**: Os indicadores de quantidade de usuários e tenants exibidos no painel do Connex Insights refletem o estado real da plataforma em até 3 segundos após o carregamento da tela.

## Assumptions

- O CRM se conecta diretamente ao ambiente (Supabase) da Connex Insights, usando credenciais de servidor próprias do CRM, para ler indicadores/tenants e para provisionar o novo usuário — não é necessário construir uma nova API pública na Connex Insights para esta feature.
- A entrega da senha temporária ao usuário final ocorre fora do sistema (o admin copia/comunica manualmente); não há envio automático de e-mail/SMS nesta feature.
- A lista de tenants exibida no formulário é lida diretamente da base da Connex Insights (não é uma lista fixa no código do CRM); os tenants atualmente existentes são "Zeh Motoca" e "ICON Fitbrands".
- O papel `Admin`, já existente no modelo de usuários do CRM (`lib/types.ts`), é usado como controle de acesso a esta feature; não é necessário criar um novo papel.
- Outras aplicações/automações da Connex além do Connex Insights ainda não possuem integração definida e são apresentadas apenas como itens "em breve" no hub, sem funcionalidade nesta feature.
- O campo "login" é um identificador de acesso distinto do e-mail de contato do usuário — **esta é uma decisão de escopo relevante, detalhada na seção "Impacto Cross-Repo" abaixo**, pois a Connex Insights hoje autentica exclusivamente por e-mail.

## Out of Scope

- Edição, suspensão, exclusão ou redefinição de senha de usuários já existentes na Connex Insights a partir do CRM.
- Reenvio ou regeneração de senha temporária para acessos já criados.
- Envio automático de e-mail, SMS ou notificação com as credenciais ao usuário final.
- Criação, edição ou exclusão de tenants da Connex Insights a partir do CRM.
- Implementação de outras aplicações/automações no hub além do card "Connex Insights".
- Alteração do fluxo de login e ativação de conta da Connex Insights em si (specs 001-user-auth e 002-first-time-account-activation daquele repositório) — ver dependência cross-repo abaixo.

## Impacto Cross-Repo (Connex Insights)

Esta feature introduz um requisito que **altera uma premissa das especificações existentes da Connex Insights**:

| Item | Comportamento atual (connex-insights) | Novo comportamento necessário |
|------|----------------------------------------|--------------------------------|
| Identificador de login ([001-user-auth](../../../connex-insights/specs/001-user-auth/spec.md), [002-first-time-account-activation](../../../connex-insights/specs/002-first-time-account-activation/spec.md)) | Autenticação exclusivamente por e-mail + senha | Autenticação por "login" (identificador distinto do e-mail) + senha |

- Esta especificação (connex-crm) **cria e entrega** o "login" ao provisionar a conta, mas **não implementa** a mudança no fluxo de autenticação da Connex Insights.
- Recomenda-se abrir uma feature complementar no repositório `connex-insights` para estender as specs 001 e 002 a fim de aceitar "login" como identificador de autenticação (mantendo compatibilidade com o fluxo de ativação de conta já especificado em 002).
- Até que essa feature complementar seja implementada na Connex Insights, contas criadas por esta feature podem não conseguir efetuar login com o "login" informado — esta especificação assume que a extensão do lado da Connex Insights será tratada como dependência bloqueante para o *release* completo do fluxo ponta a ponta, ainda que a construção da tela no CRM possa avançar em paralelo.
