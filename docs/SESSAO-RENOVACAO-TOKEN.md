# Sessão — renovação deslizante e reautenticação sem perda de dados

**Desde:** branch `fix/sessao-renovacao-token`
**Onde:** `src/core/auth/` (backend, endpoint `POST /auth/refresh`),
`clinicos-web/src/lib/session-activity.ts` (keep-alive), `clinicos-web/src/lib/api.ts` (interceptors),
`clinicos-web/src/lib/session-expired-bus.ts` + `clinicos-web/src/components/auth/session-expired-modal.tsx`
(reautenticação em tela)

---

## Resumo

O JWT é assinado com validade fixa de **8 horas** (`auth.module.ts`, `signOptions: { expiresIn: '8h' }`).
Antes desta correção não existia nenhum mecanismo de renovação: passadas as 8h desde o login — mesmo
que o cliente estivesse o tempo todo mexendo no sistema — o token expirava, qualquer chamada de API
voltava `401`, e o app **limpava o `localStorage` e forçava um redirect para `/login`**, destruindo
qualquer trabalho não salvo na tela (ex.: itens já adicionados a um orçamento em andamento).

Duas correções, independentes mas complementares:

1. **Renovação deslizante** — enquanto o cliente estiver ativo, o token nunca chega a expirar.
2. **Reautenticação sem navegação** — se mesmo assim a sessão expirar de vez (ociosidade real por
   perto das 8h), o app não navega para lugar nenhum: mostra um modal de login por cima da própria
   tela e preserva o estado local.

---

## Por que mudou

Relato de cliente: no meio de um orçamento, depois de adicionar vários itens, ao clicar em Salvar o
sistema "simplesmente volta pra tela de login" e perde tudo. A dúvida levantada foi se a renovação de
token só deveria valer para quem está **ocioso** (comportamento correto de timeout) e nunca deveria
acontecer com quem está **ativamente usando** o sistema. Não deveria — e não estava acontecendo,
porque não existia renovação nenhuma, só o timeout fixo de 8h.

---

## 1. Renovação deslizante (`session-activity.ts`)

Um timer roda em segundo plano assim que o app carrega (armado uma única vez, em `AuthProvider`,
como singleton em nível de módulo — não depende de re-render/remount do React):

- **Atividade** = qualquer `mousedown` / `keydown` / `scroll` / `touchstart` no DOM, **ou** qualquer
  chamada de API que teve sucesso (marcada no interceptor de resposta do `api.ts`).
- A cada 60s (`CHECK_INTERVAL_MS`), verifica: a última atividade foi há menos de 20 minutos
  (`IDLE_LIMIT_MS`)? Se sim, e já se passaram 10 minutos (`REFRESH_INTERVAL_MS`) desde a última
  renovação, chama `POST /auth/refresh` (novo endpoint, protegido por `JwtAuthGuard`, apenas
  reassina um token novo para o mesmo usuário) e substitui o token no `localStorage`.
- Se a última atividade foi há mais de 20 minutos, **não renova** — deixa o timeout normal seguir seu
  curso. Isso é proposital: sessão ociosa de verdade tem que expirar.
- Trava de renovação (`session_refresh_lock_until`) fica no **`localStorage`**, não em memória —
  sobrevive a HMR/remounts do Next.js em dev e a múltiplas abas.

```ts
const IDLE_LIMIT_MS = 20 * 60 * 1000;      // acima disso, considera ocioso — não renova
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // intervalo mínimo entre renovações
const CHECK_INTERVAL_MS = 60 * 1000;        // frequência do verificador
```

Resultado prático: quem está mexendo no sistema nunca vê o token expirar — a sessão se renova sozinha
a cada ~10min, indefinidamente. Quem larga o sistema aberto e sai (sem tocar em nada por 20min+) para
de renovar e, no fim das 8h, expira normalmente.

---

## 2. Reautenticação sem perda de dados (`session-expired-modal.tsx`)

