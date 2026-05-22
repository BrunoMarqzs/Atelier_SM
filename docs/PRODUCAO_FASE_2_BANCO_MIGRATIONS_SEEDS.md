# Produção - Fase 2: Banco, migrations e seeds

## Decisão arquitetural

A camada de banco passa a ser versionada por Alembic. O schema deixa de depender de criação manual ou comportamento implícito do SQLAlchemy e passa a ter uma migration inicial reproduzível, com tabelas, enums, índices e chaves estrangeiras.

## Implementações

- criada migration inicial `20260519_0001_initial_schema`;
- adicionada tabela `admin_users` para preparar a autenticação real da Fase 3;
- adicionados índices para consultas frequentes de agenda, pedidos, cliente, serviços e status;
- adicionada resolução de banco por ambiente:
  - `development` usa `DATABASE_URL`;
  - `staging` usa `STAGING_DATABASE_URL` quando definido;
  - `production` usa `PRODUCTION_DATABASE_URL` quando definido;
- criados seeds idempotentes para:
  - admin inicial;
  - serviços iniciais;
  - horários comerciais de 09:00 às 18:00 por 6 meses;
- criado comando de setup completo para rodar migrations e seeds em sequência.

## Comandos

Rodar migrations:

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Rodar seeds:

```powershell
cd backend
.\.venv\Scripts\python.exe -m app.commands.seed_database
```

Setup completo:

```powershell
cd backend
.\.venv\Scripts\python.exe -m app.commands.setup_database
```

## Variáveis de ambiente

Campos novos:

- `STAGING_DATABASE_URL`;
- `PRODUCTION_DATABASE_URL`;
- `SEED_ADMIN_NAME`;
- `SEED_ADMIN_EMAIL`;
- `SEED_ADMIN_PASSWORD`.

## Impactos

O projeto agora consegue reproduzir o schema de banco em qualquer ambiente. Isso reduz risco de inconsistência entre desenvolvimento, staging e produção, e prepara o backend para deploy com PostgreSQL real.

## Riscos controlados

- a senha seedada do admin ainda não é usada por login real; ela prepara o schema para a Fase 3;
- as seeds de agenda criam horários padrão, mas regras avançadas de disponibilidade continuam evoluindo na Fase 5;
- o setup exige PostgreSQL acessível pela `DATABASE_URL` ou pela URL do ambiente selecionado.

## Próximos passos

1. Implementar autenticação administrativa real com JWT.
2. Trocar o token fixo por login seguro.
3. Adicionar testes de integração com banco transacional.
