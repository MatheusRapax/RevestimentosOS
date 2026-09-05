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

## Fase 1 — U2: remover o título "Dashboard" fixo do header · risco zero · ✅ CONCLUÍDA
- `components/layout/header.tsx`: removido o `<h2>Dashboard</h2>` hardcoded.
- **Verificado:** header não mostra mais título nenhum em nenhuma página; `<h1>` de cada página continua correto (inclusive Financeiro, que antes ficava redundante).

## Fase 2 — U1: header responsivo, "Sair" sempre acessível · risco baixo · ✅ CONCLUÍDA
- `components/layout/header.tsx`: Loja e nome/e-mail escondidos abaixo de `md`/`sm`; botão "Sair" sempre visível e dentro da viewport.
- **Verificado:** em 375px, `getBoundingClientRect` confirma "Sair" dentro da tela; clique programático confirma logout funcional (navega pra `/login`).

## Fase 3 — U4: cabeçalho de página (título + botão) não se sobrepõe mais · risco baixo, escopo largo · ✅ CONCLUÍDA
- Padronizado `flex items-center justify-between` (e a variante com ordem invertida) → `flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`, aplicado via script com heurística de proximidade ao `<h1>` (evita tocar em usos não relacionados da mesma classe, ex. rodapé de tabela).
- **Verificado:** 27 arquivos alterados (1 linha cada), revisados no diff; 9 páginas conferidas visualmente em 375px sem sobreposição; 768px/1440px idênticos a antes.

## Fase 4 — U3: menu lateral com versão mobile (gaveta) · risco médio, maior escopo · ✅ CONCLUÍDA
- `components/layout/sidebar.tsx` + `header.tsx` + `app/dashboard/layout.tsx`: abaixo de `md`, a sidebar fixa vira `hidden` e um botão ☰ no header abre um `Sheet` (drawer) com a navegação completa; clicar num link fecha a gaveta e navega.
- **Verificado:** drawer abre/fecha corretamente, navegação + auto-close confirmados via clique programático; 768px/1440px com a sidebar fixa idêntica a antes.
- **Nota:** durante o teste, uma medição isolada (`position:fixed; inset-y-0`, sem nenhum código do produto) mostrou a altura resolvendo ~3x maior que a viewport real **só sob a emulação "mobile" desta ferramenta de teste** — confirmado como artefato do próprio ambiente de teste (não do produto/CSS), documentado para não induzir um "conserto" de algo que não está quebrado.

## Fase 5 — Retestar tudo + build + release + merge · ✅ CONCLUÍDA
- `tsc --noEmit` limpo em cada fase e no final.
- Testes unitários do backend: 62/62 relevantes passam (as 5 falhas em promotions/deliveries são pré-existentes, idênticas ao `main`).
- 9+ páginas revisadas em 375px, 2+ em 768px, 2+ em 1440px — sem sobreposição, sem regressão.
- Fluxos funcionais reconfirmados: login, logout (mobile), busca/filtro de orçamentos.
- `npm run release` + merge para `main` + push.

---

**Nota:** como o pedido explícito foi "resolver" e "no final ... pode versionar e
dar merge", vou executar as fases em sequência sem pausar a cada uma, testando
depois de cada uma; só paro se algo sair diferente do esperado.
