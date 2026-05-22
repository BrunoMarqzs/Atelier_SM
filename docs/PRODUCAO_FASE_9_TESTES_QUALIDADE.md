# Fase 9 - Testes e Qualidade

## Objetivo

Elevar o projeto para uma base de qualidade mais próxima de produção, com testes focados nos pontos que mais podem gerar falhas reais: autenticação, autorização, agenda, conflitos de pedido, upload, status e contratos HTTP.

## Decisões Técnicas

- Os testes adicionados são rápidos e isolados, sem depender de PostgreSQL local.
- Os contratos de API usam `TestClient` com dependências substituídas para validar resposta, autenticação e delegação dos endpoints.
- As regras críticas continuam testadas em serviços de domínio, onde a lógica de negócio vive.
- A esteira futura foi registrada em GitHub Actions com validação separada para backend e frontend.

## Cobertura Adicionada

- Contrato de criação de pedido via API.
- Proteção de rotas administrativas sem autenticação.
- Contrato de alteração de status administrativo.
- Rate limiting de login administrativo.
- Bloqueio de reserva em horário indisponível.
- Materialização de horários comerciais faltantes.
- Rejeição de serviço inativo antes de reservar agenda.
- Conversão de conflito de slot duplicado para erro de domínio.
- Persistência de metadados de imagem em pedido.
- Rejeição de upload acima do limite configurado.
- Persistência segura de imagem local com nome normalizado.

## Ferramentas

Backend:

```powershell
.\.venv\Scripts\python.exe -m pytest
.\.venv\Scripts\python.exe -m ruff check .
```

Frontend:

```powershell
npm.cmd run typecheck
npm.cmd run quality
```

CI futura:

- `.github/workflows/quality.yml`

## Resultado Esperado

- Testes backend passam integralmente.
- Lint backend passa sem pendências.
- TypeScript frontend passa sem erros.
- Pull requests futuros podem executar a mesma validação automaticamente.

## Próximos Incrementos Recomendados

- Adicionar testes de integração com PostgreSQL real em container.
- Adicionar testes E2E mobile/web para fluxo completo cliente e admin.
- Adicionar cobertura mínima quando `coverage.py` entrar na stack.
- Adicionar ESLint/Prettier no frontend quando a dependência puder ser instalada de forma controlada.
