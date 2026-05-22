# Migrations

Pasta de migrações Alembic.

Depois de configurar PostgreSQL e instalar dependências:

```powershell
cd backend
alembic revision --autogenerate -m "initial schema"
alembic upgrade head
```
