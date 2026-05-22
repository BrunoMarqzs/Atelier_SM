# Atelier Sibele Marques

**Slogan:** Um toque de classe  
**Tipo:** Aplicação mobile-first para gerenciamento de atelier de costura  
**Stack:** React Native + Expo + TypeScript, FastAPI, PostgreSQL, Pytest

## 1. Visão de Produto

O Atelier Sibele Marques será construído como um produto premium para atendimento, agendamento e gestão de solicitações de costura. A experiência principal deve ser simples para clientes, que não precisam criar conta, e poderosa para administradores, que precisam controlar serviços, disponibilidade, pedidos, imagens, comentários e status.

O sistema não será tratado como CRUD. A arquitetura será orientada por fluxos de negócio:

- cliente informa nome e telefone;
- cliente escolhe serviço;
- cliente seleciona horário disponível;
- cliente envia imagens e observações;
- pedido entra como pendente ou em avaliação;
- administração avalia, comenta, aprova, recusa ou acompanha a execução;
- agenda impede duplicidade e respeita bloqueios de horário.

## 2. Decisões Técnicas

### Backend

O backend usará FastAPI por oferecer:

- documentação Swagger/OpenAPI automática;
- suporte forte a tipagem com Pydantic;
- boa performance para APIs REST;
- integração limpa com testes Pytest;
- organização adequada para arquitetura em camadas.

Camadas principais:

- `routes`: expor endpoints HTTP e controlar entrada/saída;
- `validators`: schemas Pydantic para requests, responses e validações;
- `services`: regras de negócio e orquestração;
- `repositories`: acesso a dados;
- `models`: entidades persistidas;
- `commands`: ações administrativas ou transacionais;
- `factories`: criação controlada de objetos complexos;
- `strategies`: variações de comportamento, como precificação;
- `observers`: reações a eventos de domínio;
- `mementos`: snapshots para histórico/restauração de estados relevantes;
- `utils`: configurações, logs, erros e helpers transversais;
- `tests`: testes automatizados.

### Banco de Dados

PostgreSQL será usado como banco relacional principal por ser robusto, confiável e adequado para regras de agenda, consultas administrativas e integridade de dados.

Princípios:

- índices para horários, status e telefone do cliente;
- restrições para impedir horários duplicados;
- relacionamento explícito entre pedido, serviço, cliente anônimo, imagens e comentários;
- status controlado por enum;
- histórico de alterações de status.

### Frontend Mobile

O frontend será React Native com Expo e TypeScript.

Motivos:

- excelente velocidade de desenvolvimento mobile;
- suporte multiplataforma;
- bom ecossistema para imagens, animações, calendário e formulários;
- fácil publicação futura;
- arquitetura componentizada.

O aplicativo será mobile-first, com visual refinado e linguagem de boutique premium. A tela inicial deve comunicar marca, elegância e confiança imediatamente.

## 3. Entidades de Dominio

### ClientProfile

Representa uma cliente sem login formal.

Campos previstos:

- `id`;
- `name`;
- `phone`;
- `created_at`;
- `updated_at`.

Regra:

- nome e telefone são obrigatórios antes de qualquer pedido;
- telefone deve ser normalizado para busca e contato.

### Service

Representa um serviço oferecido pelo atelier.

Campos previstos:

- `id`;
- `name`;
- `description`;
- `category`;
- `duration_minutes`;
- `price_type`;
- `fixed_price`;
- `is_active`;
- `highlighted`;
- `created_at`;
- `updated_at`.

Regras:

- `price_type` pode ser `fixed` ou `quote`;
- se for `fixed`, `fixed_price` é obrigatório;
- se for `quote`, o aplicativo mostra "valor sob avaliação";
- serviços inativos não aparecem para clientes.

### AvailabilitySlot

Representa horários disponíveis ou bloqueados.

Campos previstos:

- `id`;
- `starts_at`;
- `ends_at`;
- `status`;
- `reason`;
- `created_at`;
- `updated_at`.

Status previstos:

- `available`;
- `blocked`;
- `booked`.

Regras:

- horários bloqueados não podem ser agendados;
- horários ocupados não podem receber novo pedido;
- consultas de cliente mostram apenas horários disponíveis.

### AppointmentRequest

Representa a solicitação/pedido da cliente.

Campos previstos:

- `id`;
- `client_id`;
- `service_id`;
- `slot_id`;
- `status`;
- `notes`;
- `admin_comment`;
- `estimated_price`;
- `created_at`;
- `updated_at`.

Status previstos:

- `pending`;
- `under_review`;
- `approved`;
- `rejected`;
- `in_progress`;
- `completed`;
- `cancelled`.

Regras:

