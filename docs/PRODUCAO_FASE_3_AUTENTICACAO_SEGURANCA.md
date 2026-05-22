# Produção - Fase 3: Autenticação e segurança

## Decisão arquitetural

O token fixo administrativo foi substituído por autenticação real. O backend passa a emitir access tokens JWT curtos e refresh tokens opacos persistidos apenas como hash no banco.

## Implementações

- criada tabela `refresh_tokens`;
- adicionados endpoints:
  - `POST /api/auth/admin/login`;
  - `POST /api/auth/admin/refresh`;
  - `POST /api/auth/admin/logout`;
  - `GET /api/auth/admin/me`;
- rotas administrativas agora usam `Authorization: Bearer <access_token>`;
- senha administrativa seedada é armazenada com hash PBKDF2;
- refresh token é armazenado como SHA-256, nunca em texto puro;
- refresh token é rotacionado a cada renovação;
- logout revoga refresh token;
- rate limiting em memória reduz brute force no login;
- frontend passa a fazer login com e-mail e senha;
- chamadas administrativas do frontend usam bearer token em vez de token fixo.

## Impactos

O acesso administrativo deixa de depender de segredo hardcoded. A API passa a rejeitar ações administrativas sem sessão válida, e o frontend não consegue mais abrir o painel apenas navegando sem autenticação.

## Riscos controlados

- o rate limiting atual é em memória; em produção com múltiplas instâncias deve ir para Redis;
- o access token fica em memória no frontend, evitando persistência insegura nesta fase;
- a Fase 10 deve reforçar HTTPS, CORS restrito e secrets gerenciados pelo provedor.

## Variáveis novas

- `JWT_SECRET_KEY`;
- `ACCESS_TOKEN_EXPIRE_MINUTES`;
- `REFRESH_TOKEN_EXPIRE_DAYS`;
- `AUTH_RATE_LIMIT_ATTEMPTS`;
- `AUTH_RATE_LIMIT_WINDOW_SECONDS`;
- `SEED_ADMIN_EMAIL`;
- `SEED_ADMIN_PASSWORD`.

## Próximos passos

1. Usar storage seguro no mobile nativo quando empacotar o app.
2. Trocar rate limiter em memória por Redis em produção.
3. Adicionar trilha de auditoria administrativa na Fase 6.
