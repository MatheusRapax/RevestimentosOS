# Permissões e papéis

**Onde:** `src/core/rbac/permission-catalog.ts` (texto de cada permissão), `permissions.ts` (chaves usadas no código),
`prisma/seed.ts` (permissões e papéis semeados), tela `Administração › Papéis e Acessos` e `/admin/roles` (Super Admin).
**Teste:** `src/core/rbac/permission-catalog.spec.ts` (toda permissão nova precisa de texto; nenhuma permissão ativa pode
usar termo de clínica).

## O que mudou

- As telas de papéis deixaram de mostrar a chave técnica (`fiscal.config`) agrupada pelo prefixo. Agora cada permissão
  mostra **nome em português, o que libera, a tela do menu que abre**, a etiqueta **Sensível** quando mexe com dinheiro,
  estoque, nota fiscal, acessos ou apaga dados, e as áreas têm título e explicação.
- As rotas `GET /roles/permissions/all` e a do Super Admin devolvem os campos novos (`categoria`, `titulo`, `detalhe`, `tela`,
  `sensivel`, `situacao`, `descrita`) junto dos antigos; nada que já consumia a lista quebra.
- As permissões **antigas de clínica** (agenda, atendimentos, pacientes, prontuários, procedimentos, consumíveis,
  especialidades, avisos) e as **sem efeito** ficam recolhidas no fim da tela, com explicação.
- O papel `CLINIC_ADMIN` passou a se chamar **“Administrador da Loja (antigo)”** (migração `20261107000000_*`). Ele não é
  apagado porque o fluxo antigo de criar loja (`ClinicsService.create`) ainda o usa.

## Levantamento: o que cada permissão realmente faz hoje (2026-11-06)

Medido no código: rota do backend (`@Permissions`), item de menu ou botão da tela.

| Situação | Quantidade | Significado |
|---|---|---|
| Ativa | 48 | Controla o servidor e/ou a tela |
| Só esconde a tela | 4 | `order.read`, `purchase.read`, `supplier.read`, `audit.read`: somem do menu, mas a API responde a quem chamar direto |
| Sem efeito | 27 | Nada consulta: `order.create/update/cancel/confirm`, `purchase.create/update/cancel`, `supplier.create/update/delete`, `brand.*`, `category.*`, `user.*`, `finance.create/update`, `clinic.read/update/delete`, `sales.report.read`, `CLINIC_ADMIN` |
| Antiga (clínica) | 30 | Protegem módulos de clínica que não aparecem no menu |

### ⚠️ Lacuna de segurança: a permissão ainda não vale no servidor para várias áreas

Os controllers de **pedidos, compras (pedidos e fornecedores), despesas, estoque (reservas), catálogo (marcas, categorias),
auditoria e painel** não usam `@Permissions`: só conferem o **módulo** da loja. Na prática, quem está logado numa loja com
o módulo ativo consegue chamar essas rotas direto, mesmo sem a permissão, e só a tela esconde o botão. Exemplo: um papel
sem `order.cancel` ainda cancela pedido pela API.

**Por que não foi corrigido junto:** ligar a checagem no servidor muda o que cada papel consegue fazer. A tela também não
confere `order.update`, então hoje o Vendedor (que só tem `order.read` e `order.create`) executa as ações de pedido; ao exigir
`order.update` no servidor, isso passaria a ser recusado. Antes é preciso decidir **quem faz o quê** (por papel) e ajustar o seed.

**Proposta (próxima etapa):**
1. Decidir a matriz papel × ação para pedidos, compras, despesas, catálogo e auditoria (o catálogo acima já lista as ações).
2. Acrescentar `@Permissions(...)` nesses controllers e ajustar `prisma/seed.ts` + uma migração que conceda aos papéis
   existentes o que hoje eles já fazem pela tela (para ninguém perder acesso).
3. Trocar a situação para `ativa` no catálogo; o teste e a tela refletem sozinhos.

## Catálogo completo

⚠️ = sensível (mexe com dinheiro, estoque, nota fiscal, acessos ou apaga dados). Gerado do próprio catálogo.

