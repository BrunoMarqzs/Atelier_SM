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

## PostgreSQL Supabase

O backend usa SQLAlchemy assíncrono com `asyncpg`. Para Supabase, a URL precisa usar o driver:

```env
DATABASE_URL=postgresql+asyncpg://USUARIO:SENHA_URL_ENCODED@HOST:PORTA/postgres?sslmode=require
```

Recomendações:

- Prefira a conexão direta do Supabase para migrations Alembic: host `db.<project-ref>.supabase.co`, porta `5432`.
- Use o transaction pooler apenas para runtime quando necessário: host `*.pooler.supabase.com`, porta `6543`.
- Se usar transaction pooler com `asyncpg`, adicione `prepared_statement_cache_size=0`.
- Se a senha tiver caracteres especiais como `@`, `#`, `/`, `:`, `%` ou espaço, aplique URL encode antes de colar no `.env`.
- O parâmetro `sslmode=require` pode permanecer na URL; o projeto converte isso internamente para SSL compatível com `asyncpg`.

Exemplo com conexão direta:

```env
DATABASE_URL=postgresql+asyncpg://postgres:SENHA_URL_ENCODED@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require
```

Exemplo com transaction pooler:

```env
DATABASE_URL=postgresql+asyncpg://postgres.PROJECT_REF:SENHA_URL_ENCODED@aws-0-REGION.pooler.supabase.com:6543/postgres?sslmode=require&prepared_statement_cache_size=0
```

Depois de salvar o `.env`, rode:

```powershell
cd C:\Users\bruno\OneDrive\Documentos\Atelier_SM\backend
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m app.commands.seed_database
```

Para rodar tudo em um passo:

```powershell
.\.venv\Scripts\python.exe -m app.commands.setup_database
```

## Boot/Deploy de Produção

O projeto possui um comando operacional idempotente para preparar o backend antes de subir uma versão nova:

```powershell
.\.venv\Scripts\python.exe -m app.commands.deploy_bootstrap
```

Esse comando:

1. valida variáveis críticas do ambiente;
2. testa a conexão com o PostgreSQL com novas tentativas;
3. executa `alembic upgrade head`;
4. sincroniza admin inicial, serviços iniciais e agenda dos próximos 6 meses.

Para apenas validar ambiente e banco:

```powershell
.\.venv\Scripts\python.exe -m app.commands.deploy_bootstrap --check-only
```

Para rodar somente migrations:

```powershell
.\.venv\Scripts\python.exe -m app.commands.deploy_bootstrap --migrate-only
```

Para rodar somente seeds:

```powershell
.\.venv\Scripts\python.exe -m app.commands.deploy_bootstrap --seed-only
```

### Render Free

No plano Free, o campo `Pre-Deploy Command` pode não estar disponível. Nesse caso, use um destes caminhos:

1. abrir o **Shell** do serviço no Render e rodar:

```bash
python -m app.commands.deploy_bootstrap
```

2. quando houver uma migration nova, trocar temporariamente o **Build Command** para:

```bash
pip install -e . && python -m app.commands.deploy_bootstrap --migrate-only
```

Depois do deploy bem-sucedido, volte o **Build Command** para:

```bash
pip install -e .
```

Evite rodar migrations automaticamente dentro do startup normal da API. O servidor deve iniciar com:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
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
