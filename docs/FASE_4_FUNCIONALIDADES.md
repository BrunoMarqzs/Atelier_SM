# Fase 4 - Funcionalidades

## Objetivo

Conectar as telas criadas às funcionalidades reais do sistema, reduzindo dependência de mocks e preparando a aplicação para uso operacional.

## Frontend

- configuração de API via `.env.example`;
- `EXPO_PUBLIC_API_BASE_URL` define a URL do backend;
- a Fase 3 de produção substitui token administrativo fixo por login com JWT;
- camada `api.ts` preparada para buscar pedidos, alterar status, criar/editar/remover serviços e bloquear/liberar horários;
- imagens de pedidos podem ser ampliadas em tela cheia no administrativo.

## Estado funcional compartilhado

- cliente e administrador visualizam o mesmo estado quando o backend está disponível;
- pedidos criados pela cliente entram no painel administrativo;
- alterações de status feitas pelo administrador são enviadas ao backend;
- serviços criados/editados/removidos pelo administrador passam pela API;
- bloqueios de agenda feitos pelo administrador aparecem na escolha de horário da cliente.

## Backend

- contrato de leitura de pedidos foi enriquecido com cliente, serviço, horário e imagens;
- agenda passou a expor status real de horários dentro da janela consultada;
- bloqueios administrativos são persistidos no backend;
- horários comerciais são materializados pelo backend quando a agenda é consultada.

## Ajustes administrativos

- painel administrativo possui botão para voltar à tela inicial;
- painel mostra os próximos atendimentos, ordenados por data e hora do pedido;
- aba de pedidos permite concluir um pedido;
- pedidos concluídos deixam de aparecer na lista principal de pedidos ativos.

## Próximas implementações

1. Formalizar migrations e seeds de serviços, disponibilidade e admin.
2. Substituir token fixo por autenticação real com JWT.
3. Migrar imagens para Cloudinary ou S3.
4. Adicionar testes de integração para fluxo cliente-admin.