A renovação acima cobre quem está ativo. Mas e quem fica **realmente ocioso** por perto das 8h (ex.:
foi almoçar no meio de um orçamento) e depois volta e tenta salvar? O token expirou de vez — não tem
como renovar um token que o backend já rejeita. Antes, isso significava perder a tela inteira.

Agora, o interceptor de resposta do `api.ts`, ao ver um `401` que **não** veio de `/auth/login` nem de
`/auth/refresh`, não limpa nada nem navega — só emite um evento (`session-expired-bus.ts`, pub/sub
simples, sem dependência de React):

```ts
if (error.response?.status === 401) {
  const isLoginRequest = url.includes('/auth/login');
  const isRefreshRequest = url.includes('/auth/refresh');
  if (!isLoginRequest && !isRefreshRequest && window.location.pathname !== '/login') {
    emitSessionExpired();
  }
}
```

O `SessionExpiredModal`, montado **uma única vez** dentro do `AuthProvider` (sempre presente,
independente da rota), escuta esse evento e abre um modal por cima da tela atual — a página por trás
**nunca é desmontada**, então qualquer estado local (itens de um orçamento, campos de um formulário
ainda não salvo) continua exatamente como estava. A pessoa digita a senha de novo ali mesmo (e-mail
vem pré-preenchido, lido do `localStorage`) e, ao logar com sucesso, o modal fecha e um toast pede
para repetir a última ação (ex.: clicar em Salvar de novo) — o retry agora usa o token renovado.

---

## Testado

- **Renovação deslizante**: com intervalos reduzidos para teste (idle=20s, refresh=8s, check=3s),
  cliques reais periódicos na tela geraram chamadas a `POST /auth/refresh` perfeitamente espaçadas nos
  logs do backend (`docker compose logs backend`), sem nenhuma duplicata/burst. Parando de interagir,
  zero chamadas de refresh durante o período ocioso — o timeout seguiu seu curso normalmente.
- **Reautenticação sem perda de dados**: criado um orçamento novo real (cliente selecionado, item
  "Argamassa AC-III 20kg", 5 caixas, R$ 190,00), token corrompido no `localStorage` para simular
  expiração total, clique em "Criar Orçamento" → modal "Sua sessão expirou" aparece por cima do
  formulário, que continua visível e intacto atrás dele → login no modal → modal fecha, item/
  quantidade/totais do orçamento continuam 100% intactos → clique em "Criar Orçamento" de novo → salva
  normalmente com o token renovado.
- **Pré-preenchimento do e-mail no modal**: confirmado que o campo de e-mail vem preenchido
  automaticamente com o e-mail do usuário logado (lido do `localStorage` no momento em que o modal
  abre, não de uma closure presa ao primeiro render).
- Backend (`nest build`) e frontend (`next build`, 60 páginas) — build de produção limpo depois de
  todas as mudanças.

### Nota sobre uma falsa pista durante o teste

Durante a validação com intervalos reduzidos, a ferramenta de inspeção de rede do navegador (Browser
pane / MCP) chegou a mostrar "rajadas" de dezenas de chamadas `POST /auth/refresh` simultâneas — com
timestamps idênticos repetidos mesmo entre sessões de teste independentes (containers recriados do
zero, `localStorage` limpo). Isso levou a três rodadas de refatoração defensiva (mover o lock de
`useRef` para módulo, depois para singleton fora do ciclo de vida do React, depois para
`localStorage`) antes de se confirmar, cruzando com `docker compose logs backend`, que o mecanismo
**sempre funcionou corretamente** e a "rajada" era um artefato de cache da própria ferramenta de
inspeção de rede, não um bug da aplicação. A arquitetura mais robusta (singleton em módulo + lock em
`localStorage`) foi mantida por ser objetivamente melhor, mesmo o bug que a motivou nunca tendo
existido de fato. Lição: para qualquer verificação futura de timers de sessão/auth, `docker compose
logs backend` é a fonte de verdade — não o inspetor de rede do Browser pane.
