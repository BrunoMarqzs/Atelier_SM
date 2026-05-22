# Produção - Fase 1: Backend como fonte da verdade

## Decisão arquitetural

O backend FastAPI passa a ser a fonte principal para pedidos, serviços e agenda. O frontend deixa de depender de `localStorage` para dados críticos e mantém apenas estado em memória para feedback otimista enquanto a API responde.

## Implementações

- removida a camada de persistência crítica em `localStorage`;
- criado repositório de dados remoto no frontend para centralizar chamadas de API;
- snapshot inicial do atelier carrega serviços, pedidos administrativos e bloqueios da agenda;
- criação de pedido passa pela API quando o slot possui identificador remoto;
- alteração de status, criação/edição/remoção de serviços e bloqueio/liberação de horário passam pela API;
- endpoint público de agenda passa a devolver horários disponíveis, bloqueados e reservados;
- backend materializa horários comerciais de 1 hora entre 09:00 e 18:00 na janela consultada;
- bloqueios administrativos persistem e voltam após logout/login;
- cliente passa a selecionar slots vindos da API quando ela está disponível.

## Impacto

Cliente e administrador passam a operar sobre a mesma base lógica. Um bloqueio feito no admin aparece para clientes, e um pedido feito por cliente pode ser carregado no painel administrativo depois de nova sincronização.

## Riscos controlados

- ainda existe fallback visual em memória quando a API está indisponível, para não deixar o app inutilizável durante desenvolvimento;
- a materialização automática de horários no `GET /availability` é uma ponte técnica para a Fase 2, onde isso deve virar seed/migration formal;
- upload profissional ainda não foi migrado para storage externo, ficando reservado para a Fase 4 de produção.

## Próximos passos

1. Criar migrations Alembic e seeds formais.
2. Definir ambientes `development`, `staging` e `production`.
3. Remover token fixo e implementar autenticação administrativa real.
