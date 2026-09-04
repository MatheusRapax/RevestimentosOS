# QA de UI/UX — Responsividade, Layout e Intuitividade

Auditoria visual focada em responsividade (mobile/tablet/desktop), formatação de
containers, textos e clareza geral da interface. Testado em três larguras:
**mobile (375px)**, **tablet (768px)** e **desktop (1440px)**, sobre o estado
atual do `main` (pós v1.11.1).

Metodologia: inspeção visual (screenshots) + verificação programática via
`getBoundingClientRect`/`getComputedStyle` no browser para confirmar cada
achado antes de registrar (evita falso-positivo de escala/zoom da própria
ferramenta de teste). Achados de layout foram cruzados com o código-fonte do
componente responsável.

---

## Achados críticos (afetam o uso em celular)

### [ ] U1 — Header global (topbar) não é responsivo; botão "Sair" fica inacessível em celular
- **Onde:** `src/components/layout/header.tsx` — usado em **todas** as páginas do dashboard.
- **Repro:** abrir qualquer página com a janela em ~375px de largura (celular).
- **Obtido:** o bloco da direita do header (Loja + nome/e-mail do usuário + botão **Sair**) não tem nenhuma classe responsiva. Em telas estreitas ele é cortado por um ancestral com `overflow: hidden` — sem rolagem, sem quebra de linha. Confirmado via `getBoundingClientRect`: o botão "Sair" fica posicionado em `x ≈ 456` numa viewport de 375px (fora da área visível) e o container não tem scroll (`scrollX` não se move).
- **Impacto:** em celular, o usuário **não consegue ver nem clicar em "Sair"** pelo header. (Existe rota `/login` alcançável por URL, mas não há como deslogar pela UI.)
- **Correção sugerida:** no `<header>`, aplicar `flex-wrap` ou trocar para `flex-col sm:flex-row` e esconder itens de menor prioridade (Loja, e-mail) abaixo de um breakpoint (`hidden sm:block`), mantendo sempre visível ao menos um jeito de deslogar (ex.: um menu/avatar dropdown com "Sair" dentro, em vez de um botão texto solto).

### [ ] U2 — Header sempre mostra "Dashboard", nunca o nome da página atual
- **Onde:** `src/components/layout/header.tsx:22` — `<h2>Dashboard</h2>` é uma **string fixa**, não deriva da rota.
- **Repro:** navegar para qualquer módulo (Orçamentos, Produtos, Financeiro, etc.) e olhar o topo da tela.
- **Obtido:** o texto "Dashboard" aparece ali sempre, mesmo com o `<h1>` da página (ex.: "Orçamentos", "Produtos") logo abaixo mostrando o nome certo. No Financeiro fica redundante/confuso: header diz "Dashboard" e o `<h1>` da página diz "Dashboard Financeiro".
- **Impacto:** não é bloqueante (o `<h1>` da página está correto), mas é ruído visual constante e uma pequena "mentira" na UI — motivo de trabalho de refação apontarmos como item de "clareza" pedido.
- **Correção sugerida:** remover o `<h2>Dashboard</h2>` fixo (informação duplicada, já existe o `<h1>` da página) **ou** trocá-lo por um título dinâmico vindo do layout/rota. Recomendo remover — mais simples, elimina a duplicidade.

### [ ] U3 — Sidebar não tem versão mobile (sem menu-hambúrguer/drawer)
- **Onde:** `src/components/layout/sidebar.tsx`.
- **Repro:** abrir qualquer página em ~375px.
- **Obtido:** o menu lateral (`w-16`, ícones) fica **sempre visível e fixo**, com o mesmo comportamento do desktop (um botão "Expandir menu" que só alarga a barra, mostrando rótulos — o que consome ainda mais espaço numa tela já apertada). Não existe um padrão de menu retrátil (off-canvas / gaveta) específico para celular. Confirmado por código: nenhuma classe `sm:`/`md:`/`lg:` no componente.
- **Impacto:** em celular, a barra lateral consome ~64px fixos de uma tela de 375px (~17% da largura) só pra navegação, deixando pouco espaço útil pro conteúdo — some com o combo do U1, sobra pouco mais de 300px úteis.
- **Correção sugerida:** abaixo de um breakpoint (`md`), esconder a sidebar por padrão e trocá-la por um botão de menu (☰) no header que abre um `Sheet`/drawer com os mesmos links.

