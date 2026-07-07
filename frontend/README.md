# Frontend - Atelier Sibele Marques

Aplicativo mobile-first em React Native, Expo e TypeScript para clientes e administradores do Atelier Sibele Marques.

## Stack

- React Native
- Expo
- TypeScript
- React Navigation
- Expo Image Picker
- Expo Linear Gradient

## Como Rodar

```powershell
cd frontend
npm.cmd install
npm.cmd run web
```

Para testar modificações localmente sem mexer no site publicado:

```powershell
cd frontend
npm.cmd run web:test
```

Abra no navegador:

```text
http://localhost:8084
```

Para verificar tipos:

```powershell
npm.cmd run typecheck
```

## Estrutura

```text
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

## Fluxos Implementados

### Público

- Home com marca, slogan, chamadas principais e serviços em destaque;
- identificação da cliente;
- login administrativo inicial.

### Cliente

- seleção de serviço;
- escolha de horário;
- envio de imagens;
- observações;
- confirmação de solicitação.

### Administrador

- dashboard;
- lista de pedidos;
- agenda;
- serviços.

## Observações

A Fase 3 usa mocks locais para dar forma completa a experiência visual e navegacional. A Fase 4 deve conectar as telas aos endpoints reais do backend e aprofundar as ações administrativas.
