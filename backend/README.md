# Backend - Atelier Sibele Marques

API FastAPI para agenda, serviços e pedidos do Atelier Sibele Marques.

## Arquitetura

O backend segue arquitetura em camadas:

- `routes`: endpoints HTTP;
- `validators`: schemas Pydantic;
- `services`: regras de negócio;
- `repositories`: persistência;
- `models`: modelos SQLAlchemy;
- `commands`: ações operacionais e administrativas;
- `factories`: criação de entidades;
- `strategies`: precificação e armazenamento;
- `observers`: eventos de domínio;
- `mementos`: snapshots auditáveis;
- `utils`: erros, segurança, senhas e logs.

## Setup Local

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
copy .env.example .env
```

## Banco de Dados

Crie o banco PostgreSQL apontado em `DATABASE_URL` e rode:

```powershell
.\.venv\Scripts\python.exe -m app.commands.setup_database
```

Esse comando executa:

1. `alembic upgrade head`;
2. seed inicial de admin;
3. seed inicial de serviços;
4. seed de horários comerciais pelos próximos 6 meses.

Comandos separados:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.commands.seed_database
```

## Servidor

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Swagger/OpenAPI:

```text
http://localhost:8000/docs
```

Healthcheck:

```text
GET /health
```

## Ambientes

`APP_ENV` aceita:

- `development`;
- `staging`;
- `production`.

Resolução de banco:

- `development`: usa `DATABASE_URL`;
- `staging`: usa `STAGING_DATABASE_URL` quando definido;
- `production`: usa `PRODUCTION_DATABASE_URL` quando definido.

## Variáveis de Ambiente

Use `.env.example` como base.

Campos principais:

- `DATABASE_URL`: conexão PostgreSQL async de desenvolvimento;
- `STAGING_DATABASE_URL`: conexão PostgreSQL async de homologação;
- `PRODUCTION_DATABASE_URL`: conexão PostgreSQL async de produção;
- `JWT_SECRET_KEY`: chave de assinatura dos tokens administrativos;
- `SEED_ADMIN_EMAIL`: e-mail do admin inicial;
- `SEED_ADMIN_PASSWORD`: senha inicial que será usada pela autenticação da Fase 3;
- `UPLOAD_PROVIDER`: `local` inicialmente;
- `LOCAL_UPLOAD_DIR`: pasta local de imagens;
- `PUBLIC_UPLOAD_BASE_URL`: URL pública dos uploads.
- `MAX_UPLOAD_SIZE_BYTES`: limite máximo por imagem;
- `ALLOWED_IMAGE_MIME_TYPES`: formatos aceitos no upload.

## Rotas Públicas

- `GET /api/services`
- `GET /api/services/highlighted`
- `GET /api/availability`
- `POST /api/requests`
- `POST /api/requests/{request_id}/images`

## Autenticação Administrativa

Login:

```text
POST /api/auth/admin/login
```

O retorno contém `access_token` e `refresh_token`. Rotas administrativas exigem:

```text
Authorization: Bearer <access_token>
```

Rotas de sessão:

- `POST /api/auth/admin/login`
- `POST /api/auth/admin/refresh`
- `POST /api/auth/admin/logout`
- `GET /api/auth/admin/me`

## Rotas Administrativas

- `GET /api/admin/dashboard`
- `GET /api/admin/requests`
- `GET /api/admin/requests/{request_id}`
- `GET /api/admin/requests/{request_id}/timeline`
- `PATCH /api/admin/requests/{request_id}/status`
- `PATCH /api/admin/requests/{request_id}/estimate`
- `PATCH /api/admin/requests/{request_id}/reschedule`
- `POST /api/admin/requests/{request_id}/comments`
- `GET /api/admin/services`
- `POST /api/admin/services`
- `PATCH /api/admin/services/{service_id}`
- `DELETE /api/admin/services/{service_id}`
- `POST /api/admin/availability`
- `POST /api/admin/availability/block`
- `POST /api/admin/availability/release`
- `POST /api/admin/availability/{slot_id}/release`

## Testes

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest
```
