# Avisos de novos pedidos no celular

## O que muda e o que não muda

O backend FastAPI já grava uma notificação interna `request_created` na transação do
pedido. Um consumidor independente lê esses eventos **após o commit**, a cada 15 segundos
enquanto o processo estiver ativo. Nenhuma chamada de push foi adicionada às rotas de
criação do pedido ou de envio das fotos. O frontend Expo/React Native Web já tinha
manifesto e service worker; estes foram estendidos.

O aviso contém apenas “Novo pedido recebido — Abra o painel para consultar os pedidos”.
Não inclui nome, telefone, fotos, código público ou observações. O clique abre `/admin`;
a autenticação existente é necessária para consultar pedidos.

Somente o administrador identificado por `PUSH_ADMIN_ID`, autenticado pelo JWT existente
e ainda ativo, pode cadastrar seus dispositivos (máximo 10). Cada aparelho tem seu botão
em **Menu administrativo → Avisos**. Sair da sessão não desativa o aviso: é um recurso
para aparelho pessoal. Desative-o antes de compartilhar o dispositivo. Revogar a conta
administrativa interrompe novos envios do worker. Um push já aceito pelo provedor não
pode ser recolhido.

## Serviços e custo

Web Push padrão com `pywebpush==2.0.3` e VAPID, sem plataforma de marketing nem assinatura
Apple Developer. Mensagens criptografadas são encaminhadas ao provedor do navegador
(Apple, Google ou Mozilla). Chaves privadas ficam exclusivamente no backend. Não há
novo serviço pago contratado por esta implementação; permanece o consumo da infraestrutura
existente (banco, rede e processamento).

**Render suspenso significa consumidor suspenso.** O pedido recebido acorda o backend;
os avisos pendentes são retomados quando ele volta. Não há SLA de entrega instantânea.
Para processamento contínuo seria necessário um servidor/worker sempre ativo, a avaliar
separadamente. Não foi contratado ou ativado nenhum plano.

## Configuração antes de produção

1. Instalar as dependências do backend atualizadas (`pip install -e ".[dev]"` em desenvolvimento).
2. Gerar um par VAPID em ambiente seguro, usando a biblioteca `py_vapid` instalada.
   O módulo fornece `Vapid().generate_keys()`, `save_key("private_key.pem")` e
   `save_public_key("public_key.pem")`. Não colocar esses arquivos no Git.
   `PUSH_VAPID_PRIVATE_KEY` pode ser um caminho seguro para o PEM, ou a chave privada
   DER codificada em base64url. A chave pública usada no browser deve ser o ponto
   P-256 não comprimido (65 bytes) em base64url, não o texto de um PEM.
3. Configurar no backend:
   - `PUSH_ENABLED=false` inicialmente.
   - `PUSH_ADMIN_ID`: ID real da conta da mãe, conferido no banco/painel. Não presumir 1.
   - `PUSH_VAPID_PUBLIC_KEY`: chave pública base64url.
   - `PUSH_VAPID_PRIVATE_KEY`: chave privada, armazenada como segredo.
   - `PUSH_VAPID_SUBJECT=mailto:EMAIL_REAL_DO_RESPONSAVEL`.
4. Aplicar `alembic upgrade head` no ambiente de homologação primeiro. Nova revisão:
   `20261020_0011`, filha de `20260707_0010`. São duas tabelas novas, sem alterações
   nas tabelas de pedidos, imagens ou agenda.
5. As novas tabelas têm RLS e nenhum acesso para `anon`/`authenticated`. O backend deve
   usar sua conexão PostgreSQL confiável, com permissões de proprietário/bypass RLS.
   Não criar políticas públicas para contornar permissões. Revisar os advisors do
   Supabase após aplicar em homologação/produção.
6. Publicar frontend/backend e somente então ativar `PUSH_ENABLED=true`, reiniciando
   o backend. Não rotacionar VAPID sem planejar novo cadastro nos aparelhos.
7. Atualizar o monitor de migrações: o head esperado passa a ser `20261020_0011`
   **após** o deploy, não antes. Esta implementação não alterou a automação.

Nenhuma chave real foi gerada, nenhuma configuração de produção foi alterada e a
migração não foi aplicada ao Supabase por esta tarefa.

## Ativação no iPhone 11

1. Atualizar para iOS 16.4 ou mais recente.
2. No Safari, abrir o site → Compartilhar → **Adicionar à Tela de Início**.
3. Abrir pelo novo ícone, entrar como administradora → Menu → **Avisos**.
4. Tocar **Ativar neste aparelho** e **Permitir**.
5. Se bloqueado: Ajustes → Notificações → Atelier. Conferir também modo Foco,
   permissões na tela bloqueada e conexão. Voltar ao painel e tocar **Verificar configuração**.
