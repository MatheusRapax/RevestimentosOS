'use client';

import React, { useEffect, useState } from 'react';
import {
    BookOpen,
    ChevronRight,
    Info,
    AlertTriangle,
    ArrowRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Estrutura do manual                                                */
/* ------------------------------------------------------------------ */

type Note = { tone?: 'info' | 'warn' | 'crit'; label: string; body: React.ReactNode };

type ModuleDoc = {
    id: string;
    path: string;
    title: string;
    lead: React.ReactNode;
    screen?: { route: string; head: string; sub?: string; cols: string[]; rows: (string | React.ReactNode)[][] };
    steps?: React.ReactNode[];
    notes?: Note[];
    flow?: { label: string; tone?: PillTone }[];
};

type Group = { id: string; title: string; modules: ModuleDoc[] };

type PillTone = 'ok' | 'warn' | 'crit' | 'info' | 'mut';

const pillClass: Record<PillTone, string> = {
    ok: 'bg-green-100 text-green-700',
    warn: 'bg-amber-100 text-amber-700',
    crit: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    mut: 'bg-gray-100 text-gray-500',
};

const GROUPS: Group[] = [
    {
        id: 'comecar',
        title: 'Começar aqui',
        modules: [
            {
                id: 'acesso',
                path: 'Tela de login',
                title: 'Acesso e painel inicial',
                lead: (
                    <>
                        Entre com o <b>e-mail</b> e a <b>senha</b> fornecidos pela loja. Cada usuário pertence a uma
                        loja (multi-loja): o nome da loja ativa aparece no topo, ao lado do seu nome. Depois de entrar
                        você cai no <b>painel</b>, montado por você com <b>Atalhos</b> e <b>Widgets</b> (alertas de
                        estoque, contas a vencer, pedidos pendentes, receita do dia, entregas, avarias, desempenho de
                        vendedores/arquitetos).
                    </>
                ),
                notes: [
                    {
                        label: 'Barra lateral',
                        body: (
                            <>
                                O menu é agrupado por área (Comercial, Estoque &amp; Logística, Compras, Financeiro,
                                Administração). A <b>loja ativa</b> e a <b>versão</b> ficam no topo e no rodapé do menu;
                                <b> Sair</b> no canto superior direito.
                            </>
                        ),
                    },
                ],
            },
        ],
    },
    {
        id: 'comercial',
        title: 'Comercial',
        modules: [
            {
                id: 'clientes',
                path: 'Comercial › Clientes',
                title: 'Clientes',
                lead: (
                    <>
                        Cadastro de quem compra — pessoa física ou jurídica. Cada cliente pode ter um{' '}
                        <b>arquiteto indicador</b> padrão (usado no cálculo de comissão) e um <b>limite de crédito</b>.
                    </>
                ),
                screen: {
                    route: '/dashboard/clientes',
                    head: 'Clientes',
                    sub: 'Gerencie o cadastro de clientes (PF e PJ)',
                    cols: ['Nome', 'Tipo', 'Documento', 'Arquiteto', 'Status'],
                    rows: [
                        ['Construtora Horizonte', 'PJ', '55.555.555/0001-55', '—', <Pill key="s" tone="ok">Ativo</Pill>],
                        ['João Pedro Silva', 'PF', '444.444.444-44', 'Ana Lúcia Arquitetura', <Pill key="s" tone="ok">Ativo</Pill>],
                    ],
                },
                steps: [
                    <><b>Novo Cliente</b> → escolha <b>PF</b> ou <b>PJ</b>, preencha nome, documento, contato e endereço.</>,
                    <>Se houver arquiteto que indica esse cliente, selecione em <b>Arquiteto</b> — a comissão do arquiteto passa a valer para as vendas dele.</>,
                    <>Busque por nome; filtre por <b>PF / PJ</b> nas abas.</>,
                ],
            },
            {
                id: 'arquitetos',
                path: 'Comercial › Arquitetos',
                title: 'Arquitetos',
                lead: (
                    <>
                        Parceiros que indicam clientes e recebem comissão. A coluna <b>Comissão</b> mostra qual regra se
                        aplica (a <Mono>Regra Global</Mono> ou uma específica).
                    </>
                ),
                screen: {
                    route: '/dashboard/arquitetos',
                    head: 'Arquitetos',
                    sub: 'Gerencie arquitetos parceiros e comissões',
                    cols: ['Nome', 'CPF', 'Comissão', 'Status'],
                    rows: [
                        ['Ana Lúcia Arquitetura', '111.111.111-11', <Pill key="c" tone="info">Regra Global</Pill>, <Pill key="s" tone="ok">Ativo</Pill>],
                        ['Beto Costa Studio', '222.222.222-22', <Pill key="c" tone="info">Regra Global</Pill>, <Pill key="s" tone="ok">Ativo</Pill>],
                    ],
                },
                steps: [
                    <><b>Novo Arquiteto</b> → nome, CPF, contato.</>,
                    <>Para uma taxa diferente da global, associe uma <b>regra de comissão específica</b> (ver <A href="#comissoes-regra">Regras de comissão</A>).</>,
                    <>O acompanhamento fica em <A href="#comissoes-rel">Financeiro › Comissões Arquitetos</A>.</>,
                ],
            },
            {
                id: 'orcamentos',
                path: 'Comercial › Orçamentos',
                title: 'Orçamentos',
                lead: (
                    <>
                        O ponto de partida da venda. Você informa a <b>área em m²</b> e o sistema converte para{' '}
                        <b>caixas</b>, arredondando para cima pela cobertura de cada caixa (m²/caixa). Aceita desconto por
                        item e global, margem de perda e taxa de entrega. Gera <b>PDF</b> para o cliente.
                    </>
                ),
                screen: {
                    route: '/dashboard/orcamentos',
                    head: 'Orçamentos',
                    sub: 'Gerencie orçamentos e converta em pedidos',
                    cols: ['Nº', 'Cliente', 'Arquiteto', 'Status', 'Total'],
                    rows: [
                        ['#00039', 'João Pedro Silva', 'Ana Lúcia Arquitetura', <Pill key="s" tone="mut">Convertido</Pill>, 'R$ 1.652,00'],
                        ['#00040', 'Construtora Horizonte', '—', <Pill key="s" tone="info">Aprovado</Pill>, 'R$ 114,00'],
                    ],
                },
                flow: [
                    { label: 'Rascunho', tone: 'mut' },
                    { label: 'Enviado', tone: 'warn' },
                    { label: 'Aprovado', tone: 'info' },
                    { label: 'Convertido', tone: 'ok' },
                ],
                notes: [
                    {
                        label: 'm² → caixas',
                        body: (
                            <>
                                Ex.: um porcelanato com <b>1,44 m²/caixa</b>. Você pede <b>20 m²</b> → 20 ÷ 1,44 = 13,9 → o
                                sistema arredonda para <b>14 caixas</b> (20,16 m²). Você também pode digitar as caixas
                                direto.
                            </>
                        ),
                    },
                ],
                steps: [
                    <><b>Novo Orçamento</b> → cliente, (arquiteto), itens (por área m² ou caixas), ajustes globais. Salvar.</>,
                    <><b>Abrir PDF</b> para enviar ao cliente. Use <b>Enviar</b> quando mandar oficialmente.</>,
                    <>Cliente aceitou → <b>Aprovar</b> → <b>Converter em Pedido</b>. O orçamento fica <Mono>Convertido</Mono>.</>,
                    <>Cliente recusou → <b>Rejeitar</b> (pede o motivo). Dá para <b>Reabrir</b> depois. <b>Duplicar</b> aproveita um parecido.</>,
                ],
            },
            {
                id: 'pedidos',
                path: 'Comercial › Pedidos',
                title: 'Pedidos',
                lead: (
                    <>
                        O orçamento convertido vira pedido. Aqui você <b>recebe o pagamento</b>, acompanha a{' '}
                        <b>separação</b> e a <b>entrega</b>. Ao abrir um pedido há duas abas — <Mono>Detalhes</Mono>{' '}
                        (itens, valores, ações) e <Mono>Financeiro</Mono> (pagamentos e boletos).
                    </>
                ),
                screen: {
                    route: '/dashboard/pedidos',
                    head: 'Pedidos',
                    sub: 'Gerencie os pedidos de venda',
                    cols: ['Pedido', 'Cliente', 'Status', 'Logística', 'Total'],
                    rows: [
                        ['#0009', 'Construtora Horizonte', <Pill key="s" tone="ok">Pago</Pill>, <Pill key="l" tone="warn">Em separação</Pill>, 'R$ 1.652,00'],
                        ['#0010', 'João Pedro Silva', <Pill key="s" tone="mut">Criado</Pill>, <Pill key="l" tone="mut">Pendente</Pill>, 'R$ 76,00'],
                    ],
                },
                flow: [
                    { label: 'Criado', tone: 'mut' },
                    { label: 'Pago', tone: 'ok' },
                    { label: 'Aguardar Material', tone: 'info' },
                    { label: 'Pronto p/ Entrega', tone: 'warn' },
                    { label: 'Entregue', tone: 'ok' },
                ],
                notes: [
                    {
                        tone: 'warn',
                        label: 'Regras importantes',
                        body: (
                            <>
                                <b>Só entrega pedido pago</b> — não dá para pular de <Mono>Criado</Mono> direto para{' '}
                                <Mono>Entregue</Mono>. O pagamento é <b>"tudo ou nada"</b>: se um pagamento do split
                                falhar, nada é gravado — refaça. A soma dos pagamentos <b>não pode passar do total</b>.
                            </>
                        ),
                    },
                    {
                        label: 'Conta-corrente do cliente',
                        body: (
                            <>
                                Ao marcar <b>Pago</b>, o sistema lança a cobrança e os pagamentos na conta do cliente — o
                                saldo do pedido fecha em <b>zero</b>. Saldo <b>negativo</b> = o cliente deve. Cancelar um
                                pedido pago lança o estorno automaticamente.
                            </>
                        ),
                    },
                ],
                steps: [
                    <>Abra o pedido → <b>Confirmar / Pago</b> → informe o(s) pagamento(s) (PIX, cartão, dinheiro, boleto — dá para dividir) → <b>Confirmar</b>.</>,
                    <>Falta material? <b>Aguardar Material</b> e siga o <A href="#fluxo-compra">fluxo B</A>.</>,
                    <>Estoque reservado → <b>Marcar como Pronto</b>.</>,
                    <>Retirada na loja → <b>Retirado na Loja</b>. Entrega → agende em <A href="#entregas">Expedição</A> (o status do pedido muda sozinho).</>,
                    <><b>Gerar Boleto</b> (aba Financeiro) só para pedido <b>não pago</b>; não gera duplicado.</>,
                ],
            },
        ],
    },
    {
        id: 'estoque',
        title: 'Estoque & Logística',
        modules: [
            {
                id: 'estoque-geral',
                path: 'Estoque & Logística › Visão Geral',
                title: 'Visão geral do estoque',
                lead: (
                    <>
                        Consulta do que há disponível. Distingue <b>Físico</b> (em depósito), <b>Reservado</b> (preso a
                        pedidos) e <b>Disponível</b> (físico − reservado). Cards no topo: total de produtos, estoque
                        baixo, sem disponibilidade.
                    </>
                ),
                screen: {
                    route: '/dashboard/estoque',
                    head: 'Estoque',
                    sub: 'Visão geral do estoque disponível',
                    cols: ['Produto', 'SKU', 'Físico', 'Reserv.', 'Disp.', 'Status'],
                    rows: [
                        ['Porcelanato Bianco 60×60', 'PORC-BIA-6060', '180', '32', '148', <Pill key="s" tone="ok">Disponível</Pill>],
                        ['Argamassa AC-III 20kg', 'ARG-ACIII-20', '12', '0', '12', <Pill key="s" tone="warn">Baixa</Pill>],
                    ],
                },
            },
            {
                id: 'produtos',
                path: 'Estoque & Logística › Produtos',
                title: 'Produtos',
                lead: (
                    <>
                        O cadastro. Além de nome e <b>SKU</b>, guarda dados dimensionais (formato, <b>m²/caixa</b>,
                        peças/caixa, caixas/pallet, peso), cor/linha/uso, dados fiscais e preços de <b>custo</b> e{' '}
                        <b>venda</b>. Dá para <b>importar por planilha</b> e escolher as colunas visíveis.
                    </>
                ),
                notes: [
                    {
                        label: 'Custo do produto — custo médio móvel',
                        body: (
                            <>
                                O custo <b>não</b> é o da última nota. A cada <A href="#movimentacoes">entrada de
                                estoque</A> o sistema recalcula a <b>média ponderada</b> entre o saldo que você já tinha e
                                a nova nota. É esse custo médio que aparece na <b>valoração de estoque</b> e na{' '}
                                <b>margem</b> do orçamento.
                            </>
                        ),
                    },
                ],
                steps: [
                    <><b>Novo Produto</b> → nome, SKU, unidade. Para revestimento em m², preencha <b>m²/caixa</b> — é o que converte área em caixas.</>,
                    <>Preços: <b>custo</b> e <b>venda</b>. O custo inicial pode ser ajustado; depois passa a ser calculado por média a cada entrada.</>,
                    <><b>Importar</b> → suba a planilha, confira o mapeamento das colunas, confirme. <b>Colunas</b> escolhe o que aparece na lista.</>,
                ],
            },
            {
                id: 'movimentacoes',
                path: 'Estoque & Logística › Movimentações',
                title: 'Movimentações',
                lead: (
                    <>
                        O histórico completo (entradas, saídas, avarias) e o lugar de <b>lançar entrada</b> (recebimento
                        de NF) e <b>saída</b> (requisição/ajuste). Movimentações começadas e não concluídas ficam em{' '}
                        <b>Trabalhos Pendentes</b> para retomar. A tela de nova entrada tem os blocos{' '}
                        <Mono>Dados da Entrada</Mono>, <Mono>Dados Fiscais</Mono> (nº da NF, série, natureza, emissão) e{' '}
                        <Mono>Faturas / Duplicatas</Mono>. Se a entrada vem de um <b>pedido de compra</b>, os itens já vêm
                        carregados.
                    </>
                ),
                notes: [
                    {
                        tone: 'warn',
                        label: 'Divergência de nota',
                        body: (
                            <>
                                Se o <b>valor</b> ou a <b>quantidade</b> da NF não bate com o pedido de compra, a
                                confirmação é <b>bloqueada</b>. Para prosseguir: <b>forçar confirmação</b> +{' '}
                                <b>justificativa</b> (e, conforme a configuração, <b>e-mail e senha do supervisor</b>). A
                                nota forçada <b>entra na média</b> do custo — não sobrescreve o estoque anterior.
                            </>
                        ),
                    },
                ],
            },
            {
                id: 'avarias',
                path: 'Estoque & Logística › Avarias (RMA)',
                title: 'Avarias / RMA',
                lead: (
                    <>
                        Registro de produto quebrado, com defeito ou devolvido. Três tipos: <b>Recebimento</b> (chegou
                        avariado do fornecedor), <b>Entrega</b> (quebrou no transporte / o cliente devolveu) e{' '}
                        <b>Defeito / Garantia</b> (defeito de fabricação relatado depois).
                    </>
                ),
                screen: {
                    route: '/dashboard/estoque/ocorrencias',
                    head: 'Ocorrências (Avarias e RMA)',
                    sub: 'Produtos avariados, defeitos e suporte com fornecedores/clientes',
                    cols: ['Número', 'Tipo', 'Referência', 'Status'],
                    rows: [
                        ['RMA-12', 'Defeito / Garantia', 'João Pedro Silva', <Pill key="s" tone="warn">Reportado</Pill>],
                        ['RMA-11', 'Entrega', 'Pedido #0007', <Pill key="s" tone="ok">Resolvido</Pill>],
                    ],
                },
                flow: [
                    { label: 'Rascunho', tone: 'mut' },
                    { label: 'Reportado', tone: 'warn' },
                    { label: 'Aguardando Fornecedor', tone: 'info' },
                    { label: 'Resolvido / Reembolsado', tone: 'ok' },
                ],
                steps: [
                    <><b>Reportado</b> — baixa a quantidade do estoque como <b>perda</b> e gera movimento de <b>Avaria</b>. Se ligada a um pedido, o pedido entra em "aguardando reposição".</>,
                    <><b>Resolvido</b> — o fornecedor repôs → a quantidade <b>volta ao estoque</b> (só Recebimento e Defeito).</>,
                    <><b>Reembolsado</b> — em vez de repor, o valor vira <b>crédito na conta-corrente do cliente</b>.</>,
                    <><b>Cancelar</b> depois de reportado <b>devolve</b> o estoque que tinha sido baixado.</>,
                ],
                notes: [
                    {
                        tone: 'crit',
                        label: 'Atenção',
                        body: (
                            <>
                                "Reportado", "Resolvido" e "Reembolsado" <b>mexem em estoque e/ou dinheiro</b>. Só marque
                                quando de fato aconteceu. É obrigatório <b>reportar antes</b> de resolver ou reembolsar — o
                                sistema recusa transições fora de ordem.
                            </>
                        ),
                    },
                ],
            },
            {
                id: 'entregas',
                path: 'Estoque & Logística › Expedição / Entregas',
                title: 'Expedição / Entregas',
                lead: (
                    <>
                        Agendamento e rastreio das entregas. Cada entrega é ligada a <b>um pedido</b>. Só é possível
                        agendar para pedidos em <b>Pronto para Entrega</b> ou <b>Em Separação</b>.
                    </>
                ),
                notes: [
                    {
                        label: 'Automático',
                        body: (
                            <>
                                Ao <b>despachar</b> a entrega, o pedido vira <Mono>Saiu para Entrega</Mono>. Ao marcar{' '}
                                <b>Entregue</b>, o pedido vira <Mono>Entregue</Mono>. Você não precisa mexer no pedido à
                                mão.
                            </>
                        ),
                    },
                ],
            },
        ],
    },
    {
        id: 'compras',
        title: 'Compras',
        modules: [
            {
                id: 'fornecedores',
                path: 'Compras › Fornecedores',
                title: 'Fornecedores',
                lead: (
                    <>
                        Cadastro de quem abastece a loja. Cards de <b>Total / Ativos / Inativos</b>; busca por nome, CNPJ
                        ou e-mail. Fornecedores inativos ficam ocultos por padrão (<b>Mostrar Inativos</b>).
                    </>
                ),
            },
            {
                id: 'compras-pc',
                path: 'Compras › Pedidos de Compra',
                title: 'Pedidos de compra',
                lead: (
                    <>
                        A ordem de compra ao fornecedor. Pode ser <b>vinculada a um pedido de venda</b> (cross-docking:
                        você compra por causa de uma venda específica). Aceita <b>recebimento parcial</b>. O total
                        comprado do mês aparece no card <b>Total em Compras</b>.
                    </>
                ),
                screen: {
                    route: '/dashboard/compras',
                    head: 'Pedidos de Compra',
                    sub: 'Gerencie suas compras com fornecedores',
                    cols: ['Pedido', 'Fornecedor', 'Status', 'Previsão', 'Total'],
                    rows: [
                        ['PC-0039', 'Cerâmica XYZ Brasil', <Pill key="s" tone="warn">Enviado</Pill>, '10/09/2026', 'R$ 3.600,00'],
                        ['PC-0038', 'Argamassas Forte', <Pill key="s" tone="ok">Recebido</Pill>, '02/09/2026', 'R$ 2.500,00'],
                    ],
                },
                flow: [
                    { label: 'Rascunho', tone: 'mut' },
                    { label: 'Enviado', tone: 'warn' },
                    { label: 'Confirmado', tone: 'info' },
                    { label: 'Parcial', tone: 'warn' },
                    { label: 'Recebido', tone: 'ok' },
                ],
                steps: [
                    <><b>Novo Pedido</b> → fornecedor, itens (produto, quantidade, preço), previsão de entrega. Opcional: vincular a uma venda.</>,
                    <>Mande ao fornecedor → <b>Enviado</b> → <b>Confirmado</b> quando ele aceitar.</>,
                    <>Mercadoria chegou → gere a <b>entrada de estoque a partir do pedido de compra</b> (ver <A href="#fluxo-compra">fluxo B</A>).</>,
                    <>Opcional: <b>Lançar no Contas a Pagar</b> gera a despesa já vinculada.</>,
                ],
            },
        ],
    },
    {
        id: 'financeiro',
        title: 'Financeiro',
        modules: [
            {
                id: 'fin-geral',
                path: 'Financeiro › Visão Geral',
                title: 'Visão geral (dashboard financeiro)',
                lead: (
                    <>
                        Duas abas: <Mono>Dashboard</Mono> (indicadores do mês) e <Mono>Receitas Financeiras</Mono>{' '}
                        (entradas de dinheiro detalhadas por método). Escolha mês/ano no topo. Cards: Faturamento
                        (recebido), Lucro Bruto, Pedidos, Taxa de Conversão, Valor em Estoque (Custo / Venda), Lucro
                        Projetado.
                    </>
                ),
                notes: [
                    {
                        label: 'O que é "Faturamento"',
                        body: (
                            <>
                                O card <b>Faturamento (recebido)</b> conta <b>dinheiro que entrou</b> (pagamentos), não a
                                soma dos pedidos. O total dos pedidos aparece na linha <b>"Pedidos faturados"</b>. A aba{' '}
                                <b>Receitas Financeiras</b> detalha por método (PIX, cartão…) e lista as entradas do mês.
                            </>
                        ),
                    },
                ],
            },
            {
                id: 'contas-pagar',
                path: 'Financeiro › Contas a Pagar',
                title: 'Contas a pagar',
                lead: (
                    <>
                        As despesas da loja. Cards: <b>Total Vencido</b>, <b>Total Pendente</b>, <b>Pago (Este Mês)</b>.
                        Filtro por status (A Vencer / Vencidas / Pagas).
                    </>
                ),
                screen: {
                    route: '/dashboard/financeiro/contas-a-pagar',
                    head: 'Contas a Pagar',
                    sub: 'Gerencie suas despesas e pagamentos',
                    cols: ['Descrição', 'Tipo', 'Vencimento', 'Valor', 'Status'],
                    rows: [
                        ['Aluguel loja set/26', 'Operacional', '10/09/2026', 'R$ 4.500,00', <Pill key="s" tone="warn">A vencer</Pill>],
                        ['Energia ago/26', 'Operacional', '31/08/2026', 'R$ 870,00', <Pill key="s" tone="crit">Vencida</Pill>],
                    ],
                },
                steps: [
                    <><b>Nova Despesa</b> → descrição, <b>valor</b>, <b>vencimento</b>, <b>tipo</b> (Operacional / Fornecedor / Imposto / Comissão / Outro). Opcional: beneficiário e linha digitável do boleto.</>,
                    <>Quando pagar, clique em <b>Pagar</b> na linha — ela vai para <b>Pago (Este Mês)</b>. Pagar de novo não faz nada.</>,
                    <>Despesa de pedido de compra pode ser criada pelo botão <b>Lançar no Contas a Pagar</b> lá em <A href="#compras-pc">Compras</A>.</>,
                ],
            },
            {
                id: 'notas-servico',
                path: 'Financeiro › Notas de Serviço',
                title: 'Notas de serviço (tomadas)',
                lead: (
                    <>
                        Notas de serviço que a loja <b>recebe</b> — frete, instalação, manutenção. Entram como despesa em
                        Contas a Pagar, com os dados do prestador. Só o <b>valor</b> é obrigatório; o resto tem
                        preenchimento padrão.
                    </>
                ),
            },
            {
                id: 'comissoes-rel',
                path: 'Financeiro › Comissões Vendedores · Comissões Arquitetos',
                title: 'Comissões — relatórios',
                lead: (
                    <>
                        Acompanhamento por período. <b>Vendedor</b> = quem criou o pedido. <b>Arquiteto</b> = quem indicou
                        (no orçamento, ou o arquiteto padrão do cliente). O valor sai da <A href="#comissoes-regra">regra
                        de comissão</A> ativa e do tier correspondente ao volume de vendas do período.
                    </>
                ),
                screen: {
                    route: '/dashboard/financeiro/vendedores',
                    head: 'Desempenho por Vendedor',
                    sub: 'Análise de vendas e comissões da equipe',
                    cols: ['#', 'Vendedor', 'Faturamento', 'Comissão'],
                    rows: [
                        ['1', 'Administrador Mosaic', 'R$ 12.890', 'R$ 257,80'],
                    ],
                },
                notes: [
                    {
                        label: 'Se aparecer zerado',
                        body: (
                            <>
                                O relatório lista quem tem o <b>papel de vendedor</b> ou quem consta como vendedor de
                                algum pedido no período. Sem pedidos no mês, fica vazio — normal.
                            </>
                        ),
                    },
                ],
            },
            {
                id: 'comissoes-regra',
                path: 'Administração › Regras de Comissão',
                title: 'Regras de comissão',
                lead: (
                    <>
                        Define <b>quanto</b> cada venda gera de comissão. Uma regra pode ser <b>Global</b> (vale para
                        todos) ou específica de um vendedor/arquiteto. Tem <b>tiers</b> (faixas por meta mensal): quanto
                        mais vende no mês, maior o percentual.
                    </>
                ),
                steps: [
                    <><b>Nova Regra</b> → nome, alvo (<b>Vendedor</b> ou <b>Arquiteto</b>), apuração <b>Mensal</b>, marque <b>Global</b> se vale para todos.</>,
                    <>Adicione <b>tiers</b>: "a partir de R$ X → Y%". O primeiro sempre começa em R$ 0. Máximo 100% por faixa; pelo menos um tier.</>,
                    <>Para uma taxa diferente de um parceiro, crie a regra <b>não-global</b> e associe a ele em <A href="#arquitetos">Arquitetos</A>.</>,
                    <>Os valores calculados aparecem em <A href="#comissoes-rel">Financeiro › Comissões</A> e no detalhe de cada pedido.</>,
                ],
            },
        ],
    },
];

/* ------------------------------------------------------------------ */
/*  Fluxos completos                                                   */
/* ------------------------------------------------------------------ */

type FlowStep = { title: string; body: React.ReactNode; route?: string; chain?: { label: string; tone?: PillTone }[] };
type FlowDoc = { id: string; tag: string; title: string; steps: FlowStep[] };

const FLOWS: FlowDoc[] = [
    {
        id: 'fluxo-venda',
        tag: 'Fluxo A',
        title: 'Venda de ponta a ponta',
        steps: [
            {
                title: 'Criar o orçamento',
                route: '/dashboard/orcamentos/novo',
                body: <>Escolha o cliente e, se houver, o arquiteto. Adicione os itens pela <b>área em m²</b> (o sistema calcula as caixas) e aplique desconto / taxa de entrega. Salve e use <b>Abrir PDF</b> para enviar ao cliente.</>,
            },
            {
                title: 'Aprovar e converter',
                body: <>Cliente aceitou → no orçamento, <b>Enviar</b> → <b>Aprovar</b> → <b>Converter em Pedido</b>. Um pedido novo aparece em <b>Comercial › Pedidos</b> como <Mono>Criado</Mono>.</>,
            },
            {
                title: 'Receber o pagamento',
                body: <>Abra o pedido → <b>Confirmar / Pago</b>. Informe um ou mais pagamentos — a soma tem que fechar com o total. O estoque é <b>reservado</b> automaticamente e a conta-corrente do cliente fecha em zero.</>,
                chain: [{ label: 'Criado', tone: 'mut' }, { label: 'Pago', tone: 'ok' }],
            },
            {
                title: 'Separar',
                body: <>Com o estoque reservado, use <b>Marcar como Pronto</b>. (Se faltar material, use antes <b>Aguardar Material</b> e siga o fluxo B.)</>,
                chain: [{ label: 'Pago', tone: 'ok' }, { label: 'Pronto p/ Entrega', tone: 'warn' }],
            },
            {
                title: 'Entregar ou retirar',
                body: <><b>Retirada na loja:</b> botão <b>Retirado na Loja</b>. <b>Entrega:</b> vá em <b>Estoque &amp; Logística › Expedição</b> → <b>Agendar Entrega</b>. Ao despachar/entregar, o pedido muda de status sozinho.</>,
                chain: [{ label: 'Pronto', tone: 'warn' }, { label: 'Saiu para Entrega', tone: 'info' }, { label: 'Entregue', tone: 'ok' }],
            },
            {
                title: 'Conferir no financeiro',
                body: <>O pagamento aparece em <b>Financeiro › Visão Geral</b> (aba <b>Receitas Financeiras</b>) e no card <b>Faturamento (recebido)</b>. A comissão entra nos relatórios de <b>Financeiro › Comissões</b>.</>,
            },
        ],
    },
    {
        id: 'fluxo-compra',
        tag: 'Fluxo B',
        title: 'Compra e recebimento de nota fiscal',
        steps: [
            {
                title: 'Criar o pedido de compra',
                route: '/dashboard/compras',
                body: <>Fornecedor, itens (produto, quantidade, preço unitário), previsão de entrega. Se a compra é por causa de uma venda específica, <b>vincule ao pedido de venda</b>.</>,
            },
            {
                title: 'Enviar e confirmar',
                body: <>Mande ao fornecedor → <b>Enviado</b>. Quando ele aceitar → <b>Confirmado</b>.</>,
                chain: [{ label: 'Rascunho', tone: 'mut' }, { label: 'Enviado', tone: 'warn' }, { label: 'Confirmado', tone: 'info' }],
            },
            {
                title: 'Gerar a entrada a partir do pedido de compra',
                route: '/dashboard/estoque/entradas/nova',
                body: <>Mercadoria chegou → gere a <b>entrada de estoque a partir do pedido de compra</b>. Os itens já vêm carregados. Preencha os <b>Dados Fiscais</b> da NF (número, série, natureza, emissão).</>,
            },
            {
                title: 'Conferir divergências e confirmar',
                body: <>Se a NF <b>bate</b> com o pedido → <b>Confirmar</b>: o estoque entra e o <b>custo médio</b> do produto é recalculado. <b>Se divergir</b>, o sistema bloqueia — use <b>Forçar Confirmação</b> + <b>Justificativa</b> (e e-mail/senha do supervisor, se exigido). A nota forçada entra na média, não sobrescreve o estoque anterior.</>,
            },
            {
                title: 'Lançar a despesa (opcional)',
                body: <>No pedido de compra, <b>Lançar no Contas a Pagar</b> cria a despesa já vinculada, com vencimento e linha digitável do boleto.</>,
            },
        ],
    },
    {
        id: 'fluxo-rma',
        tag: 'Fluxo C',
        title: 'Avaria / RMA',
        steps: [
            {
                title: 'Abrir a ocorrência',
                route: '/dashboard/estoque/ocorrencias/nova',
                body: <>Escolha o <b>tipo</b> (Recebimento, Entrega ou Defeito / Garantia). Ligue ao <b>cliente</b>, <b>pedido</b> ou <b>pedido de compra</b> conforme o caso. Adicione os <b>produtos avariados</b> com quantidade e motivo.</>,
            },
            {
                title: 'Reportar',
                body: <>Mude o status para <b>Reportado</b>. Isso <b>baixa a quantidade do estoque</b> como perda e gera um movimento de <b>Avaria</b>. É obrigatório reportar antes de qualquer outra coisa.</>,
                chain: [{ label: 'Rascunho', tone: 'mut' }, { label: 'Reportado', tone: 'warn' }],
            },
            {
                title: 'Tratar com o fornecedor',
                body: <>Mude para <b>Aguardando Fornecedor</b> enquanto negocia a reposição ou o crédito.</>,
            },
            {
                title: 'Fechar: Resolvido ou Reembolsado',
                body: <><b>Resolvido</b> — o fornecedor repôs → a quantidade <b>volta ao estoque</b>. <b>Reembolsado</b> — em vez de repor, o valor vira <b>crédito na conta-corrente do cliente</b>. Precisa desistir? <b>Cancelar</b> depois de reportado <b>devolve</b> o estoque.</>,
                chain: [{ label: 'Aguardando Fornecedor', tone: 'info' }, { label: 'Resolvido / Reembolsado', tone: 'ok' }],
            },
        ],
    },
    {
        id: 'fluxo-despesa',
        tag: 'Fluxo D',
        title: 'Lançar uma conta a pagar',
        steps: [
            {
                title: 'Nova despesa',
                route: '/dashboard/financeiro/contas-a-pagar',
                body: <>Descrição, <b>valor</b>, <b>vencimento</b> e <b>tipo</b> (Operacional / Fornecedor / Imposto / Comissão / Outro). Se for boleto, cole a <b>linha digitável</b> e o beneficiário.</>,
            },
            {
                title: 'Acompanhar',
                body: <>A despesa aparece em <b>Total Pendente</b>; se passar do vencimento, vai para <b>Total Vencido</b> (fica vermelha). Filtre por <b>A Vencer / Vencidas / Pagas</b>.</>,
            },
            {
                title: 'Pagar',
                body: <>Botão <b>Pagar</b> na linha → ela entra em <b>Pago (Este Mês)</b>. Clicar de novo não muda nada.</>,
            },
            {
                title: 'Atalho por compra',
                body: <>Se a despesa vem de um pedido de compra, use <b>Lançar no Contas a Pagar</b> direto no pedido — evita digitar de novo e já vincula.</>,
            },
        ],
    },
    {
        id: 'fluxo-comissao',
        tag: 'Fluxo E',
        title: 'Criar uma regra de comissão',
        steps: [
            {
                title: 'Nova regra',
                route: '/dashboard/configuracoes/comissoes',
                body: <>Nome, alvo (<b>Vendedor</b> ou <b>Arquiteto</b>), apuração <b>Mensal</b>. Marque <b>Global</b> se vale para todos.</>,
            },
            {
                title: 'Definir os tiers',
                body: <>Adicione as faixas por meta: "a partir de <b>R$ 0</b> → <b>2%</b>", "a partir de <b>R$ 100.000</b> → <b>3,5%</b>", etc. Pelo menos um tier; máximo 100% por faixa.</>,
            },
            {
                title: 'Regra específica (opcional)',
                body: <>Para um parceiro com taxa diferente, crie a regra <b>sem marcar Global</b> e associe a ele em <b>Comercial › Arquitetos</b>. Ela passa a valer no lugar da global para essa pessoa.</>,
            },
            {
                title: 'Conferir o resultado',
                body: <>Os valores calculados aparecem em <b>Financeiro › Comissões Vendedores</b> e <b>Comissões Arquitetos</b>, e também no detalhe de cada pedido.</>,
            },
        ],
    },
];

/* ------------------------------------------------------------------ */
/*  Componentes auxiliares                                             */
/* ------------------------------------------------------------------ */

function Mono({ children }: { children: React.ReactNode }) {
    return <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[0.85em] text-gray-700">{children}</code>;
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href} className="font-medium text-blue-600 hover:underline">{children}</a>;
}

