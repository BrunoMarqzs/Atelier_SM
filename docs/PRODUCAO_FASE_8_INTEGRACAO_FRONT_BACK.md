# Fase 8 - Integração Completa Frontend/Backend

## Objetivo

Consolidar o backend como fonte única de verdade para os fluxos do Atelier Sibele Marques. Nesta fase, o aplicativo deixa de depender de mocks ou geração local de disponibilidade para operações críticas.

## Decisões de Arquitetura

- O frontend consome a API para serviços, pedidos, agenda, bloqueios, status, comentários, orçamentos e uploads.
- A confirmação de pedido aguarda resposta real do backend antes de navegar para a tela de sucesso.
- A agenda da cliente e a agenda administrativa usam o mesmo endpoint de disponibilidade.
- Bloqueios e liberações são aplicados no backend e recarregados após a ação.
- Mocks foram removidos do fluxo crítico para evitar divergência entre cliente e admin.

## Impactos

- Pedidos recentes passam a existir somente quando persistidos via API.
- Serviços administrativos são criados, editados e removidos por chamadas reais.
- A agenda não inventa horários no frontend; se a API não responder, a interface exibe erro e estado vazio.
- O painel administrativo aguarda as mutações de status, comentário e orçamento antes de atualizar o estado.
- Textos com acentuação corrompida foram normalizados nos arquivos alterados.

## Riscos Tratados

- Divergência entre bloqueios vistos pelo admin e horários vistos pela cliente.
- Pedido aparecendo como confirmado no app sem ter sido salvo.
- Serviços criados apenas em memória.
- Estado administrativo desatualizado após aprovar, recusar ou concluir pedido.

## Estrutura Alterada

- `frontend/src/context/AtelierContext.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/services/atelierRepository.ts`
- `frontend/src/screens/client/ScheduleScreen.tsx`
- `frontend/src/screens/client/RequestDetailsScreen.tsx`
- `frontend/src/screens/admin/AdminAgendaScreen.tsx`
- `frontend/src/screens/admin/AdminRequestsScreen.tsx`
- `frontend/src/screens/admin/AdminServicesScreen.tsx`
- `frontend/src/utils/calendar.ts`
- `frontend/src/services/mockData.ts` removido

## Validação

- `npm.cmd run typecheck`
- `.\.venv\Scripts\python.exe -m pytest`

Resultado esperado: tipagem do frontend sem erros e suíte backend passando.
