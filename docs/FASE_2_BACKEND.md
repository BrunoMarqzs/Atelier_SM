# Fase 2 - Backend Base

## Objetivo

Construir a base profissional do backend do Atelier Sibele Marques com FastAPI, camadas claras, entidades de domínio, repositories, services e padrões de projeto aplicados de forma útil.

## Entregas Implementadas

### Estrutura

```text
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
```

### Configuração

- `pyproject.toml` com dependências principais;
- `.env.example` com variáveis do ambiente;
- settings via `pydantic-settings`;
- conexão async com SQLAlchemy;
- base para PostgreSQL;
- configuração Alembic inicial;
- logs padronizados;
- tratamento de erros de domínio.

### Modelos

- `ClientProfile`;
- `Service`;
- `AvailabilitySlot`;
- `AppointmentRequest`;
- `RequestImage`;
- `StatusHistory`.

### Enums

- `PriceType`;
- `AvailabilityStatus`;
- `AppointmentStatus`;
- `StorageProvider`.

### Validators

- identidade de cliente;
- serviços;
- disponibilidade;
- criação de pedido;
- alteração de status;
- comentários administrativos.

### Repositories

- `ClientRepository`;
- `ServiceRepository`;
- `AvailabilityRepository`;
- `AppointmentRequestRepository`;
- `StatusHistoryRepository`.

### Services

- `ClientService`;
- `ServiceService`;
- `AvailabilityService`;
- `AppointmentRequestService`;
- `StatusTransitionService`;
- `BookingFacade`.

### Padrões Aplicados

- **Facade:** `BookingFacade` orquestra o fluxo público de solicitação;
- **Repository:** camada de persistência isolada;
- **Factory:** criação consistente de cliente, serviço e pedido;
- **Strategy:** precificação e armazenamento local de imagens;
- **Observer:** criação de histórico a partir de evento de status;
- **Command:** ações administrativas como mudar status e bloquear horário;
- **Memento:** snapshot de pedido antes de alterações relevantes.

### Rotas Públicas

- `GET /api/services`
- `GET /api/services/highlighted`
- `GET /api/availability`
- `POST /api/requests`
- `POST /api/requests/{request_id}/images`

### Rotas Administrativas

Originalmente protegidas por `x-admin-token`; a evolução de produção substituiu esse mecanismo por `Authorization: Bearer`.

- `GET /api/admin/dashboard`
- `GET /api/admin/requests`
- `GET /api/admin/requests/{request_id}`
- `PATCH /api/admin/requests/{request_id}/status`
- `POST /api/admin/requests/{request_id}/comments`
- `GET /api/admin/services`
- `POST /api/admin/services`
- `PATCH /api/admin/services/{service_id}`
- `DELETE /api/admin/services/{service_id}`
- `POST /api/admin/availability`
- `POST /api/admin/availability/block`
- `POST /api/admin/availability/{slot_id}/release`

### Testes Criados

- validação de telefone;
- regras de preço fixo e sob avaliação;
- transições válidas e inválidas de status.

## Bloqueio de Ambiente

Não foi possível executar `python`, `pytest` ou `git` porque esses comandos não estavam disponíveis no PATH do ambiente naquele momento.

Com Python instalado, a validação esperada é:

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
pytest
uvicorn app.main:app --reload
```

## Próxima Fase

A Fase 3 deve criar o frontend mobile com Expo, TypeScript, navegação, tema premium, componentes base e telas iniciais usando contratos preparados pelo backend.