### Vendas

Clientes, arquitetos, orçamentos, pedidos e promoções: o dia a dia do vendedor.

| Permissão | O que libera | Tela | Situação | Chave |
|---|---|---|---|---|
| Ver clientes | Abre a lista e a ficha dos clientes, com o resumo de compras. | Comercial › Clientes | Ativa | `customer.read` |
| Cadastrar clientes | Cria clientes novos. |  | Ativa | `customer.create` |
| Editar clientes | Altera dados, endereço e dados fiscais do cliente. |  | Ativa | `customer.update` |
| Excluir clientes ⚠️ | Remove um cliente do cadastro. |  | Ativa | `customer.delete` |
| Ver arquitetos | Abre a lista e a ficha dos arquitetos parceiros. | Comercial › Arquitetos | Ativa | `architect.read` |
| Cadastrar arquitetos | Cria arquitetos parceiros novos. |  | Ativa | `architect.create` |
| Editar arquitetos | Altera os dados do arquiteto. |  | Ativa | `architect.update` |
| Excluir arquitetos ⚠️ | Remove um arquiteto do cadastro. |  | Ativa | `architect.delete` |
| Ver orçamentos | Abre orçamentos, modelos de orçamento, o PDF e a disponibilidade em estoque. | Comercial › Orçamentos | Ativa | `quote.read` |
| Criar orçamentos | Cria um orçamento novo ou duplica um existente. |  | Ativa | `quote.create` |
| Editar orçamentos | Altera itens e preços, atualiza preços, aprova, reserva estoque, rejeita e reabre. |  | Ativa | `quote.update` |
| Enviar orçamentos ao cliente | Marca o orçamento como enviado. |  | Ativa | `quote.send` |
| Converter orçamento em pedido | Transforma um orçamento aprovado em pedido de venda. |  | Ativa | `quote.convert` |
| Excluir orçamentos ⚠️ | Apaga um orçamento. |  | Ativa | `quote.delete` |
| Ver pedidos | Abre a lista de pedidos e os detalhes de cada um. | Comercial › Pedidos | Só esconde a tela | `order.read` |
| Criar pedidos | Cria pedidos de venda. |  | Sem efeito hoje | `order.create` |
| Atualizar pedidos | Registra pagamento, separação, entrega e os demais andamentos do pedido. |  | Sem efeito hoje | `order.update` |
| Cancelar pedidos ⚠️ | Cancela um pedido. |  | Sem efeito hoje | `order.cancel` |
| Confirmar pedidos | Confirma um pedido de venda. |  | Sem efeito hoje | `order.confirm` |
| Ver relatórios de vendas | Abre relatórios de vendas. |  | Sem efeito hoje | `sales.report.read` |
| Ver promoções | Abre a lista de campanhas e promoções. | Comercial › Promoções | Ativa | `promotion.read` |
| Criar promoções | Cria campanhas de promoção. |  | Ativa | `promotion.create` |
| Editar promoções | Altera preço, período e produtos de uma promoção. |  | Ativa | `promotion.update` |
| Excluir promoções ⚠️ | Apaga uma promoção. |  | Ativa | `promotion.delete` |

### Estoque e produtos

Catálogo de produtos, marcas, categorias, saldos e movimentações do estoque.