6. Para desligar, tocar **Desativar neste aparelho**, conectado à internet. Outros
   aparelhos não são afetados.

A inscrição exige gesto explícito. A Apple permite recebimento com o site fechado e na
tela bloqueada; depende de rede/permissões e do sistema operacional:
https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

## Falhas e duplicações

- Ledger persistente com chave única `(subscription_id, event_id)`.
- Cada envio tem transação própria e trava apenas o dispositivo. Workers concorrentes
  usam `SKIP LOCKED`; não travam reservas nem pedidos.
- Até 6 tentativas, com intervalos crescentes, para eventos dos últimos 24h.
- HTTP 404/410 desativa inscrição expirada. Reativar no aparelho cadastra novamente.
- Ao ativar/reativar, pedidos antigos não são enviados em lote; apenas eventos posteriores
  ao cadastro. Repetir cadastro ativo é idempotente.
- `sent` significa **aceito pelo provedor**, não comprovação de entrega/leitura no iPhone.
- Uma queda após o provedor aceitar e antes do commit pode repetir o envio. O `tag`
  estável substitui um aviso ainda exibido, com `renotify=false`. Não há promessa de
  exactly-once: se a pessoa já descartou o aviso, pode reaparecer nesse caso raro.
- O worker não descarta silenciosamente pushes válidos: Safari exige aviso visível
  para cada push, sob risco de revogar a permissão:
  https://webkit.org/blog/12945/meet-web-push/
- Falhas são registradas sem endpoints, chaves ou dados pessoais no log. O operador
  pode consultar `push_deliveries` para verificar status/contagem, sem expor a tabela
  à API pública. Eventos que ultrapassarem 24h deixam de ser tentados; o painel
  continua sendo a fonte de verdade.

## Desligamento e rollback

`PUSH_ENABLED=false` e reinício interrompem o consumidor sem tocar nos pedidos.
Não é necessário remover tabelas para desligar. Se for indispensável reverter a migração,
primeiro desligar o recurso e remover o frontend correspondente; o downgrade para
`20260707_0010` apaga apenas inscrições/ledger (perdendo configurações de dispositivos).
Não executar downgrade automaticamente.

## Verificação

- Backend: `python -m pytest -q`, `python -m ruff check app tests`.
- Integração PostgreSQL temporária, sem usar `.env` remoto: definir `PG_TEST_BIN`
  apontando aos binários locais e executar `pytest tests/test_push_postgres.py -q`.
- Frontend: `npm run typecheck`, `npm run build`, `node scripts/test-push.cjs`,
  `node scripts/test-push-settings.cjs`,
  `node scripts/test-upload-flow.cjs`, `node scripts/test-targeted-updates.cjs`,
  `node scripts/test-parallel-snapshot.cjs`.

**Ainda obrigatório em aparelho real:** instalar PWA; negar/permitir; ativar/desativar;
criar pedido autorizado sem/com foto; aguardar com tela bloqueada e site fechado;
abrir aviso com sessão expirada; conferir modo Foco; medir atraso com servidor frio.
Os testes automatizados não comprovam recebimento real pelo iPhone.

## Laboratório local isolado

O comando `python -m app.commands.local_push_lab --contact EMAIL_DE_CONTATO` (na pasta
backend) cria um cluster PostgreSQL próprio em `backend/storage/push-local`, vinculado
somente a `127.0.0.1:55439`, e serve API + frontend em `http://localhost:8084`.
Requer PostgreSQL 17 instalado (ou `--pg-bin`), dependências do backend e frontend
previamente compilado com `EXPO_PUBLIC_API_BASE_URL=/api` e `EXPO_NO_DOTENV=1`.
Nenhum `.env` existente é sobrescrito; a conexão remota é substituída no processo
antes de importar a aplicação. A conta, JWT e VAPID são exclusivos do laboratório.

As credenciais temporárias ficam em `backend/storage/push-local/access.txt`; chaves,
cluster e logs ficam nessa pasta já ignorada pelo Git. Não compartilhar
`private-config.json`, `pg-password` ou o diretório de dados.

Para o iPhone, o executável oficial `cloudflared` pode encaminhar apenas a porta web:
`cloudflared tunnel --url http://127.0.0.1:8084 --no-autoupdate`.
O endereço HTTPS é temporário e público; usar somente dados fictícios. O banco
PostgreSQL não é encaminhado. O PC precisa permanecer ligado.
Ao terminar o teste, encerrar o túnel; parar o comando do laboratório encerra também
seu PostgreSQL. Se executado em segundo plano, identificar os processos desse
laboratório antes de encerrá-los, sem parar outros servidores PostgreSQL/Python.

O laboratório não é um deploy. O endereço muda ao recriar o túnel; nesse caso,
remover o atalho antigo do iPhone e instalar/autorizar novamente no novo endereço.
