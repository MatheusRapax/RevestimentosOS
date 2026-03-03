# PROJETO: Integração RMA ↔ Pedidos (Order Sync)

## 1. Contexto e Objetivo
Conectar o módulo de **Avarias (RMA)** diretamente ao ciclo de vida de **Vendas (Pedidos)**.
O objetivo é garantir que toda vez que um item do pedido for registrado como avariado (na entrega ou durante a separação), o Pedido reflita esse bloqueio no seu Status, pausando a finalização. Ao receber a peça em reposição, o lojista poderá optar por alocar esse material automaticamente de volta para a reserva do mesmo pedido, destravando a entrega para o cliente final.

## 2. Ponto a Ponto da Integração (Arquitetura)

### A. Novo Status de Pedido (`OrderStatus`)
- Adição obrigatória do status `AGUARDANDO_REPOSICAO` no `schema.prisma`.

### B. Notificando o Pedido do Atraso (RMA ➡️ Pedido)
Quando um item do pedido tiver uma `Occurrence` registrada no painel de Avarias:
1. O Pedido obrigatoriamente terá seu status atualizado para `AGUARDANDO_REPOSICAO`.
2. O saldo quebrado será fisicamente baixado do estoque como uma avaria.
3. Isso impede o faturamento e a expedição de um material irreal.

### C. Dando a Escolha da Reposição (RMA ↔ Estoque ↔ Pedido)
Quando a fábrica repõe a peça avariada, e a Ocorrência é marcada como `RESOLVIDO`:
1. Uma **janela de decisão** será aberta ao lojista com o checklist de destino:
   - **Opção A (Destinar ao Pedido):** Cria a entrada de novo material `REPOSICAO-RMA-XXX` no estoque, mas **IMEDIATAMENTE** o vincula à linha de reserva do Pedido original correspondente àquela avaria. O Pedido volta a ter 100% dos itens e seu status transita de `AGUARDANDO_REPOSICAO` para o estágio normal da logística (ex: `SEPARADO`, `EXPEDICAO`).
   - **Opção B (Estoque Livre):** Cria o material `REPOSICAO-RMA-XXX` e deixa ele sumariamente solto na contagem de prateleira, sem vinculação com nenhum pedido anterior.

### D. Ajustes de UI / UX
- Tela de "Alterar Status da Ocorrência" no Painel RMA com o checkbox para "Alocar reposição ao Pedido Original?".
- Tela de "Detalhes do Pedido" precisa mostrar uma tarja ou aviso claro "⚠️ Este pedido aguarda resolução de RMA sob protocolo #1234".

---

## 3. Checklist de Implementação (Fase de Código Mínima)

### Prisma & Banco de Dados
- [ ] Mudar `enum OrderStatus` para incluir `AGUARDANDO_REPOSICAO`.
- [ ] Rodar _prisma migrate_ e _generate_.

### Backend (`OrderService` & `OccurrenceService`)
- [ ] Escutar quando a Ocorrência nasce (`createOccurrence` -> se tem `orderId`, mudar pedido para `AGUARDANDO_REPOSICAO`).
- [ ] Modificar transação de `RESOLVIDO` para injetar o estoque e (condicionalmente) aplicar o ajuste na reserva (`Reservation`).
- [ ] Atualizar status do pedido correspondente pós-reposição se aplicável.

### Frontend (`Occurrences` e `Orders`)
- [ ] Renderizar o modal ao marcar como Resolvido perguntando o Destino.
- [ ] Exibir etiqueta do Status "AGUARDANDO_REPOSICAO" em laranja/amarelo.
- [ ] Mostrar aviso da avaria na tela de Resumo do Pedido.

---

## 4. Dúvidas & Gatilho Socrático (Em Aprovação)
O desenvolvimento deste fluxo depende de respostas às questões de "Gatelink" que podem implicar em desdobramentos lógicos mais profundos durante programação.