| Permissão | O que libera | Tela | Situação | Chave |
|---|---|---|---|---|
| Ver catálogo de produtos | Consulta produtos, preços por m² e disponibilidade (sem mostrar custo). | Comercial › Catálogo de Produtos | Ativa | `product.read` |
| Cadastrar e importar produtos | Cria produtos e importa planilhas de produtos. |  | Ativa | `product.create` |
| Editar produtos e dados fiscais | Altera cadastro, preço e dados fiscais (NCM, origem) dos produtos. | Estoque & Logística › Produtos | Ativa | `product.update` |
| Excluir produtos ⚠️ | Remove um produto do catálogo. |  | Ativa | `product.delete` |
| Ver marcas | Consulta as marcas cadastradas. |  | Sem efeito hoje | `brand.read` |
| Cadastrar marcas | Cria marcas novas. |  | Sem efeito hoje | `brand.create` |
| Editar marcas | Altera o nome e o markup da marca. |  | Sem efeito hoje | `brand.update` |
| Excluir marcas ⚠️ | Desativa uma marca. |  | Sem efeito hoje | `brand.delete` |
| Ver categorias | Consulta as categorias de produto. |  | Sem efeito hoje | `category.read` |
| Cadastrar categorias | Cria categorias novas. |  | Sem efeito hoje | `category.create` |
| Editar categorias | Altera o nome e o markup da categoria. |  | Sem efeito hoje | `category.update` |
| Excluir categorias ⚠️ | Desativa uma categoria. |  | Sem efeito hoje | `category.delete` |
| Configurar o catálogo ⚠️ | Altera o markup global e as demais configurações de preço do catálogo. | Administração › Config. de Catálogo | Ativa | `catalogue.settings` |
| Ver saldos e movimentações | Abre a visão geral do estoque, o histórico de movimentações e os alertas. | Estoque & Logística › Visão Geral e Movimentações | Ativa | `stock.view` |
| Lançar entradas, saídas e ajustes ⚠️ | Altera o saldo do estoque. |  | Ativa | `stock.adjust` |

### Compras

Fornecedores e pedidos de compra.

| Permissão | O que libera | Tela | Situação | Chave |
|---|---|---|---|---|
| Ver fornecedores | Abre a lista e a ficha dos fornecedores. | Compras › Fornecedores | Só esconde a tela | `supplier.read` |
| Cadastrar fornecedores | Cria fornecedores novos. |  | Sem efeito hoje | `supplier.create` |
| Editar fornecedores | Altera os dados do fornecedor. |  | Sem efeito hoje | `supplier.update` |
| Excluir fornecedores ⚠️ | Remove um fornecedor. |  | Sem efeito hoje | `supplier.delete` |
| Ver pedidos de compra | Abre os pedidos de compra e as entradas geradas por eles. | Compras › Pedidos de Compra | Só esconde a tela | `purchase.read` |
| Criar pedidos de compra | Cria pedidos de compra ao fornecedor. |  | Sem efeito hoje | `purchase.create` |
| Editar pedidos de compra | Altera itens, envia e confirma o pedido de compra. |  | Sem efeito hoje | `purchase.update` |
| Cancelar pedidos de compra ⚠️ | Cancela um pedido de compra. |  | Sem efeito hoje | `purchase.cancel` |

### Entregas e avarias

Expedição, entregas e ocorrências de avaria ou devolução.

| Permissão | O que libera | Tela | Situação | Chave |
|---|---|---|---|---|
| Ver entregas | Abre a expedição e os detalhes de cada entrega. | Estoque & Logística › Expedição / Entregas | Ativa | `delivery.read` |
| Agendar entregas | Cria uma entrega para um pedido. |  | Ativa | `delivery.create` |
| Atualizar entregas | Muda o status e os dados da entrega. |  | Ativa | `delivery.update` |
| Ver avarias e devoluções | Abre as ocorrências de avaria e devolução. | Estoque & Logística › Avarias (RMA) | Ativa | `rma.read` |
| Registrar e tratar avarias | Abre ocorrências e muda o andamento (reportar, resolver, reembolsar). |  | Ativa | `rma.manage` |

### Financeiro e comissões

Contas, cobranças, pagamentos e comissões de vendedores e arquitetos.

| Permissão | O que libera | Tela | Situação | Chave |
|---|---|---|---|---|
| Ver o financeiro | Abre a visão geral, as contas a pagar e as notas de serviço. | Financeiro › Visão Geral, Contas a Pagar e Notas de Serviço | Ativa | `finance.read` |
| Criar lançamentos financeiros | Cria lançamentos e despesas. |  | Sem efeito hoje | `finance.create` |
| Editar lançamentos financeiros | Altera lançamentos e despesas existentes. |  | Sem efeito hoje | `finance.update` |
| Gerar cobranças ⚠️ | Gera cobranças e faturas. |  | Ativa | `finance.charge` |
| Registrar pagamentos ⚠️ | Registra e dá baixa em pagamentos. |  | Ativa | `finance.payment` |
| Ver relatórios de comissão | Abre as comissões de vendedores e de arquitetos. | Financeiro › Comissões Vendedores e Arquitetos | Ativa | `commission.report.read` |
| Ver regras de comissão | Consulta as regras de comissão cadastradas. |  | Ativa | `commission.read` |
| Criar e alterar regras de comissão ⚠️ | Define percentuais de comissão por perfil. | Administração › Regras de Comissão | Ativa | `commission.manage` |

