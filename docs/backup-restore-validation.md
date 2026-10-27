# Validação de backup e restauração

Estado: restauração operacional ainda não validada. Não executar restauração no projeto de produção.

## Evidências necessárias

1. No painel Supabase do projeto usado pelo backend, registrar o plano, frequência, retenção, último backup concluído e disponibilidade de PITR. Não copiar credenciais para este documento.
2. Definir com a responsável quanto tempo de pedidos pode ser perdido (RPO) e quanto tempo o site pode ficar indisponível (RTO).
3. Criar um destino isolado e autorizado para a restauração. Isso pode exigir cobrança; conferir antes de provisionar.
4. Restaurar o backup nesse destino, com notificações desligadas e sem acesso público. Nunca apontar o frontend oficial para ele.
5. Conferir a versão Alembic, contagem de registros por tabela, relações entre pedidos/clientes/horários e leitura de anexos. Evitar expor dados pessoais em logs e screenshots.
6. Usar exclusivamente dados sintéticos para um novo pedido e seus anexos no destino isolado. Conferir também login administrativo e consultas.
7. Registrar início/fim, backup utilizado, resultado, discrepâncias e RPO/RTO atingidos. Remover o destino conforme a política de retenção acordada.

Backups do PostgreSQL não garantem cópia de arquivos externos. Conferir a estratégia efetiva de anexos: bytes no banco, disco do servidor ou objeto externo; validar o mecanismo correspondente.

Uma lista de backups no painel não comprova restauração bem-sucedida. Até concluir o ensaio, manter esta pendência explícita.
