# Fase 3 - Frontend Mobile

## Objetivo

Criar a base mobile-first do aplicativo Atelier Sibele Marques com React Native, Expo e TypeScript, priorizando experiência premium, navegação clara e componentes reutilizáveis.

## Entregas Implementadas

### Base Expo

- `package.json`;
- `app.json`;
- `tsconfig.json`;
- `babel.config.js`;
- `App.tsx`;
- instalação de dependências Expo/React Native;
- suporte web para verificação visual local.

### Arquitetura de Pastas

```text
frontend/
  src/
    screens/
      public/
      client/
      admin/
    components/
      common/
      booking/
      admin/
    hooks/
    services/
    navigation/
    theme/
    assets/
    animations/
    context/
    types/
    utils/
```

### Tema Visual

Foi criado um sistema de tema com:

- paleta em rose gold, ivory, champagne, nude, sage e preto elegante;
- tipografia para marca, títulos, seções, corpo e legendas;
- espaçamentos consistentes;
- raios de borda;
- sombras adaptadas para mobile e web.

### Componentes Base

- `Screen`;
- `ScreenHeader`;
- `PremiumButton`;
- `ElegantInput`;
- `StatusBadge`;
- `ServiceCard`;
- `TimeSlotPill`;
- `ImageUploadTile`;
- `AdminMetric`;
- `RequestPreviewCard`.

### Navegação

- `AtelierApp`;
- `PublicNavigator`;
- `ClientNavigator`;
- `AdminNavigator`;
- tabs administrativas com ícones.

### Telas Públicas

- `HomeScreen`;
- `ClientIdentityScreen`;
- `AdminLoginScreen`.

### Telas Cliente

- `ServiceSelectionScreen`;
- `ScheduleScreen`;
- `RequestDetailsScreen`;
- `ConfirmationScreen`.

Melhorias implementadas na agenda da cliente:

- calendário horizontal com seleção de datas pelos próximos 6 meses;
- horários gerados em horário comercial, das 09h às 18h;
- intervalo de 1 hora entre cada horário;
- diferenciação visual entre horário disponível, reservado e bloqueado;
- seleção de outro dia além da data atual.

### Telas Admin

- `AdminDashboardScreen`;
- `AdminRequestsScreen`;
- `AdminAgendaScreen`;
- `AdminServicesScreen`.

Melhorias implementadas no administrativo:

- edição de serviços existentes;
- criação de novo serviço;
- alteração de nome, categoria, descrição, duração, preço e tipo de cobrança;
- agenda com seleção de datas pelos próximos 6 meses;
- clique em horário para ver disponibilidade, reserva ou bloqueio;
- visualização de cliente, telefone, serviço, observações e imagem enviada quando houver pedido;
- botão funcional para bloquear e liberar horários livres.

### Dados e API

- mocks locais para serviços, horários e pedidos;
- `BookingContext` para fluxo de agendamento;
- `AtelierContext` como fonte compartilhada entre cliente e administrador;
- pedidos feitos pela cliente aparecem imediatamente no painel administrativo;
- bloqueios feitos na agenda administrativa aparecem também na escolha de horário da cliente;
- pedidos, mudanças de status e bloqueios são persistidos no armazenamento local do navegador;
- imagens enviadas pela cliente são guardadas como base64 quando possível para melhorar a permanência no ambiente web;
- `api.ts` preparado para consumir os endpoints do backend.

### Imagens

- imagens do pedido podem ser tocadas no administrativo;
- ao tocar, a imagem abre em tela cheia;
- a visualização ampliada usa proporção preservada para inspecionar melhor a peça.

## Validações

Comandos executados:

```powershell
npm.cmd install
npm.cmd run typecheck
npm.cmd run web -- --port 8084 --clear
```

Resultado:

- TypeScript sem erros;
- Expo Web renderizando a home;
- interface verificada visualmente no navegador em `http://localhost:8084`.

## Próxima Fase

A Fase 4 deve implementar funcionalidades reais:

- conectar serviços ao backend;
- buscar disponibilidade real;
- criar pedido real;
- upload de imagens real;
- autenticar token administrativo;
- listar e alterar pedidos;
- bloquear/liberar horários;
- criar/editar/desativar serviços.