### Nota fiscal

Emitir, cancelar e configurar a NF-e.

| Permissão | O que libera | Tela | Situação | Chave |
|---|---|---|---|---|
| Baixar XML e DANFE | Baixa o XML e o PDF (DANFE) das notas emitidas. |  | Ativa | `fiscal.view` |
| Emitir notas fiscais ⚠️ | Revisa e emite a NF-e do pedido e pede nova tentativa de uma nota que ficou esperando a SEFAZ. |  | Ativa | `fiscal.emit` |
| Cancelar notas fiscais ⚠️ | Pede à SEFAZ o cancelamento de uma nota autorizada. |  | Ativa | `fiscal.cancel` |
| Configurar o módulo fiscal ⚠️ | Certificado digital, dados do emitente, regras de emissão e ambiente. | Administração › Configuração Fiscal | Ativa | `fiscal.config` |

### Administração

Usuários, papéis, configurações da loja, ambientes de venda e auditoria.

| Permissão | O que libera | Tela | Situação | Chave |
|---|---|---|---|---|
| Convidar e editar usuários ⚠️ | Convida pessoas, edita o cadastro e ativa ou desativa usuários da loja. |  | Ativa | `PROFESSIONAL_MANAGE` |
| Ver a lista de usuários | Consulta os usuários da loja. |  | Ativa | `PROFESSIONAL_READ` |
| Ver papéis e acessos | Abre a tela de papéis e a lista de usuários com o papel de cada um. | Administração › Papéis e Acessos | Ativa | `role.read` |
| Gerenciar papéis e usuários ⚠️ | Cria papéis, muda as permissões de cada papel e troca o papel de um usuário. | Administração › Usuários | Ativa | `role.manage` |
| Ver a auditoria | Abre o histórico de quem fez o quê no sistema. | Administração › Auditoria | Só esconde a tela | `audit.read` |
| Alterar configurações da loja ⚠️ | Taxa de entrega padrão e modelos (templates) de orçamento. | Administração › Configurações Globais e Templates | Ativa | `clinic.settings.manage` |
| Ver dados da loja | Consulta os dados cadastrais da loja. |  | Sem efeito hoje | `clinic.read` |
| Editar dados da loja ⚠️ | Altera os dados cadastrais da loja. |  | Sem efeito hoje | `clinic.update` |
| Excluir a loja ⚠️ | Remove a loja do sistema. |  | Sem efeito hoje | `clinic.delete` |
| Ver ambientes de venda | Abre os ambientes usados nos orçamentos (sala, cozinha...). | Administração › Ambientes | Ativa | `environment.read` |
| Cadastrar ambientes | Cria ambientes novos. |  | Ativa | `environment.create` |
| Editar ambientes | Altera o nome do ambiente. |  | Ativa | `environment.update` |
| Excluir ambientes ⚠️ | Remove um ambiente (a exclusão é definitiva). |  | Ativa | `environment.delete` |
| Ver usuários | Substituída por “Ver a lista de usuários”. |  | Sem efeito hoje | `user.read` |
| Criar usuários | Substituída por “Convidar e editar usuários”. |  | Sem efeito hoje | `user.create` |
| Editar usuários | Substituída por “Convidar e editar usuários”. |  | Sem efeito hoje | `user.update` |
| Remover usuários ⚠️ | Substituída por “Convidar e editar usuários”. |  | Sem efeito hoje | `user.delete` |
| Convidar usuários | Substituída por “Convidar e editar usuários”. |  | Sem efeito hoje | `user.invite` |
| Administrador da loja (acesso total antigo) ⚠️ | Marca de administrador do modelo antigo. |  | Sem efeito hoje | `CLINIC_ADMIN` |