### [ ] U4 — Cabeçalho de página (título + botão de ação) se sobrepõe em celular — padrão repetido em ~38 páginas
- **Onde:** repetido em quase toda página de listagem (`Orçamentos`, `Produtos`, `Clientes`, `Fornecedores`, `Arquitetos`, `Pedidos`, `Compras`, `Financeiro`...). Todas usam o mesmo padrão: `<div className="flex items-center justify-between"><div><h1/>+<p/></div><Button/></div>`, sem tratamento responsivo.
- **Repro:** abrir Orçamentos, Produtos, Clientes ou Financeiro em ~375px.
- **Obtido:** quando o subtítulo é longo o bastante pra quebrar em 2-3 linhas (ex.: "Cadastro de produtos do estoque", "Gerencie o cadastro de clientes (PF e PJ)"), o botão de ação ("+ Novo Orçamento", "+ Novo Produto", "+ Novo Cliente", o seletor de mês "Setembro" no Financeiro) **fica posicionado por cima do texto**, ilegível e parcialmente cortado na borda direita da tela.
- **Impacto:** o botão principal de cada tela (a ação mais usada — criar um novo registro) fica difícil ou impossível de tocar com precisão em celular.
- **Faixa afetada:** confirmado que o problema é específico de telas de celular (< ~650-700px). Em tablet (768px) e desktop, o mesmo layout já tem espaço suficiente e funciona bem.
- **Correção sugerida:** criar um padrão único (componente `PageHeader` ou só a classe) com `flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` e aplicar nas ~38 páginas — dá pra fazer com uma limpeza mecânica (mesmo find/replace do bloco) em vez de reescrever cada página.

---

## Achados menores / oportunidades de polimento

### [ ] U5 — Tabelas de listagem exigem rolagem horizontal dentro do cartão em celular
- **Onde:** todas as telas de lista (Orçamentos, Produtos, Clientes, etc.) — usam `overflow-x-auto` no container da tabela.
- **Observado:** funciona (não é um bug — o usuário consegue arrastar e ver as colunas), mas é um padrão de tabela desktop encolhida, não um layout pensado pra celular. Em telas pequenas normalmente se usa uma lista de "cards" empilhados (nome + status + total em destaque, resto em texto menor) em vez de tabela com scroll lateral.
- **Sugestão:** avaliar, pra 1-2 telas mais usadas (Orçamentos, Produtos), uma versão em cards abaixo de um breakpoint — melhoria de UX, não correção de bug. Prioridade baixa dado o estágio atual (cliente ainda não usa o sistema no celular pesadamente, pelo que você mencionou).

### [ ] U6 — Dashboard inicial vazio por padrão, sem orientação pro usuário novo
- **Onde:** `/dashboard` — "Seus Atalhos" (Add Atalho) e 2 placeholders "Adicionar Widget", tudo vazio até o usuário configurar manualmente.
- **Observado:** não é um bug, mas para "deixar o sistema intuitivo" vale considerar: um usuário novo loga e vê uma tela quase em branco, sem indicação do que fazer a seguir (não há um atalho pré-configurado pro fluxo mais comum, ex. "Novo Orçamento", nem uma dica textual de como usar "Adicionar Widget").
- **Sugestão (opcional):** pré-popular 2-3 atalhos padrão (Novo Orçamento, Novo Produto, Clientes) na primeira vez, ou adicionar uma dica textual curta.

---

## Pontos que JÁ funcionam bem (não regredir)

- **Diálogos de cadastro (Novo Cliente, e por extensão os demais que usam o mesmo `Dialog`)** já se adaptam bem a telas pequenas: grids de 2 colunas encolhem corretamente lado a lado, botões cabem, nada corta. Testado abrindo o diálogo em desktop e redimensionando para 375px com o diálogo aberto.
- **Formulário "Novo Orçamento"**: os cards (Dados do Cliente, Ajustes Globais, Itens) empilham corretamente em coluna única no celular; inputs ocupam a largura toda.
- **KPIs do Financeiro** (Faturamento, Lucro Bruto, Pedidos, Taxa de Conversão): empilham em coluna única de forma limpa no celular.
- **Filtros de status em chips** (Orçamentos): quebram em múltiplas linhas de forma legível, sem cortar texto.
- **Conteúdo em telas largas (desktop, 1440px)**: verificado via `getBoundingClientRect` que o conteúdo principal **usa corretamente ~92% da largura da viewport** (não há "espaço desperdiçado" — uma suspeita inicial que a própria ferramenta de screenshot escalado sugeria visualmente, descartada após medição programática).

---

## Observação sobre o ambiente de teste

Sob emulação de "mobile" neste navegador de teste, cliques (`left_click`) ficaram
instáveis a partir de certo ponto da sessão — em vez de ativar o botão, o clique
selecionava o texto (ex.: em "Adicionar Item" e "Cancelar"). Isso não impediu a
inspeção visual/estrutural (que é a base de todos os achados acima), mas os
fluxos de **interação** em celular (abrir o combobox de produto, preencher um
item de orçamento) não puderam ser exercitados ponta-a-ponta neste ambiente.
Recomendo uma validação manual rápida desse fluxo específico num celular real
ou emulador do Chrome DevTools antes de considerar o mobile 100% coberto.
