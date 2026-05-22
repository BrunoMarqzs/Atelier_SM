# Produção - Fase 6: Fluxo administrativo avançado

## Decisão arquitetural

O administrativo passa a operar pedidos como um fluxo de trabalho, não como uma lista simples. O backend concentra filtros, histórico, comentários, orçamento e remarcação; o frontend expõe os controles usados no dia a dia do atelier.

## Implementações

- filtros administrativos por status;
- busca por nome da cliente;
- busca por telefone normalizado;
- timeline de eventos do pedido;
- comentários administrativos com registro no histórico;
- atualização de orçamento;
- alteração de status com comentário e orçamento opcional;
- endpoint de remarcação de horário;
- confirmação visual antes de ações críticas no app;
- painel de pedidos com busca, filtros, comentário, orçamento e timeline.

## Endpoints adicionados

- `GET /api/admin/requests?status=&client_name=&phone=`;
- `GET /api/admin/requests/{request_id}/timeline`;
- `PATCH /api/admin/requests/{request_id}/estimate`;
- `PATCH /api/admin/requests/{request_id}/reschedule`.

## Impactos

O admin consegue avaliar pedidos com mais contexto, registrar decisões e manter histórico auditável. Comentários e orçamento deixam de ser apenas texto solto e passam a alimentar a linha do tempo do pedido.

## Riscos controlados

- a remarcação já existe no backend, mas a experiência visual completa de escolher um novo horário dentro da tela de pedidos pode ser refinada depois;
- a auditoria ainda é simples, baseada em `status_history`; uma tabela dedicada de admin logs pode entrar se o produto exigir rastreabilidade mais granular;
- filtros do frontend também funcionam localmente para resposta rápida, enquanto o backend já aceita filtros reais.

## Próximos passos

1. Criar UI dedicada de remarcação integrada ao calendário.
2. Adicionar tabela de auditoria administrativa detalhada.
3. Exibir timeline completa em tela própria quando houver muitos eventos.