- pedido nasce como `pending`;
- serviços com valor sob avaliação podem ir para `under_review`;
- administrador pode aprovar, recusar, comentar e alterar status;
- transições inválidas devem ser bloqueadas.

### RequestImage

Representa imagens enviadas pela cliente.

Campos previstos:

- `id`;
- `request_id`;
- `storage_provider`;
- `url`;
- `public_id`;
- `created_at`.

Regras:

- upload inicial pode ser local;
- arquitetura deve permitir troca futura para Cloudinary sem alterar regra de negócio.

### AdminUser

Representa acesso administrativo por token.

Campos previstos:

- `id`;
- `name`;
- `token_hash`;
- `is_active`;
- `created_at`;
- `updated_at`.

Regras:

- rotas administrativas exigem token;
- token não deve ser armazenado em texto puro;
- logs não devem expor credenciais.

### StatusHistory

Histórico de mudanças de status do pedido.

Campos previstos:

- `id`;
- `request_id`;
- `from_status`;
- `to_status`;
- `comment`;
- `changed_by`;
- `created_at`.

Uso:

- auditoria administrativa;
- suporte ao padrao Memento.

## 4. Padrões de Projeto

### Facade

Uso: simplificar operações de alto nível.

Exemplo:

- `BookingFacade` recebe dados da cliente, serviço, horário, imagens e observações;
- orquestra validação, criação do perfil, reserva do horário, criação do pedido, upload e notificação/eventos.

Motivo:

- a tela cliente não precisa conhecer várias APIs internas;
- reduz acoplamento entre rotas e serviços.

### Repository

Uso: isolar persistência.

Exemplos:

- `ServiceRepository`;
- `AvailabilityRepository`;
- `AppointmentRequestRepository`;
- `ClientRepository`;
- `StatusHistoryRepository`.

Motivo:

- services não devem conter SQL direto;
- facilita testes com repositórios fake ou banco de teste.

### Factory

Uso: criar entidades com invariantes corretas.

Exemplos:

- `AppointmentRequestFactory`;
- `ServiceFactory`;
- `ClientProfileFactory`.

Motivo:

- evita criar objetos incompletos;
- centraliza defaults como status inicial `pending`.

### Strategy

Uso: comportamento variável.

Exemplos:

- `FixedPriceStrategy`;
- `QuotePriceStrategy`;
- `LocalImageStorageStrategy`;
- `CloudinaryImageStorageStrategy`.

Motivo:

- precificação e upload podem variar sem espalhar condicionais.

### Observer

Uso: reagir a eventos de domínio.

Eventos previstos:

- `AppointmentRequested`;
- `AppointmentApproved`;
- `AppointmentRejected`;
- `StatusChanged`.

Observadores previstos:

- registrar logs;
- criar histórico;
- preparar notificações futuras.

Motivo:

- mantém services focados no caso de uso principal.

### Command

Uso: encapsular ações administrativas.

Comandos previstos:

- `ApproveRequestCommand`;
- `RejectRequestCommand`;
- `BlockSlotCommand`;
- `CreateServiceCommand`;
- `UpdateServiceCommand`;
- `ChangeRequestStatusCommand`.

Motivo:

- ações ficam testáveis, auditáveis e reutilizáveis;
- comandos podem validar permissão e transição de estado.

### Memento

Uso: salvar snapshots de estado antes de mudanças importantes.

Aplicação:

- antes de alterar status de pedido;
- antes de alterar horário associado;
- antes de edições administrativas relevantes.

Motivo:

- suporta histórico confiável e eventual restauração;
- deixa rastreabilidade profissional.

## 5. Fluxos de Telas

### Público / Cliente

1. **Home**
   - marca: Atelier Sibele Marques;
   - slogan: Um toque de classe;
   - serviços em destaque;
   - chamadas: Entrar como Cliente, Entrar como Administrador.

2. **Identificação da Cliente**
   - nome;
   - telefone;
   - validação elegante e clara.

3. **Seleção de Serviço**
   - cards premium;
   - categoria;
   - duração;
   - preço fixo ou "valor sob avaliação".

4. **Agenda**
   - calendário visual;
   - horários disponíveis;
   - estados vazios refinados;
   - bloqueio de horários já ocupados.

5. **Detalhes do Pedido**
   - upload de imagens;
   - observações;
   - resumo do serviço e horário.

6. **Confirmação**
   - feedback visual;
   - número/código da solicitação;
   - instrução de acompanhamento por contato do atelier.

### Administrador

1. **Login Administrativo**
   - token administrativo;
   - experiência discreta e segura.

2. **Dashboard**
   - resumo de pedidos;
   - próximos horários;
   - pendências de avaliação;
   - atalhos para agenda e serviços.