### Permissões antigas (sem uso na loja)

Sobras do modelo de clínica. Não abrem nenhuma tela da loja; ficam guardadas só por segurança.

| Permissão | O que libera | Tela | Situação | Chave |
|---|---|---|---|---|
| Ver agendamentos | Do modelo de clínica. |  | Antiga (clínica) | `appointment.read` |
| Criar agendamentos | Do modelo de clínica. |  | Antiga (clínica) | `appointment.create` |
| Editar agendamentos | Do modelo de clínica. |  | Antiga (clínica) | `appointment.update` |
| Excluir agendamentos | Do modelo de clínica. |  | Antiga (clínica) | `appointment.delete` |
| Cancelar agendamentos | Do modelo de clínica. |  | Antiga (clínica) | `appointment.cancel` |
| Confirmar chegada | Do modelo de clínica. |  | Antiga (clínica) | `appointment.checkin` |
| Bloquear horários | Do modelo de clínica. |  | Antiga (clínica) | `schedule.block` |
| Ver atendimentos | Do modelo de clínica. |  | Antiga (clínica) | `encounter.read` |
| Iniciar atendimentos | Do modelo de clínica. |  | Antiga (clínica) | `encounter.start` |
| Editar atendimentos | Do modelo de clínica. |  | Antiga (clínica) | `encounter.update` |
| Finalizar atendimentos | Do modelo de clínica. |  | Antiga (clínica) | `encounter.close` |
| Ver pacientes | Do modelo de clínica. |  | Antiga (clínica) | `patient.read` |
| Cadastrar pacientes | Do modelo de clínica. |  | Antiga (clínica) | `patient.create` |
| Editar pacientes | Do modelo de clínica. |  | Antiga (clínica) | `patient.update` |
| Excluir pacientes | Do modelo de clínica. |  | Antiga (clínica) | `patient.delete` |
| Ver prontuários | Do modelo de clínica. |  | Antiga (clínica) | `record.read` |
| Criar prontuários | Do modelo de clínica. |  | Antiga (clínica) | `record.create` |
| Editar prontuários | Do modelo de clínica. |  | Antiga (clínica) | `record.update` |
| Ver procedimentos | Do modelo de clínica. |  | Antiga (clínica) | `procedure.read` |
| Criar procedimentos | Do modelo de clínica. |  | Antiga (clínica) | `procedure.create` |
| Editar procedimentos | Do modelo de clínica. |  | Antiga (clínica) | `procedure.update` |
| Ver consumíveis | Do modelo de clínica. |  | Antiga (clínica) | `consumable.read` |
| Adicionar consumíveis | Do modelo de clínica. |  | Antiga (clínica) | `consumable.add` |
| Ver especialidades | Do modelo de clínica. |  | Antiga (clínica) | `specialty.read` |
| Criar especialidades | Do modelo de clínica. |  | Antiga (clínica) | `specialty.create` |
| Editar especialidades | Do modelo de clínica. |  | Antiga (clínica) | `specialty.update` |
| Excluir especialidades | Do modelo de clínica. |  | Antiga (clínica) | `specialty.delete` |
| Ver avisos | Do modelo de clínica. |  | Antiga (clínica) | `notice.read` |
| Criar avisos | Do modelo de clínica. |  | Antiga (clínica) | `notice.create` |
| Editar avisos | Do modelo de clínica. |  | Antiga (clínica) | `notice.update` |
| Excluir avisos | Do modelo de clínica. |  | Antiga (clínica) | `notice.delete` |
| Ver estoque (antigo) | Substituída por “Ver saldos e movimentações”. |  | Antiga (clínica) | `stock.read` |
| Criar itens de estoque (antigo) | Substituída por “Lançar entradas, saídas e ajustes”. |  | Antiga (clínica) | `stock.create` |
| Editar itens de estoque (antigo) | Substituída por “Lançar entradas, saídas e ajustes”. |  | Antiga (clínica) | `stock.update` |
