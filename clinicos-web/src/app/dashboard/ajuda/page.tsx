'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
    BookOpen,
    ChevronRight,
    ChevronDown,
    Info,
    AlertTriangle,
    ArrowRight,
    Search,
    X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

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
                    {
                        label: 'Sessão',
                        body: (
                            <>
                                Enquanto você está usando o sistema (clicando, digitando, navegando), a sessão se
                                renova sozinha em segundo plano — não é preciso logar de novo. O login expira de fato
                                só depois de um período <b>parado</b> (sem nenhuma ação). Se isso acontecer no meio de
                                um orçamento ou pedido, um aviso <b>&quot;Sua sessão expirou&quot;</b> aparece por cima
                                da própria tela: digite a senha de novo ali mesmo (o e-mail já vem preenchido) e
                                repita a última ação (ex.: <b>Salvar</b>) — nada do que você já preencheu é perdido.
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
                    {
                        tone: 'info',
                        label: 'Atualizar Preços',
                        body: (
                            <>
                                Um orçamento em <b>rascunho</b> guarda o preço de cada item no momento em que foi
                                adicionado — se o preço padrão do produto mudou depois (por exemplo, você ajustou o{' '}
                                <A href="#marcas-categorias">markup de uma marca</A>), o orçamento não atualiza sozinho.
                                Use o botão <Mono>Atualizar Preços</Mono>, no topo da tela de edição, para puxar o preço
                                atual do catálogo para os itens — nada muda sem você clicar, então um preço negociado à
                                mão com o cliente fica seguro até você decidir atualizar. Só disponível em rascunho; um
                                orçamento já enviado ao cliente não pode ter os preços trocados por baixo.
                            </>
                        ),
                    },
                    {
                        tone: 'warn',
                        label: 'Ocultar desconto na impressão',
                        body: (
                            <>
                                Item com desconto tem a opção <Mono>Ocultar desconto na impressão</Mono>. Marcando, o
                                PDF/impressão desse item mostra só o preço já com desconto, como se fosse o preço
                                normal do produto — sem &quot;De/Por&quot; e sem a coluna de desconto, nem no resumo
                                do rodapé. É só uma questão de aparência no documento entregue ao cliente: o desconto
                                real continua gravado normalmente no sistema e nos relatórios financeiros, e você
                                sempre vê o valor verdadeiro (com um aviso &quot;Oculto na impressão&quot;) na tela de
                                detalhe do orçamento.
                            </>
                        ),
                    },
                    {
                        label: 'Adicionar Item',
                        body: (
                            <>
                                O botão para adicionar item fica sempre logo abaixo do último item da lista (e também
                                como área de destaque quando o orçamento ainda não tem nenhum item) — não precisa
                                rolar a tela até o topo para adicionar mais um item em orçamentos com muitos itens.
                            </>
                        ),
                    },
                    {
                        label: 'Duplicar item',
                        body: (
                            <>
                                O ícone de cópia ao lado do item duplica produto, quantidade, desconto, ambiente e
                                lote preferencial — útil para repetir um item parecido (ex.: o mesmo produto em outro
                                ambiente) sem preencher tudo de novo.
                            </>
                        ),
                    },
                    {
                        tone: 'info',
                        label: 'Produto avulso direto no catálogo',
                        body: (
                            <>
                                Ao criar um <A href="#produtos">produto avulso</A> (<Mono>+ Produto Avulso</Mono>),
                                marque <Mono>Adicionar direto ao catálogo</Mono> se esse produto não é único deste
                                orçamento — ele já nasce visível na busca de qualquer orçamento, sem precisar de
                                promoção manual depois. Desmarcado (padrão), continua avulso: só aparece aqui, oculto
                                do catálogo até alguém promovê-lo.
                            </>
                        ),
                    },
                ],
                steps: [
                    <><b>Novo Orçamento</b> → cliente, (arquiteto), itens (por área m² ou caixas), ajustes globais. Salvar.</>,
                    <><b>Abrir PDF</b> para enviar ao cliente. Use <b>Enviar</b> quando mandar oficialmente.</>,
                    <>Cliente aceitou → <b>Aprovar</b> → <b>Converter em Pedido</b>. O orçamento fica <Mono>Convertido</Mono>.</>,
                    <>Cliente recusou → <b>Rejeitar</b> (pede o motivo). Dá para <b>Reabrir</b> depois. <b>Duplicar</b> aproveita um parecido.</>,
                    <>Preço do produto mudou depois de criar o orçamento? Reabra para editar e clique em{' '}
                        <b>Atualizar Preços</b> antes de salvar.</>,
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
            {
                id: 'nfe',
                path: 'Comercial › Pedidos › Nota Fiscal',
                title: 'Emissão de Nota Fiscal (NF-e)',
                lead: (
                    <>
                        No card <b>Nota Fiscal</b> do pedido, o botão <b>Emitir Nota</b> abre a{' '}
                        <b>Revisão Fiscal</b> — uma conferência automática antes de qualquer coisa ir para a SEFAZ.
                        O <b>tipo da operação</b> (venda dentro ou fora do estado), o CFOP e os impostos são{' '}
                        <b>calculados sozinhos</b> a partir do estado do cliente e do Perfil do Emitente — você não
                        digita código nem alíquota na hora de emitir, e o sistema <b>não pergunta</b> se a venda é
                        dentro ou fora do estado: isso vem do cadastro.
                    </>
                ),
                flow: [
                    { label: 'Emitir Nota', tone: 'mut' },
                    { label: 'Revisão Fiscal', tone: 'info' },
                    { label: 'Processando', tone: 'warn' },
                    { label: 'Aprovada', tone: 'ok' },
                ],
                notes: [
                    {
                        tone: 'crit',
                        label: 'Se a revisão bloquear a emissão',
                        body: (
                            <>
                                Falta <b>a classificação fiscal (NCM) ou a origem</b> de algum produto → o botão
                                vira <Mono>Preencher Dados e Emitir</Mono>: escolha a classificação (atalhos de
                                revestimento ou busca pelo nome) e a origem ali mesmo; os dados ficam salvos no
                                produto e a nota já sai emitida em seguida. Falta <b>estado (UF), cidade ou código
                                IBGE do cliente</b> → aparece um atalho <Mono>Editar Cliente</Mono> (ou os dados da
                                empresa, se o problema for no cadastro da loja) direto no aviso. Cada aviso vem com
                                a etiqueta de quem precisa agir: <b>Cliente</b>, <b>Produto</b> ou <b>Empresa</b>.
                            </>
                        ),
                    },
                    {
                        tone: 'info',
                        label: 'Dentro ou fora do estado: o sistema decide',
                        body: (
                            <>
                                O cartão <b>Tipo de operação</b> mostra, por exemplo, “Venda dentro do estado (MA → MA)”
                                ou “Venda para outro estado (MA → SP)”. Ele sai da comparação entre o estado da empresa
                                e o estado do cliente — não é uma escolha do operador, porque a SEFAZ rejeita a nota se
                                não bater. Se o resultado parecer errado, corrija o <b>estado no cadastro do cliente</b>.
                                O sistema <b>nunca assume um estado por conta própria</b>: sem estado cadastrado, a
                                emissão é bloqueada com a instrução de corrigir o cadastro.
                            </>
                        ),
                    },
                    {
                        tone: 'info',
                        label: 'Detalhes fiscais (códigos)',
                        body: (
                            <>
                                Quem tem a permissão de <b>configuração fiscal</b> vê, abaixo da lista de produtos,
                                o item recolhido <Mono>Ver detalhes fiscais (códigos)</Mono> com NCM, CFOP, CST e
                                alíquotas — para conferir com o contador. Os demais usuários veem só o produto, a
                                quantidade, o valor e os impostos em reais.
                            </>
                        ),
                    },
                    {
                        tone: 'warn',
                        label: 'Avisos não bloqueiam',
                        body: (
                            <>
                                A revisão também mostra <b>avisos</b> em amarelo (ex.: desconto no pedido que ainda
                                não vai como desconto na nota, ou pedido cuja loja ainda não tem uma regra de
                                imposto cadastrada para aquele caso) — o botão muda para{' '}
                                <Mono>Emitir Mesmo Assim</Mono> e a emissão segue normalmente.
                            </>
                        ),
                    },
                    {
                        label: 'Depois de emitida',
                        body: (
                            <>
                                O status atualiza sozinho na tela (a SEFAZ responde em segundos a minutos) — não
                                precisa recarregar a página. Nota <b>Aprovada</b> libera os botões <Mono>XML</Mono>{' '}
                                e <Mono>PDF</Mono> (DANFE) no mesmo card. Pedido cujo <b>status ainda não está
                                confirmado/pago</b> não deixa emitir — regularize o pagamento primeiro.
                            </>
                        ),
                    },
                ],
                steps: [
                    <>Abra o pedido → card <b>Nota Fiscal</b> → <b>Emitir Nota</b>.</>,
                    <>A <b>Revisão Fiscal</b> mostra o cliente, o tipo da operação (dentro/fora do estado) e os
                        itens com os impostos já calculados. Sem erros → <b>Confirmar e Emitir</b>.</>,
                    <>Com erro de produto → escolha a classificação fiscal e a origem no formulário que abre e
                        confirme; a emissão continua sozinha. Isso é pedido <b>uma vez por produto</b>.</>,
                    <>Com erro de cadastro (cliente ou loja) → use o atalho mostrado no aviso, corrija e volte em{' '}
                        <b>Emitir Nota</b>.</>,
                    <>Acompanhe o status no próprio card; quando aprovar, baixe <b>XML</b> e <b>PDF</b> ali mesmo.</>,
                ],
            },
            {
                id: 'catalogo-vendas',
                path: 'Comercial › Catálogo de Produtos',
                title: 'Catálogo de Produtos (consulta de vendas)',
                lead: (
                    <>
                        Vitrine de <b>consulta rápida</b> para o vendedor: busca, filtros, preço e disponibilidade de
                        estoque de cada produto. É <b>somente leitura</b> — cadastro e edição ficam em{' '}
                        <A href="#produtos">Estoque › Produtos</A>.
                    </>
                ),
                steps: [
                    <>Digite na busca (nome, código, EAN, formato, linha…) — ela aplica sozinha quando você para de digitar.</>,
                    <>Para filtrar por <b>Unidade Comercial</b>, <b>Formato</b>, <b>Cor / Acabamento</b>, <b>Linha / Coleção</b>, <b>Uso / Aplicação</b> ou <b>Marca</b>, escolha as opções e clique em <b>Aplicar Filtros</b>. <b>Limpar Filtros</b> volta ao todo.</>,
                    <>Em um cartão, clique em <b>Ver Especificações</b> para ver preço, medidas, dados da caixa e do palete e a <b>disponibilidade</b> (Físico, Reservado, Disponível e os lotes).</>,
                ],
                notes: [
                    {
                        label: 'Preço por m²',
                        body: (
                            <>
                                Em produto vendido por m², o sistema guarda o preço da <b>caixa</b> e mostra o preço por
                                m² = preço da caixa ÷ m² por caixa (a linha &quot;Cx&quot; do cartão mostra o valor da caixa
                                fechada).
                            </>
                        ),
                    },
                    {
                        tone: 'warn',
                        label: 'O que não aparece',
                        body: (
                            <>
                                Só entram produtos <b>ativos e não avulsos</b> (um avulso sem &quot;Adicionar direto ao
                                catálogo&quot; não aparece). O cartão mostra o preço normal: uma{' '}
                                <A href="#promocoes">promoção ativa</A> só entra no preço quando o produto é adicionado a um
                                orçamento.
                            </>
                        ),
                    },
                ],
            },
            {
                id: 'promocoes',
                path: 'Comercial › Promoções',
                title: 'Promoções',
                lead: (
                    <>
                        Campanhas com <b>desconto percentual</b> aplicado a produtos escolhidos, por período. O preço
                        promocional entra automaticamente nos <A href="#orcamentos">orçamentos</A> enquanto a campanha
                        estiver valendo.
                    </>
                ),
                steps: [
                    <><b>Nova Campanha</b> → <b>Nome da Campanha</b>, <b>Desconto (%)</b> (1 a 100), <b>Início</b> e <b>Término</b>.</>,
                    <>Em <b>Produtos Participantes</b>, busque por nome ou SKU e marque as linhas (ou use <b>Todos Filtrados</b> / <b>Limpar</b>). É preciso escolher pelo menos um produto.</>,
                    <>Deixe <b>Ativa imediatamente</b> ligado e clique em <b>Salvar Campanha</b>.</>,
                    <>Na lista, o interruptor <b>Ativa</b> liga/desliga a campanha na hora; o menu de três pontos tem <b>Editar</b> e <b>Excluir</b>.</>,
                ],
                notes: [
                    {
                        label: 'Status da campanha',
                        body: (
                            <>
                                <b>Em andamento</b> (ativa e dentro do período), <b>Agendada</b> (ativa, ainda não
                                começou), <b>Encerrada</b> (passou do término) e <b>Pausada</b> (desligada). O período vale
                                o <b>dia inteiro</b> nas duas pontas.
                            </>
                        ),
                    },
                    {
                        tone: 'warn',
                        label: 'Mais de uma promoção no mesmo produto',
                        body: (
                            <>
                                Vale a de <b>maior desconto</b>. <b>Excluir</b> apaga a campanha de vez; para só parar de
                                aplicar, desligue o interruptor <b>Ativa</b>. Orçamentos já criados guardam o preço do
                                momento — use <b>Atualizar Preços</b> neles se precisar.
                            </>
                        ),
                    },
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
                    {
                        label: 'Preço de venda — de onde ele vem',
                        body: (
                            <>
                                Se você não digitar um preço de venda na mão, o sistema calcula sozinho:{' '}
                                <Mono>custo × (1 + markup)</Mono>. Veja em{' '}
                                <A href="#marcas-categorias">Marcas, Categorias e Markup</A> de onde vem esse markup e o
                                que muda quando você ajusta o markup padrão de uma marca ou categoria.
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
                    {
                        tone: 'info',
                        label: 'Lançar itens na entrada',
                        body: (
                            <>
                                No campo <Mono>Produto</Mono> da entrada, busque por <b>nome ou SKU</b>; abaixo dele
                                aparecem SKU e m²/caixa do produto escolhido. O <b>Lote é obrigatório</b>: se a mercadoria
                                não tem lote, digite um identificador (ex.: o número da NF). Para quantidade, prefira{' '}
                                <b>CX</b> (caixas inteiras) — <b>M²</b> só fica disponível se o produto tem m²/caixa
                                cadastrado. Produto novo? Use <Mono>+ Cadastrar produto</Mono> na própria linha: ele entra
                                direto no catálogo e já vem selecionado.
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
        ],
    },
    {
        id: 'administracao',
        title: 'Administração',
        modules: [
            {
                id: 'admin-acesso',
                path: 'Administração › Visão geral',
                title: 'Quem acessa o quê',
                lead: (
                    <>
                        A área de <b>Administração</b> reúne usuários, papéis, configurações da loja, auditoria e os
                        cadastros de apoio. O menu mostra os itens conforme os <b>módulos ativos da loja</b>; cada tela
                        ainda exige uma <b>permissão</b> do papel da pessoa. Quem não tem a permissão vê a tela{' '}
                        <b>Acesso Restrito</b> (&quot;Você não possui permissão para visualizar este conteúdo&quot;).
                    </>
                ),
                screen: {
                    route: 'Papéis de fábrica',
                    head: 'Telas da Administração por papel',
                    sub: 'Configuração padrão — a loja pode ter ajustado os papéis em Papéis e Acessos',
                    cols: ['Tela', 'Administrador', 'Gerente', 'Estoquista', 'Vendedor'],
                    rows: [
                        ['Usuários · Papéis · Auditoria', 'Sim', 'Sim', '—', '—'],
                        ['Configurações Globais · Templates', 'Sim', '—', '—', '—'],
                        ['Configuração Fiscal', 'Sim', '—', '—', '—'],
                        ['Regras de Comissão', 'Sim', 'Sim', '—', '—'],
                        ['Config. de Catálogo · Ambientes', 'Sim', 'Sim', 'Sim', '—'],
                    ],
                },
                notes: [
                    {
                        tone: 'info',
                        label: 'Os quatro papéis padrão',
                        body: (
                            <>
                                <b>Administrador</b>: acesso total. <b>Gerente</b>: gerência da loja (vendas, estoque,
                                financeiro, comissões, usuários e auditoria), sem as configurações globais, os templates e
                                a configuração fiscal. <b>Estoquista</b>: produtos, fornecedores, estoque e avarias.{' '}
                                <b>Vendedor</b>: clientes, orçamentos, pedidos, entregas e consulta ao catálogo. Para ver
                                ou mudar o que cada papel pode, use <A href="#papeis">Papéis e Acessos</A>.
                            </>
                        ),
                    },
                    {
                        tone: 'warn',
                        label: 'Item no menu não significa acesso',
                        body: (
                            <>
                                O menu só esconde o item quando o <b>módulo</b> está desligado na loja. Se o módulo está
                                ligado mas o seu papel não tem a permissão, o item continua aparecendo — e ao clicar você
                                cai em <b>Acesso Restrito</b>. Nesse caso peça a um Administrador para ajustar o papel.
                            </>
                        ),
                    },
                ],
            },
            {
                id: 'usuarios',
                path: 'Administração › Usuários',
                title: 'Usuários',
                lead: (
                    <>
                        Lista quem tem acesso à loja ativa, deixa <b>trocar o papel</b> de cada pessoa e{' '}
                        <b>criar novos acessos</b>.
                    </>
                ),
                screen: {
                    route: '/dashboard/admin/usuarios',
                    head: 'Usuários da Loja',
                    sub: 'Gerencie os usuários e seus papéis no sistema',
                    cols: ['Nome', 'Email', 'Status', 'Papel', 'Regra de Comissão'],
                    rows: [
                        ['Administrador Mosaic (você)', 'admin@loja.com', <Pill key="s" tone="ok">Ativo</Pill>, 'Administrador', '—'],
                        ['Carla Souza', 'carla@loja.com', <Pill key="s" tone="ok">Ativo</Pill>, 'Vendedor', 'Padrão da Loja'],
                    ],
                },
                steps: [
                    <><b>Adicionar Usuário</b> → <b>Nome completo</b>, <b>Email</b>, <b>Senha Inicial</b> (mínimo 6 caracteres) e <b>Papel</b>. Salvar com <b>Adicionar Usuário</b>.</>,
                    <>Se o papel for <b>Vendedor</b>, aparece o campo <b>Regra de Comissão</b>: deixe em <i>Padrão (Regra Global de Vendedores)</i> ou escolha uma regra específica (ver <A href="#comissoes-regra">Regras de comissão</A>).</>,
                    <>Para mudar o papel de alguém, troque o seletor na linha da pessoa — grava na hora, sem botão Salvar (aparece um check verde quando salvou).</>,
                    <>Passe a senha inicial à pessoa por um canal seguro.</>,
                ],
                notes: [
                    {
                        tone: 'warn',
                        label: 'Você não altera o seu próprio papel',
                        body: (
                            <>
                                O seletor do seu usuário fica bloqueado (e a regra de comissão também) — evita alguém se
                                tirar do próprio acesso por engano. Outro Administrador faz a troca.
                            </>
                        ),
                    },
                    {
                        tone: 'info',
                        label: 'E-mail que já existe em outra loja',
                        body: (
                            <>
                                O e-mail é único no sistema. Se já existir em outra loja, a pessoa é apenas{' '}
                                <b>vinculada a esta loja</b> com o papel escolhido: o nome e a senha digitados são{' '}
                                <b>ignorados</b> e ela continua entrando com a senha que já tem. Se já estiver nesta loja,
                                o sistema avisa que ela já está vinculada.
                            </>
                        ),
                    },
                    {
                        tone: 'warn',
                        label: 'Não há botão para desativar ou excluir',
                        body: (
                            <>
                                Esta tela cria acessos e troca papéis, mas <b>não desativa nem remove</b> usuários. Para
                                bloquear o acesso de alguém que saiu da empresa, peça ao suporte para desativar o acesso.
                            </>
                        ),
                    },
                ],
            },
            {
                id: 'papeis',
                path: 'Administração › Papéis e Acessos',
                title: 'Papéis e Acessos',
                lead: (
                    <>
                        Um <b>papel</b> é um conjunto de permissões (o que a pessoa pode ver e fazer). Aqui você vê os
                        papéis, <b>marca as permissões</b> de cada um e cria papéis novos.
                    </>
                ),
                screen: {
                    route: '/dashboard/admin/papeis',
                    head: 'Papéis e Acessos',
                    sub: 'Gerencie as permissões de cada papel',
                    cols: ['Nome', 'Chave', 'Permissões'],
                    rows: [
                        ['Administrador', 'ADMIN', <Pill key="p" tone="info">todas</Pill>],
                        ['Vendedor', 'SELLER', <Pill key="p" tone="mut">parciais</Pill>],
                    ],
                },
                steps: [
                    <><b>Novo Papel</b> → <b>Nome do Papel</b> (ex.: Auxiliar Administrativo) e, se quiser, uma descrição. <b>Criar Papel</b>.</>,
                    <>O papel novo nasce <b>sem nenhuma permissão</b>: clique em <b>Editar</b> na linha dele.</>,
                    <>Marque as permissões (agrupadas por área: Estoque, Orçamentos, Financeiro, Fiscal…) e clique em <b>Salvar Permissões</b>.</>,
                    <>Depois vá em <A href="#usuarios">Usuários</A> e atribua o papel às pessoas.</>,
                ],
                notes: [
                    {
                        tone: 'crit',
                        label: 'Papéis valem para todas as lojas',
                        body: (
                            <>
                                Papéis e permissões <b>não são por loja</b>: mudar as permissões de um papel afeta
                                todas as pessoas que usam esse papel, em todas as lojas do sistema. Prefira criar um papel
                                novo em vez de alterar um dos padrões.
                            </>
                        ),
                    },
                    {
                        tone: 'warn',
                        label: 'Cuidado ao remover permissões do seu próprio papel',
                        body: (
                            <>
                                Não existe trava: dá para tirar de um papel a permissão de gerenciar papéis e perder o
                                acesso a esta tela. Salvar substitui o conjunto inteiro de permissões. Não é possível
                                excluir nem renomear um papel pela tela. Se uma mudança não aparecer no menu, saia e entre
                                de novo no sistema.
                            </>
                        ),
                    },
                ],
            },
            {
                id: 'config-globais',
                path: 'Administração › Configurações Globais',
                title: 'Configurações Globais',
                lead: (
                    <>
                        Valores padrão da loja inteira. Hoje há <b>uma</b> configuração aqui: a{' '}
                        <b>Taxa de Entrega Padrão</b>.
                    </>
                ),
                steps: [
                    <>Abra <b>Administração › Configurações Globais</b> e preencha <b>Taxa de Entrega Padrão (R$)</b>.</>,
                    <>Clique em <b>Salvar Alterações</b>. A partir daí, todo <A href="#orcamentos">orçamento novo</A> já vem com esse valor no campo de frete.</>,
                ],
                notes: [
                    {
                        tone: 'info',
                        label: 'É só um valor inicial',
                        body: (
                            <>
                                A taxa padrão apenas <b>pré-preenche</b> o frete: dá para alterá-la orçamento a orçamento.
                                Na edição de um orçamento que já tem itens, o frete salvo é mantido.
                            </>
                        ),
                    },
                    {
                        tone: 'info',
                        label: 'Procurando outra configuração?',
                        body: (
                            <>
                                O <b>Markup Global Padrão</b> fica em <A href="#marcas-categorias">Config. de Catálogo ›
                                Configurações</A>. A <b>validade do orçamento</b> e os termos ficam nos{' '}
                                <A href="#templates">Templates</A>. As regras de impostos ficam em{' '}
                                <A href="#fiscal-config">Configuração Fiscal</A>.
                            </>
                        ),
                    },
                ],
            },
            {
                id: 'auditoria',
                path: 'Administração › Auditoria',
                title: 'Auditoria',
                lead: (
                    <>
                        Histórico <b>somente leitura</b> das alterações feitas no sistema: quem fez, quando, o quê e em
                        qual cadastro. Serve para investigar &quot;quem mudou isso?&quot;.
                    </>
                ),
                screen: {
                    route: '/dashboard/admin/auditoria',
                    head: 'Logs de Auditoria',
                    sub: 'Histórico de ações administrativas',
                    cols: ['Data/Hora', 'Ação', 'Entidade', 'Usuário', 'Mensagem'],
                    rows: [
                        ['02/11/2026 14:32', <Pill key="a" tone="info">Atualização</Pill>, 'Order', 'Carla Souza', 'Atualizou Order (Campos: status)'],
                        ['02/11/2026 14:10', <Pill key="a" tone="ok">Criação</Pill>, 'Quote', 'Carla Souza', 'Criou Quote (Campos: customerId, items…)'],
                    ],
                },
                steps: [
                    <>Abra <b>Administração › Auditoria</b>: as ações mais recentes aparecem primeiro.</>,
                    <>Clique na lupa (<b>Ver Detalhes</b>) de uma linha para abrir <b>Detalhes da Ação</b>, com os dados enviados na alteração.</>,
                ],
                notes: [
                    {
                        tone: 'warn',
                        label: 'Só os 100 registros mais recentes, sem filtros',
                        body: (
                            <>
                                A tela mostra no máximo os <b>100 últimos</b> registros da loja e ainda não tem busca nem
                                filtro por usuário, data ou tipo. Ações mais antigas não aparecem aqui.
                            </>
                        ),
                    },
                    {
                        tone: 'info',
                        label: 'O que é registrado',
                        body: (
                            <>
                                Toda <b>criação, alteração e exclusão</b> feita no sistema (orçamentos, pedidos, produtos,
                                papéis, configurações, regras de comissão, movimentações de estoque, pagamentos…).
                                Consultas não entram. Senhas e tokens aparecem mascarados como <Mono>[REDACTED]</Mono>.
                                É normal uma mesma ação gerar <b>duas linhas</b> (uma automática e outra detalhada pelo
                                módulo), e algumas mensagens técnicas aparecem em inglês.
                            </>
                        ),
                    },
                ],
            },
            {
                id: 'templates',
                path: 'Administração › Templates',
                title: 'Templates de orçamento',
                lead: (
                    <>
                        Modelos do <b>PDF/impressão do orçamento</b>: dados da empresa, logo, dados bancários, termos e
                        aparência. Dá para ter mais de um e escolher qual usar ao imprimir.
                    </>
                ),
                steps: [
                    <><b>Novo Template</b> → preencha as abas <b>Empresa</b> (nome, CNPJ, telefone, e-mail, logo, endereço), <b>Banco</b> (banco, agência, conta, titular, chave PIX) e <b>Termos</b> (validade em dias, prazo de entrega, termos e condições, formas de pagamento, rodapé).</>,
                    <>Na aba <b>Aparência</b> escolha as cores e o que aparece no PDF: linhas de assinatura, dados bancários, termos, formas de pagamento e as colunas <i>Qtd</i>, <i>Área (m²)</i> e <i>Preço Unitário</i>.</>,
                    <>Confira na aba <b>Preview</b> e clique em <b>Criar Template</b> (ou <b>Salvar Alterações</b>).</>,
                    <>Para usar um modelo por padrão, clique na <b>estrela</b> do cartão dele.</>,
                ],
                notes: [
                    {
                        tone: 'info',
                        label: 'Atalho pelo CNPJ',
                        body: (
                            <>
                                Ao digitar o CNPJ (14 dígitos) o sistema consulta a BrasilAPI e preenche razão social,
                                endereço e telefone. Confira os dados antes de salvar.
                            </>
                        ),
                    },
                    {
                        tone: 'warn',
                        label: 'Padrão e exclusão',
                        body: (
                            <>
                                O <b>primeiro template criado vira o Padrão</b> sozinho; marcar outro como padrão tira o
                                título do anterior. <b>Excluir apaga de vez</b>: se o excluído era o padrão, o template mais
                                antigo que sobrar assume. Só o nome é obrigatório. A validade padrão é de 10 dias — é daqui
                                que vem o &quot;Este orçamento é válido por N dias&quot; do <A href="#orcamentos">PDF</A>.
                            </>
                        ),
                    },
                ],
            },
            {
                id: 'ambientes',
                path: 'Administração › Ambientes',
                title: 'Ambientes de venda',
                lead: (
                    <>
                        Os ambientes (Cozinha, Sala, Banheiro Suíte…) que o vendedor associa aos itens do{' '}
                        <A href="#orcamentos">orçamento</A> — o PDF agrupa os itens por ambiente.
                    </>
                ),
                steps: [
                    <><b>Novo Ambiente</b> → <b>Nome do Ambiente</b> (único na loja) e o interruptor <b>Ambiente Ativo</b>. Salvar.</>,
                    <>Para renomear ou tirar das opções, use <b>Editar</b> e desligue <b>Ambiente Ativo</b> — ele deixa de aparecer nos orçamentos novos, mas o histórico é preservado.</>,
                    <>O vendedor também consegue criar um ambiente na hora, pelo <b>+ Novo</b> dentro do item do orçamento.</>,
                ],
                notes: [
                    {
                        tone: 'crit',
                        label: 'Excluir é definitivo',
                        body: (
                            <>
                                A lixeira <b>apaga o ambiente de vez</b>. Os itens de orçamentos e pedidos que o usavam{' '}
                                <b>ficam sem ambiente</b>. Se você só quer parar de usá-lo, <b>desative</b> em vez de
                                excluir.
                            </>
                        ),
                    },
                ],
            },
            {
                id: 'fiscal-config',
                path: 'Administração › Configuração Fiscal',
                title: 'Configuração Fiscal da loja',
                lead: (
                    <>
                        Os dados fiscais da própria loja (usados em <b>toda</b> nota emitida): CNPJ, Inscrição
                        Estadual, regime tributário e endereço do emitente, o certificado digital e os padrões
                        usados quando um produto não tem configuração própria. Quem tem a permissão de{' '}
                        <Mono>fiscal.config</Mono> acessa direto — não precisa ser super admin.
                    </>
                ),
                notes: [
                    {
                        tone: 'crit',
                        label: 'Homologação x Produção (trava de segurança)',
                        body: (
                            <>
                                Em <b>Homologação</b> as notas são de teste e <b>não têm valor fiscal</b>. Notas em{' '}
                                <b>Produção</b> valem de verdade (e só se cancelam dentro do prazo legal). Por segurança, o
                                servidor <b>bloqueia a emissão em produção</b> por padrão: a opção Produção aparece
                                desabilitada e qualquer tentativa de emitir com a loja em produção é recusada. Para
                                liberar, é preciso uma configuração no servidor feita pelo suporte (e só depois de
                                homologar tudo com o contador). O card <b>Status da Conexão</b> sempre mostra em qual
                                ambiente a loja está.
                            </>
                        ),
                    },
                    {
                        tone: 'warn',
                        label: 'Código IBGE precisa casar com a UF',
                        body: (
                            <>
                                O <b>Código IBGE do Município</b> do Perfil do Emitente tem que corresponder à{' '}
                                <b>UF</b> informada — é um dos motivos mais comuns de a Revisão Fiscal bloquear a
                                emissão. Os dois primeiros dígitos do código IBGE identificam o estado.
                            </>
                        ),
                    },
                    {
                        label: 'Regime Tributário decide o cálculo',
                        body: (
                            <>
                                O <b>Regime Tributário (CRT)</b> aqui é o que o motor de impostos usa para
                                escolher a alíquota de ICMS/PIS/COFINS de cada nota — Simples Nacional recolhe
                                esses impostos embutidos no DAS (alíquota 0% na nota); Regime Normal calcula a
                                alíquota cheia. Mudar o CRT aqui muda o cálculo de <b>todas</b> as próximas
                                emissões.
                            </>
                        ),
                    },
                    {
                        tone: 'info',
                        label: 'Preencher o perfil pelo CNPJ',
                        body: (
                            <>
                                Digite o CNPJ e clique na <b>lupa</b> ao lado dele: o sistema consulta a Receita (via
                                BrasilAPI) e preenche <b>endereço, CEP, município, UF, código IBGE e CNAE</b>, além da
                                Razão Social do Setup. Não vêm da consulta: a <b>Inscrição Estadual</b> e a Municipal
                                (preencha você) e o <b>regime tributário</b>, que é só uma sugestão (Simples/MEI = 1, senão
                                3) — confirme com o contador.
                            </>
                        ),
                    },
                    {
                        tone: 'info',
                        label: 'Como saber se o certificado foi instalado',
                        body: (
                            <>
                                O card <b>Status da Conexão</b> mostra o selo <b>Certificado instalado</b> (ou{' '}
                                <b>Certificado não instalado</b>) e, no card <b>Certificado Digital A1</b>, a data e o
                                arquivo enviados. Só aparece como instalado depois que o NexosFiscal aceitou o certificado
                                (senha correta e arquivo válido). Com certificado já instalado, o botão vira{' '}
                                <b>Substituir Certificado</b> — use só quando o certificado vencer ou for trocado, e{' '}
                                <b>não clique várias vezes</b> em Configurar: cada envio cria um novo cadastro no serviço
                                fiscal. Logo abaixo, <b>Conferência do certificado (SEFAZ)</b> mostra o CNPJ do
                                certificado, a validade, se o CNPJ <b>confere com o cadastro fiscal</b> e se a SEFAZ
                                respondeu — sem emitir nenhuma nota. Alertas em vermelho (CNPJ não confere, certificado
                                vencido) precisam ser resolvidos antes de emitir.
                            </>
                        ),
                    },
                    {
                        tone: 'warn',
                        label: 'O Perfil do Emitente é a fonte da verdade',
                        body: (
                            <>
                                CNPJ, Inscrição Estadual, regime (CRT), UF, município e <b>endereço</b> do emitente saem
                                sempre do <b>Perfil do Emitente salvo</b> — o Setup do certificado exige o perfil salvo e
                                recusa dados divergentes em vez de sobrescrever. O <b>regime tributário não tem valor
                                padrão</b>: escolha o seu e salve. Ao <b>Salvar Perfil</b>, o sistema já atualiza o cadastro
                                do emitente no serviço fiscal; se não conseguir, o perfil fica salvo e aparece um aviso. O
                                botão <b>Sincronizar com o serviço fiscal</b> repete essa atualização sob demanda. O{' '}
                                <b>CNPJ não muda</b> em cadastro já criado: se o CNPJ do perfil for outro, a sincronização
                                avisa e é preciso recriar o cadastro e subir o certificado de novo (nada é recriado
                                sozinho). O sistema também avisa quando a IE está como <i>ISENTO</i> (incomum para quem vende
                                mercadoria) e quando o logradouro tem uma barra (&quot;/&quot;), sinal de dois endereços
                                colados.
                            </>
                        ),
                    },
                    {
                        label: 'O que os "padrões" das Regras de Emissão fazem',
                        body: (
                            <>
                                O <b>CFOP da nota de venda é calculado sozinho</b> (5102 dentro do estado, 6102 para outro
                                estado, 6108 para consumidor final não contribuinte de outro estado). Os padrões de{' '}
                                <b>CFOP e CST</b> só preenchem produtos ainda sem esses dados quando você lança uma entrada
                                de estoque com &quot;Atualizar dados fiscais dos produtos&quot;. <b>NCM, CEST e Classe de
                                Imposto</b> padrão ainda não são usados na emissão: o que vale é o cadastro de cada produto.
                                Na emissão, de cada produto só são exigidos <b>NCM (8 dígitos) e origem</b> — CFOP e CST
                                <b> não</b> precisam estar no produto, porque saem do motor de regras fiscais.
                            </>
                        ),
                    },
                ],
                steps: [
                    <>Preencha o <b>Perfil do Emitente</b> primeiro (CNPJ — use a lupa —, IE, endereço, código IBGE, regime) e{' '}
                        <b>Salvar Perfil</b>.</>,
                    <>Configure o <b>certificado digital A1</b> (.pfx) em <b>Setup Inicial</b> — obrigatório para
                        emitir de verdade — e confira o selo <b>Certificado instalado</b> no topo.</>,
                    <>Ajuste as <b>Regras de Emissão</b> (ambiente de homologação/produção e padrões de
                        NCM/CFOP/CST/Origem) se necessário.</>,
                ],
            },
            {
                id: 'marcas-categorias',
                path: 'Administração › Config. de Catálogo',
                title: 'Marcas, Categorias e Markup',
                lead: (
                    <>
                        Onde ficam cadastradas as <b>marcas</b> e <b>categorias</b> de produto, cada uma com um{' '}
                        <b>markup padrão</b> (%) — a margem usada para calcular o preço de venda de quem não tem preço
                        digitado na mão.
                    </>
                ),
                notes: [
                    {
                        tone: 'info',
                        label: 'Markup Global e calculadora',
                        body: (
                            <>
                                Na aba <b>Configurações</b> fica o <b>Markup Global Padrão (%)</b> — usado por todo produto
                                sem markup próprio, de marca ou de categoria (padrão 40%). A <b>Calculadora de Margem</b>{' '}
                                soma <b>Imposto Médio</b>, <b>Custo Fixo/Operação</b>, <b>Comissão Venda</b> e{' '}
                                <b>Lucro Líquido</b> para sugerir um markup; <b>Aplicar Markup</b> só preenche o campo —
                                lembre de salvar. Salvar reprecifica os produtos que dependem do markup global.
                            </>
                        ),
                    },
                    {
                        tone: 'warn',
                        label: 'Excluir marca ou categoria só desativa',
                        body: (
                            <>
                                A lixeira <b>desativa</b> a marca/categoria: ela some da lista, os produtos que a usavam
                                não mudam, e a tela não oferece como reativar. A busca da lista é pelo nome.
                            </>
                        ),
                    },
                    {
                        label: 'Ordem de prioridade do markup',
                        body: (
                            <>
                                Pra cada produto, o sistema usa o primeiro que encontrar, nesta ordem:{' '}
                                <b>markup do produto</b> (se você preencheu um específico) → <b>markup da marca</b> →{' '}
                                <b>markup da categoria</b> → <b>markup padrão da loja</b> (Config. de Catálogo →
                                Configurações Gerais). Um produto com <b>preço manual</b> nunca usa markup — o preço
                                digitado nele é sempre o que vale.
                            </>
                        ),
                    },
                    {
                        tone: 'info',
                        label: 'Mudar o markup atualiza os produtos já cadastrados',
                        body: (
                            <>
                                Ao salvar um novo markup padrão numa marca, categoria ou na loja, o preço de venda de{' '}
                                <b>todos os produtos afetados</b> (sem preço manual) é recalculado e atualizado na
                                hora — não precisa editar produto por produto. Isso vale só para o <b>catálogo</b>; um{' '}
                                <A href="#orcamentos">orçamento</A> já criado guarda o preço que tinha no momento —
                                use <b>Atualizar Preços</b> nele se quiser puxar o valor novo.
                            </>
                        ),
                    },
                ],
                steps: [
                    <>Cadastre a <b>marca</b> ou <b>categoria</b> com um markup padrão (ex.: 40%).</>,
                    <>Precisa reajustar? Edite o markup dela a qualquer momento — os produtos que dependem desse nível
                        da hierarquia mudam de preço junto, automaticamente.</>,
                    <>Um produto específico precisa de margem diferente do resto da marca? Preencha o{' '}
                        <b>markup do produto</b> direto no cadastro dele — tem prioridade sobre marca e categoria.</>,
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
                    <><b>Nova Regra</b> → nome, alvo (<b>Vendedor</b> ou <b>Arquiteto</b>), <b>Período de Apuração</b> (Semanal, <b>Mensal</b> — o padrão —, Trimestral, Semestral ou Anual), marque <b>Global</b> se vale para todos.</>,
                    <>Adicione <b>tiers</b>: "a partir de R$ X → Y%". Comece pela faixa de R$ 0 para a venda de qualquer valor ter comissão. Máximo 100% por faixa; pelo menos um tier.</>,
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
/*  Busca                                                              */
/* ------------------------------------------------------------------ */

// Remove acentos para a busca ser tolerante ("orcamento" encontra "Orçamento").
function normalize(s: string): string {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Texto usado para buscar um módulo: título, caminho e o rótulo de cada nota
// (ex.: "Ocultar desconto na impressão") — cobre buscas por uma funcionalidade
// específica, não só pelo nome do módulo inteiro.
function moduleSearchText(m: ModuleDoc): string {
    return normalize([m.title, m.path, ...(m.notes?.map((n) => n.label) ?? [])].join(' '));
}

function flowSearchText(f: FlowDoc): string {
    return normalize([f.title, f.tag, ...f.steps.map((st) => st.title)].join(' '));
}

function ManualNavList({
    groups,
    flows,
    activeId,
    onNavigate,
}: {
    groups: Group[];
    flows: FlowDoc[];
    activeId: string;
    onNavigate?: () => void;
}) {
    if (groups.length === 0 && flows.length === 0) {
        return <p className="px-2.5 py-1 text-gray-400">Nenhum resultado para essa busca.</p>;
    }
    return (
        <>
            {groups.map((g) => (
                <div key={g.id} className="mb-4">
                    <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        {g.title}
                    </div>
                    {g.modules.map((m) => (
                        <a
                            key={m.id}
                            href={`#${m.id}`}
                            onClick={onNavigate}
                            className={`block rounded-md px-2.5 py-1 ${activeId === m.id ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                        >
                            {m.title}
                        </a>
                    ))}
                </div>
            ))}
            {flows.length > 0 && (
                <div className="mb-4">
                    <div className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Fluxos completos
                    </div>
                    {flows.map((f) => (
                        <a
                            key={f.id}
                            href={`#${f.id}`}
                            onClick={onNavigate}
                            className={`block rounded-md px-2.5 py-1 ${activeId === f.id ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                        >
                            {f.tag} · {f.title}
                        </a>
                    ))}
                </div>
            )}
        </>
    );
}

/* ------------------------------------------------------------------ */
/*  Página                                                             */
/* ------------------------------------------------------------------ */

export default function AjudaPage() {
    const [activeId, setActiveId] = useState<string>('acesso');
    const [search, setSearch] = useState('');
    const query = useMemo(() => normalize(search.trim()), [search]);

    const filteredGroups = useMemo<Group[]>(() => {
        if (!query) return GROUPS;
        return GROUPS
            .map((g) => ({ ...g, modules: g.modules.filter((m) => moduleSearchText(m).includes(query)) }))
            .filter((g) => g.modules.length > 0);
    }, [query]);

    const filteredFlows = useMemo<FlowDoc[]>(() => {
        if (!query) return FLOWS;
        return FLOWS.filter((f) => flowSearchText(f).includes(query));
    }, [query]);

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
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

            {/* Busca */}
            <div className="relative mb-6 max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar no manual... (ex: desconto, markup, pedido)"
                    className="pl-9 pr-9"
                />
                {search && (
                    <button
                        type="button"
                        onClick={() => setSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        aria-label="Limpar busca"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Índice — versão mobile/tablet, recolhível */}
            <details className="mb-6 rounded-lg border border-gray-200 lg:hidden">
                <summary className="flex cursor-pointer select-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-gray-700">
                    Índice do manual
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                </summary>
                <div className="max-h-80 overflow-y-auto border-t border-gray-100 px-3 py-3 text-sm">
                    <ManualNavList groups={filteredGroups} flows={filteredFlows} activeId={activeId} />
                </div>
            </details>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
                {/* Índice — versão desktop, fixa na lateral */}
                <nav className="hidden lg:block">
                    <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-2 text-sm">
                        <ManualNavList groups={filteredGroups} flows={filteredFlows} activeId={activeId} />
                    </div>
                </nav>

                {/* Conteúdo */}
                <div className="min-w-0 max-w-3xl">
                    {filteredGroups.length === 0 && filteredFlows.length === 0 && (
                        <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center text-gray-500">
                            <Search className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                            <p className="font-medium">Nenhum resultado para &quot;{search}&quot;</p>
                            <p className="mt-1 text-sm">Tente outro termo, como o nome de uma tela ou funcionalidade.</p>
                        </div>
                    )}
                    {filteredGroups.map((g) => (
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
                    {filteredFlows.length > 0 && (
                    <section className="mb-14">
                        <h2 className="mb-1 border-b-2 border-gray-900 pb-2 text-xl font-bold text-gray-900">
                            Fluxos completos
                        </h2>
                        <p className="mt-2 text-[15px] text-gray-600">
                            Os cinco caminhos do dia a dia, do começo ao fim.
                        </p>

                        {filteredFlows.map((f) => (
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
                    )}

                    <p className="mt-12 border-t border-gray-200 pt-6 text-xs text-gray-400">
                        Manual do operador · cobre o dia a dia da loja e a área de Administração. Fora do escopo: telas de configuração da plataforma (lojas e módulos), reservadas ao suporte.
                    </p>
                </div>
            </div>
        </div>
    );
}
