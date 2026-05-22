# Produção - Fase 5: Agenda como regra crítica de backend

## Decisão arquitetural

A agenda passa a ser protegida no backend como uma regra transacional. O frontend pode exibir disponibilidade, mas não é responsável por garantir integridade. Reserva, bloqueio e liberação agora são validados e aplicados no servidor.

## Implementações

- reserva de horário com update condicional atômico;
- bloqueio de horário com update condicional atômico;
- liberação de horário bloqueado com update condicional atômico;
- validação centralizada de janela comercial:
  - duração exata de 1 hora;
  - início em hora cheia;
  - horário dentro de 09:00 e 18:00;
  - sem atravessar dias;
- bloqueio impedido quando horário já está reservado;
- liberação impedida quando horário está reservado;
- criação de pedido traduz conflitos de banco em erro de domínio;
- unique constraint de `slot_id` continua protegendo duplicidade no nível do banco;
- materialização de slots comerciais continua acontecendo no backend.

## Impactos

Duas solicitações concorrentes para o mesmo horário não devem conseguir criar pedidos duplicados. A primeira transação que transformar o slot em `booked` vence; as demais recebem erro de conflito.

## Riscos controlados

- em PostgreSQL, o update condicional com constraint única oferece a proteção esperada;
- em SQLite/testes leves, a semântica de concorrência não representa produção, por isso a garantia real deve ser validada em integração com PostgreSQL;
- regras de remarcação e reagendamento ficam para o fluxo administrativo avançado.

## Próximos passos

1. Criar testes de integração com PostgreSQL real.
2. Adicionar remarcação administrativa transacional.
3. Incluir auditoria de alterações de agenda na Fase 6.
