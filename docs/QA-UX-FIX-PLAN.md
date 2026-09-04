# Plano de correção — UI/UX (branch `fix/ui-ux-responsividade`)

Baseado em `docs/QA-UX-FINDINGS.md`. Todas as mudanças são de **layout/CSS/texto
estático** — nenhuma toca em lógica de negócio, chamada de API ou dado
persistido. Teste após cada fase: `tsc --noEmit` (type-check) + verificação
visual no browser em 375px/768px/1440px.

## Escopo desta rodada

Entram: **U1, U2, U3, U4** (bugs confirmados). Ficam de fora, por decisão
consciente (são melhorias de design, não correção de algo quebrado, e exigiriam
decisão de produto maior — ex. redesenhar tabelas como cards):
- **U5** (tabelas em card no mobile) — redesign maior, não um bug.
- **U6** (onboarding do dashboard vazio) — decisão de produto, não um bug.

## Fase 1 — U2: remover o título "Dashboard" fixo do header · risco zero
- `components/layout/header.tsx`: remover o `<h2>Dashboard</h2>` hardcoded (informação duplicada — o `<h1>` de cada página já mostra o nome certo).
- **Teste:** navegar por 3-4 páginas, confirmar que o header não mostra mais texto de título nenhum (só Loja/usuário/Sair), e que o `<h1>` de cada página continua correto.

## Fase 2 — U1: header responsivo, "Sair" sempre acessível · risco baixo
- `components/layout/header.tsx`: aplicar `flex-wrap` + esconder "Loja" e o e-mail abaixo do breakpoint `sm` (`hidden sm:block`), mantendo nome do usuário curto + botão "Sair" sempre visíveis mesmo em 375px.
- **Teste:** 375px e 768px — confirmar visualmente + via `getBoundingClientRect` que o botão "Sair" está dentro da viewport e clicável.

## Fase 3 — U4: cabeçalho de página (título + botão) não se sobrepõe mais · risco baixo, escopo largo (~38 arquivos)
- Padronizar o bloco `<div className="flex items-center justify-between">` que envolve `<h1>+<p>` e o botão de ação, trocando por `flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` (título empilha acima do botão em telas pequenas, lado a lado a partir do `sm`).
- Aplicado em todas as páginas de listagem identificadas (Orçamentos, Produtos, Clientes, Arquitetos, Fornecedores, Pedidos, Compras, Financeiro, e demais que seguem o mesmo padrão).
- **Teste:** revisar visualmente em 375px as páginas mais usadas (Orçamentos, Produtos, Clientes, Financeiro) confirmando que o botão não sobrepõe mais o texto; conferir 768px/1440px continuam iguais a antes (nenhuma regressão no desktop/tablet).

## Fase 4 — U3: menu lateral com versão mobile (gaveta) · risco médio, maior escopo
- `components/layout/sidebar.tsx` + `header.tsx`: abaixo do breakpoint `md`, esconder a sidebar fixa e adicionar um botão de menu (☰) no header que abre um `Sheet` (drawer) com os mesmos links de navegação.
- Cuidado: preservar 100% do comportamento em desktop/tablet (sidebar fixa continua igual); a mudança é aditiva só para telas pequenas.
- **Teste:** 375px — abrir/fechar a gaveta, navegar por um link de dentro dela, confirmar que fecha ao navegar; 768px/1440px — confirmar sidebar continua exatamente como antes.

## Fase 5 — Retestar tudo + build + release + merge
- `tsc --noEmit` limpo.
- Passar pelas telas principais nas 3 larguras (375/768/1440) mais uma vez, de ponta a ponta.
- Reconfirmar que os fluxos funcionais não mudaram (login, criar orçamento, listar/filtrar/buscar) — só o visual.
- `npm run release` (bump de versão, changelog).
- Merge para `main` + push (dependendo do resultado dos testes).

---

**Nota:** como o pedido explícito foi "resolver" e "no final ... pode versionar e
dar merge", vou executar as fases em sequência sem pausar a cada uma, testando
depois de cada uma; só paro se algo sair diferente do esperado.