3. **Pedidos**
   - lista filtrável por status;
   - detalhe com cliente, serviço, imagens e observações;
   - ações de aprovar, recusar, comentar e alterar status.

4. **Agenda**
   - calendário administrativo;
   - bloquear horário;
   - liberar horário;
   - visualizar pedidos agendados.

5. **Serviços**
   - criar, editar, remover/inativar;
   - definir preço fixo ou sob avaliação;
   - marcar como destaque.

## 6. Estrutura de Pastas

```text
Atelier_SM/
  backend/
    app/
      routes/
      services/
      repositories/
      models/
      validators/
      commands/
      factories/
      strategies/
      observers/
      mementos/
      utils/
      config/
    tests/
    migrations/
    pyproject.toml
    README.md
    .env.example

  frontend/
    src/
      screens/
        public/
        client/
        admin/
      components/
        common/
        booking/
        admin/
      hooks/
      services/
      navigation/
      theme/
      assets/
      animations/
      context/
      types/
      utils/
    app.json
    package.json
    tsconfig.json
    README.md

  docs/
    FASE_1_ARQUITETURA.md
```

## 7. Contratos de API Previstos

### Públicos

- `GET /api/services/highlighted`
- `GET /api/services`
- `GET /api/availability`
- `POST /api/requests`
- `POST /api/requests/{request_id}/images`

### Administrativos

- `GET /api/admin/dashboard`
- `GET /api/admin/requests`
- `GET /api/admin/requests/{request_id}`
- `PATCH /api/admin/requests/{request_id}/status`
- `POST /api/admin/requests/{request_id}/comments`
- `POST /api/admin/services`
- `PATCH /api/admin/services/{service_id}`
- `DELETE /api/admin/services/{service_id}`
- `POST /api/admin/availability/block`
- `POST /api/admin/availability/release`

## 8. UX/UI Direcional

### Linguagem Visual

A interface deve transmitir atelier premium, cuidado manual, moda e acolhimento.

Direção:

- fundo claro com branco quente;
- acentos em rose gold;
- preto elegante para textos principais;
- nude e pastel para áreas suaves;
- sombras macias;
- cantos moderados;
- tipografia elegante;
- microinterações discretas.

### Componentes Base

- `PremiumButton`;
- `ServiceCard`;
- `DatePickerStrip`;
- `TimeSlotPill`;
- `ImageUploadTile`;
- `StatusBadge`;
- `AdminMetric`;
- `RequestPreviewCard`;
- `ElegantInput`;
- `ScreenHeader`.

### Animações

Uso previsto:

- transições suaves entre telas;
- entrada sutil de cards;
- feedback de seleção de horários;
- carregamento refinado;
- confirmação com animação leve.

## 9. Regras de Qualidade

- toda rota deve validar entrada com Pydantic;
- services concentram regras de negócio;
- repositories concentram persistência;
- nenhuma rota administrativa funciona sem token;
- logs devem registrar eventos importantes sem vazar dados sensíveis;
- testes cobrem regras de agenda, status, precificação e criação de pedido;
- UI deve ser testada visualmente em viewport mobile;
- nomes devem ser claros e consistentes;
- comentários devem ser raros e úteis.

## 10. Roadmap por Fases

### Fase 2 - Backend Base

- criar estrutura FastAPI;
- configurar settings, logs e erros;
- criar modelos iniciais;
- criar validators;
- criar repositories;
- criar services;
- criar factories, strategies e facade inicial;
- preparar testes Pytest.

### Fase 3 - Frontend Base

- criar app Expo TypeScript;
- configurar tema premium;
- criar navegação;
- criar componentes base;
- criar telas iniciais com mock de dados;
- validar responsividade mobile.

### Fase 4 - Funcionalidades

- conectar frontend ao backend;
- fluxo completo de cliente;
- upload de imagens;
- dashboard admin;
- gerenciamento de pedidos;
- gerenciamento de agenda;
- gerenciamento de serviços.

### Fase 5 - Qualidade Final

- testes automatizados;
- refatoração;
- documentação;
- Swagger revisado;
- refinamento visual;
- revisão de acessibilidade;
- preparação para portfólio.

## 11. Decisão de Implementação Inicial

A primeira implementação deve priorizar o backend base com entidades e regras centrais, porque a agenda e os pedidos são o núcleo de confiabilidade do produto. Em seguida, o frontend pode nascer com uma experiência visual forte já alinhada aos contratos de API.

Ordem recomendada:

1. Backend base e domínio.
2. Testes das regras críticas.
3. Frontend shell premium.
4. Fluxo cliente.
5. Admin.
6. Polimento visual e documentação.
