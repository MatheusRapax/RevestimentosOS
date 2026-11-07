# Transferência de vendas entre vendedores

**O que faz:** passa orçamentos e pedidos de um vendedor para outro (por exemplo quando alguém sai da loja ou o cliente
muda de atendente), com motivo obrigatório, histórico e aviso quando a comissão muda de mãos.
**Permissão:** `sales.transfer` (“Transferir vendas entre vendedores”, sensível). Concedida pela migração a Administrador e
Gerente; qualquer outro papel recebe ao marcar a permissão na tela de papéis.
**Onde:** `src/modules/sales-transfers/` (planejador, serviço, controller, testes), migração
`20261107180000_transferencia_de_vendas`. Telas em `clinicos-web`: botão `components/vendas/transferir-venda-botao.tsx`
(orçamento e pedido) e `app/dashboard/vendas/transferencias` (lote + histórico), menu **Comercial › Transferir vendas**.

## Regras

| Regra | Como funciona |
|---|---|
| Quem pode | Só quem tem `sales.transfer`, seja qual for o papel. Quem não tem `sales.view.all` só transfere as **suas** vendas |
| Para quem | Usuário **ativo** da loja cujo papel enxerga orçamentos ou pedidos |
| Motivo | Obrigatório, de 5 a 500 caracteres |
| Par orçamento + pedido | Andam juntos: transferir um puxa o outro. Se o pedido do par estiver cancelado ou ausente, o par é bloqueado |
| Pedido cancelado | Não transfere |
| Já é do destino | Ignorado (aparece como “ignorado” na prévia) |
| Nada a fazer | Responde 400 `NADA_PARA_TRANSFERIR` |
| Vendas avulsas | Não existe “carteira” de vendedor: transfere-se a venda, não o cliente. Clientes e arquitetos não mudam de dono |
| Pedido de mês anterior | **Aviso com confirmação**: a comissão é calculada pelo vendedor do pedido, então muda de mãos mesmo em mês já acertado. Sem `confirmarMesAnterior` a API responde 409 `CONFIRMACAO_NECESSARIA` |
| Atomicidade | Tudo em uma transação: ou transfere tudo ou nada |

## Rastro

- `SalesTransfer` (livro da transferência): venda, de quem, para quem, quem fez, motivo, `commissionImpact` e `batchId`
  (as linhas de um mesmo lote compartilham o `batchId`).
- `QuoteHistory` do orçamento recebe a ação `TRANSFERIDO`.
- Quem não vê as vendas de todos só enxerga no histórico as transferências em que está envolvido.

## API

Todas sob `/sales/transfers`, com `@Permissions('sales.transfer')`:

| Rota | Para quê |
|---|---|
| `GET /sellers` | Vendedores elegíveis como destino |
| `GET /open?sellerId=` | Orçamentos e pedidos em aberto de um vendedor (tela de lote) |
| `POST /preview` | Simula: o que vai, o que está bloqueado, o que foi ignorado e os avisos de comissão |
| `POST /` | Transfere. Corpo: `paraVendedorId`, `motivo`, `quoteIds?`, `orderIds?`, `deVendedorId?` (todas as abertas), `confirmarMesAnterior?` |
| `GET /` | Histórico |

## Testes

- `src/modules/sales-transfers/sales-transfers.spec.ts`: planejador (par, cancelado, ignorados, mês anterior) e serviço.
- Teste real ponta a ponta (31 verificações): permissões 403, prévia, motivo curto 400, destino inválido 400, transferência de
  orçamento e de par, visibilidade invertida entre vendedores, aviso de mês anterior 409 → confirmação, cancelado bloqueado,
  lote de um vendedor inteiro, usuário restrito só com as suas, histórico por escopo.

## Limites conhecidos

- A comissão é calculada ao vivo pelo vendedor do pedido: transferir um pedido de mês passado **muda a comissão daquele mês**
  (por isso o aviso). Não existe “congelamento” de comissão por período.
- Clientes e arquitetos continuam compartilhados (não pertencem a vendedor).
- Ver também `docs/VISIBILIDADE-DAS-VENDAS.md`.