function Pill({ tone = 'mut', children }: { tone?: PillTone; children: React.ReactNode }) {
    return (
        <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold ${pillClass[tone]}`}>
            {children}
        </span>
    );
}

function StatusFlow({ items }: { items: { label: string; tone?: PillTone }[] }) {
    return (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {items.map((it, i) => (
                <React.Fragment key={i}>
                    <Pill tone={it.tone}>{it.label}</Pill>
                    {i < items.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-gray-400" />}
                </React.Fragment>
            ))}
        </div>
    );
}

function NoteBox({ note }: { note: Note }) {
    const map = {
        info: 'border-blue-500 bg-blue-50 text-blue-900',
        warn: 'border-amber-500 bg-amber-50 text-amber-900',
        crit: 'border-red-500 bg-red-50 text-red-900',
    };
    const Icon = note.tone === 'crit' || note.tone === 'warn' ? AlertTriangle : Info;
    return (
        <div className={`my-4 rounded-r-lg border-l-4 p-3 pl-4 text-sm ${map[note.tone || 'info']}`}>
            <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider">
                <Icon className="h-3.5 w-3.5" />
                {note.label}
            </div>
            <div className="[&_b]:font-semibold">{note.body}</div>
        </div>
    );
}

function ScreenMock({ s }: { s: NonNullable<ModuleDoc['screen']> }) {
    return (
        <figure className="my-5 overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-3.5 py-2">
                <span className="flex gap-1.5">
                    <i className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                    <i className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                    <i className="h-2.5 w-2.5 rounded-full bg-gray-300" />
                </span>
                <span className="font-mono text-xs text-gray-400">{s.route}</span>
            </div>
            <div className="overflow-x-auto p-4">
                <div className="mb-3">
                    <div className="text-base font-bold text-gray-900">{s.head}</div>
                    {s.sub && <div className="text-xs text-gray-400">{s.sub}</div>}
                </div>
                <table className="w-full min-w-[460px] border-collapse text-[13px]">
                    <thead>
                        <tr>
                            {s.cols.map((c) => (
                                <th key={c} className="border-b border-gray-200 px-3 pb-2 text-left font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                    {c}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {s.rows.map((row, ri) => (
                            <tr key={ri}>
                                {row.map((cell, ci) => (
                                    <td key={ci} className={`border-b border-gray-100 px-3 py-2.5 align-top ${ci === 0 ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </figure>
    );
}

/* ------------------------------------------------------------------ */
/*  Página                                                             */
/* ------------------------------------------------------------------ */

export default function AjudaPage() {
    const [activeId, setActiveId] = useState<string>('acesso');

    useEffect(() => {
        const ids = [
            ...GROUPS.flatMap((g) => g.modules.map((m) => m.id)),
            ...FLOWS.map((f) => f.id),
        ];
        const obs = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) setActiveId(e.target.id);
                });
            },
            { rootMargin: '-15% 0px -75% 0px' }
        );
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) obs.observe(el);
        });
        return () => obs.disconnect();
    }, []);

    return (
        <div className="pb-24">
            {/* Cabeçalho da página */}
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-blue-100 p-2.5">
                        <BookOpen className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Manual do Operador</h1>
                        <p className="text-sm text-gray-500">
                            Como usar cada módulo do dia a dia — do orçamento à entrega, da compra ao recebimento da nota,
                            da avaria ao reembolso.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
                {/* Índice */}
                <nav className="hidden lg:block">
                    <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-2 text-sm">
                        {GROUPS.map((g) => (
                            <div key={g.id} className="mb-4">
                                <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                    {g.title}
                                </div>
                                {g.modules.map((m) => (
                                    <a
                                        key={m.id}
                                        href={`#${m.id}`}
                                        className={`block rounded-md px-2.5 py-1 ${activeId === m.id ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                    >
                                        {m.title}
                                    </a>
                                ))}
                            </div>
                        ))}
                        <div className="mb-4">
                            <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                Fluxos completos
                            </div>
                            {FLOWS.map((f) => (
                                <a
                                    key={f.id}
                                    href={`#${f.id}`}
                                    className={`block rounded-md px-2.5 py-1 ${activeId === f.id ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                                >
                                    {f.tag} · {f.title}
                                </a>
                            ))}
                        </div>
                    </div>
                </nav>

                {/* Conteúdo */}
                <div className="min-w-0 max-w-3xl">
                    {GROUPS.map((g) => (
                        <section key={g.id} className="mb-14">
                            <h2 className="mb-1 border-b-2 border-gray-900 pb-2 text-xl font-bold text-gray-900">
                                {g.title}
                            </h2>
                            {g.modules.map((m) => (
                                <article key={m.id} id={m.id} className="mt-9 scroll-mt-24">
                                    <div className="flex items-center gap-1 font-mono text-xs text-gray-400">
                                        {m.path.split(' › ').map((seg, i, arr) => (
                                            <React.Fragment key={i}>
                                                <span className={i === arr.length - 1 ? 'font-semibold text-blue-700' : ''}>{seg}</span>
                                                {i < arr.length - 1 && <ChevronRight className="h-3 w-3" />}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <h3 className="mb-2 mt-1.5 text-lg font-bold text-gray-900">{m.title}</h3>
                                    <p className="text-[15px] leading-relaxed text-gray-600 [&_b]:font-semibold [&_b]:text-gray-800">
                                        {m.lead}
                                    </p>

                                    {m.screen && <ScreenMock s={m.screen} />}

                                    {m.flow && (
                                        <div className="my-4">
                                            <div className="mb-1.5 text-sm font-semibold text-gray-700">Ciclo:</div>
                                            <StatusFlow items={m.flow} />
                                        </div>
                                    )}

                                    {m.notes?.map((n, i) => <NoteBox key={i} note={n} />)}

                                    {m.steps && (
                                        <ol className="mt-4 space-y-2.5">
                                            {m.steps.map((st, i) => (
                                                <li key={i} className="flex gap-3 text-[14px] text-gray-600">
                                                    <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-md bg-blue-50 font-mono text-xs font-semibold text-blue-700">
                                                        {i + 1}
                                                    </span>
                                                    <span className="[&_b]:font-semibold [&_b]:text-gray-800">{st}</span>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </article>
                            ))}
                        </section>
                    ))}

                    {/* Fluxos */}
                    <section className="mb-14">
                        <h2 className="mb-1 border-b-2 border-gray-900 pb-2 text-xl font-bold text-gray-900">
                            Fluxos completos
                        </h2>
                        <p className="mt-2 text-[15px] text-gray-600">
                            Os cinco caminhos do dia a dia, do começo ao fim.
                        </p>

                        {FLOWS.map((f) => (
                            <div key={f.id} id={f.id} className="mt-8 scroll-mt-24 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                <div className="border-b border-gray-200 bg-gray-50 px-5 py-4">
                                    <div className="font-mono text-xs font-semibold uppercase tracking-wider text-blue-600">
                                        {f.tag}
                                    </div>
                                    <h3 className="mt-1 text-lg font-bold text-gray-900">{f.title}</h3>
                                </div>
                                <div className="px-5">
                                    {f.steps.map((st, i) => (
                                        <div key={i} className="flex gap-4 border-b border-gray-100 py-4 last:border-b-0">
                                            <div className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-lg bg-gray-900 font-mono text-xs font-semibold text-white">
                                                {i + 1}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-[15px] font-bold text-gray-900">{st.title}</h4>
                                                <p className="mt-0.5 text-[14px] text-gray-600 [&_b]:font-semibold [&_b]:text-gray-800">
                                                    {st.body}
                                                </p>
                                                {st.route && (
                                                    <div className="mt-1.5 font-mono text-xs text-gray-400">{st.route}</div>
                                                )}
                                                {st.chain && (
                                                    <div className="mt-2">
                                                        <StatusFlow items={st.chain} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </section>

                    <p className="mt-12 border-t border-gray-200 pt-6 text-xs text-gray-400">
                        Manual do operador · núcleo operacional. Fora do escopo: Catálogo, Promoções, Agenda e o grupo
                        Administração (Usuários, Papéis, Templates, Ambientes, Auditoria, configurações fiscais).
                    </p>
                </div>
            </div>
        </div>
    );
}
