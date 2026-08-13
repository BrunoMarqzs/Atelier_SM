# Atelier Sibele Marques

> Um toque de classe

Sistema desenvolvido para organizar o atendimento de um ateliê de costura. A aplicação reúne, em um só lugar, o envio de solicitações pelas clientes e as principais tarefas administrativas do negócio, como acompanhamento de pedidos, agenda e cadastro de serviços.

O projeto nasceu como um trabalho em equipe e foi evoluindo conforme novos fluxos eram testados. Hoje ele conta com uma interface responsiva, uma API própria e persistência em banco de dados PostgreSQL.

## O que a aplicação faz

### Para clientes

- consulta dos serviços oferecidos pelo ateliê;
- escolha de datas e horários disponíveis;
- envio de solicitações com observações e imagens;
- acompanhamento do andamento de uma solicitação por código público;
- visualização de avisos e atualizações do ateliê.

### Para administração

- autenticação com access token e refresh token;
- visão geral dos pedidos e próximos atendimentos;
- consulta e atualização do status das solicitações;
- definição de orçamento, reagendamento e comentários internos;
- cadastro, edição e remoção de serviços;
- bloqueio e liberação de horários da agenda;
- notificações, comunicados, relatórios e histórico de alterações.

## Tecnologias utilizadas

O frontend foi construído com **React Native**, **Expo** e **TypeScript**. A mesma base pode ser executada na web e em dispositivos móveis.

No backend, o projeto utiliza **Python**, **FastAPI**, **SQLAlchemy**, **Alembic** e **PostgreSQL**. A API possui documentação automática com Swagger e autenticação administrativa baseada em JWT.

Os testes do backend são executados com **Pytest**, enquanto o frontend usa a verificação de tipos do TypeScript. O repositório também possui um workflow do GitHub Actions para executar essas validações em pushes e pull requests.

## Organização do projeto

```text
Atelier_SM/
├── backend/        # API, regras de negócio, banco de dados e testes
├── frontend/       # aplicação React Native/Expo
├── docs/           # decisões e registros da evolução do projeto
└── .github/        # workflow de integração contínua
```

O backend segue uma arquitetura em camadas. Rotas HTTP, validações, regras de negócio e persistência ficam separadas, o que facilita os testes e a manutenção. No frontend, as telas são divididas entre os fluxos público, da cliente e administrativo.

## Documentação do desenvolvimento

Ao longo do projeto, as principais decisões e entregas foram registradas em documentos separados. Eles ajudam a entender como a aplicação saiu da definição inicial da arquitetura e chegou aos fluxos que estão implementados hoje:

1. [Arquitetura e organização inicial](docs/FASE_1_ARQUITETURA.md)
2. [Construção do backend](docs/FASE_2_BACKEND.md)
3. [Construção do frontend](docs/FASE_3_FRONTEND.md)
4. [Integração e funcionalidades](docs/FASE_4_FUNCIONALIDADES.md)
5. [Testes, refatoração e qualidade](docs/FASE_5_QUALIDADE.md)

## Como executar localmente

### Pré-requisitos

- Python 3.11 ou superior;
- Node.js 22 ou versão compatível com o Expo 54;
- PostgreSQL;
- Git.

### 1. Backend

Entre na pasta `backend`, crie um ambiente virtual e instale as dependências:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
Copy-Item .env.example .env
```

Edite o arquivo `.env` e informe, no mínimo, uma conexão PostgreSQL válida em `DATABASE_URL`, uma chave segura em `JWT_SECRET_KEY` e as credenciais iniciais do administrador.

Prepare o banco e inicie a API:

```powershell
python -m app.commands.setup_database
python -m uvicorn app.main:app --reload
```

A documentação da API estará disponível em `http://localhost:8000/docs`.

### 2. Frontend

Em outro terminal, entre na pasta `frontend` e instale as dependências:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run web
```

Por padrão, o exemplo de configuração aponta para a API em `http://localhost:8000/api`. Se o backend estiver em outro endereço, altere `EXPO_PUBLIC_API_BASE_URL` no arquivo `.env` do frontend.

## Testes e verificações

Para executar o lint e os testes do backend:

```powershell
cd backend
python -m ruff check .
python -m pytest
```

Para verificar os tipos e gerar a versão web do frontend:

```powershell
cd frontend
npm run quality
npm run build
```

## Observações

- Os arquivos `.env` não são versionados. Use os arquivos `.env.example` apenas como modelo e nunca envie senhas ou chaves reais ao repositório.
- O armazenamento local de imagens atende ao ambiente de desenvolvimento. Para produção, o projeto pode ser configurado para utilizar um serviço de armazenamento externo.
- Instruções mais específicas sobre banco de dados, deploy e estrutura de cada aplicação estão nos READMEs das pastas [`backend`](backend/README.md) e [`frontend`](frontend/README.md).

## Situação atual

O fluxo principal entre cliente e administração está implementado e coberto por testes automatizados no backend. O projeto continua aberto a melhorias de implantação, armazenamento de imagens e refinamento da experiência em diferentes dispositivos.
