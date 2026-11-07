# Visibilidade das vendas por vendedor

**Regra:** quem **não** tem a permissão `sales.view.all` (“Ver as vendas de todos os vendedores”) vê só as **suas** vendas.
Quem tem, vê as de todos.
**Onde:** `src/core/rbac/sales-scope.ts` (escopo, filtros e guard), aplicado nos controllers e serviços de orçamentos,
pedidos, entregas, avarias, notas fiscais, painel inicial e resumo do cliente. Migração
`20261107120000_permissao_ver_vendas_de_todos`. Aviso na tela: `clinicos-web/src/components/auth/escopo-vendas-aviso.tsx`.

## Como funciona

- O vendedor de uma venda é o `sellerId` do **orçamento** e do **pedido**.
- O escopo é descoberto **uma vez por requisição**: o papel do usuário na loja tem `sales.view.all`? Super Admin vê tudo.
- **Lista:** o serviço soma `sellerId = usuário` ao filtro (`filtroDoVendedor`) quando o escopo é restrito.
- **Endereço direto:** o guard `SalesOwnerGuard` confere o dono antes de qualquer rota com `:id` (detalhe, PDF, editar,
  enviar, aprovar, converter, duplicar, status do pedido, comissões, entrega, XML/DANFE, cancelar nota...). Venda de
  outro vendedor responde **“não encontrado”** (não revela que existe).
- **Pedido herda o vendedor do orçamento.** Antes, `convertToOrder` gravava quem converteu; se o gerente convertia, o pedido
  “saía” do vendedor (e a comissão ia para o gerente). Agora o vendedor é sempre o do orçamento; quem converteu continua no
  histórico do orçamento.

## O que é filtrado

| Área | Como |
|---|---|
| Orçamentos | lista e todas as rotas por id |
| Pedidos | lista, estatísticas, exportação para Excel e todas as rotas por id (status, entrega, reservas, comissões) |
| Entregas | lista pelo pedido; agendar entrega só em pedido seu |
| Notas fiscais | emitir/validar por pedido; XML, DANFE, cancelar e tentar novamente por documento |
| Avarias (RMA) | lista; avaria ligada a pedido de outro some; abrir avaria só em pedido seu. Avaria **sem pedido** (compra/estoque) segue visível |
| Painel inicial | pedidos pendentes, entregas pendentes, recebimentos do dia, alertas de avaria e rankings de vendedores/arquitetos |
| Resumo do cliente | totais de orçamentos e pedidos contam só os do usuário |

## O que NÃO foi filtrado (decisão)

- **Cadastro de clientes e de arquitetos:** é base compartilhada da loja.
- **Financeiro gerencial** (visão geral, contas a pagar, notas de serviço): é função de gerência, protegida por `finance.read`.
- **Comissões por arquiteto** (`GET /architects/:id/commissions`): protegido por `commission.report.read`.

## Passar uma venda para outro vendedor

Quem tem a permissão `sales.transfer` transfere orçamentos e pedidos entre vendedores (com motivo, histórico e aviso de
comissão). Ver `docs/TRANSFERENCIA-DE-VENDAS.md`.

## Compatibilidade (o que a migração faz)

Concede `sales.view.all` a **todo papel que já vê orçamentos ou pedidos**, **exceto o Vendedor** (`SELLER`). Assim Administrador,
Gerente e papéis personalizados continuam vendo tudo; só o Vendedor passa a ver o próprio. Para um papel personalizado
restringir, basta **desmarcar** a permissão nele.

## Testes

- `src/core/rbac/sales-scope.spec.ts`: filtros, resolução do escopo, guard e aplicação nos serviços.
- Teste real com dois vendedores, gerente e um papel próprio com a permissão (listas, detalhe, PDF, edição, aprovação,
  duplicação, pedido, status, comissões, entrega, resumo do cliente): todos conforme o esperado.

## Limites conhecidos

- Rotas de pedidos, compras e outras ainda **não conferem a permissão do papel no servidor** (só o módulo); ver `docs/PERMISSOES.md`.
  O escopo por vendedor é independente disso e já vale.
- Pedidos antigos convertidos por outra pessoa continuam com o vendedor gravado na época (quem converteu).
