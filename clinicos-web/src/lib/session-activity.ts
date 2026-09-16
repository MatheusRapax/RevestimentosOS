// Renovação de sessão "deslizante": o token JWT vale 8h fixas desde que foi
// emitido — sem isso, um usuário no meio de um trabalho longo (ex.: um
// orçamento com vários itens) cai pro login e perde tudo que ainda não
// salvou, mesmo mexendo o tempo todo. Enquanto houver atividade (clique,
// tecla, scroll, ou qualquer chamada à API), o token é renovado
// periodicamente em segundo plano; só expira de verdade se ficar ocioso além
// do limite abaixo.
//
// O lock de "posso renovar agora?" mora no localStorage, não numa variável
// JS em memória: em dev, o bundler pode acabar com mais de uma cópia física
// deste módulo carregada (chunks diferentes), cada uma com seu próprio
// `let`; localStorage é o único estado que é *garantidamente* o mesmo em
// qualquer cópia (e entre abas, de brinde). A escrita do lock acontece antes
// de qualquer `await`, então dentro da mesma aba não há corrida real — o JS
// é single-threaded e essa checagem-e-escrita roda sem ceder o controle no
// meio.
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
const IDLE_LIMIT_MS = 20 * 60 * 1000; // sem atividade há mais que isso → para de renovar
const REFRESH_INTERVAL_MS = 10 * 60 * 1000; // intervalo mínimo entre renovações
const CHECK_INTERVAL_MS = 60 * 1000; // frequência da checagem
const REFRESH_LOCK_KEY = 'session_refresh_lock_until';

let lastActivityAt = Date.now();
let started = false;

export function markActivity() {
    lastActivityAt = Date.now();
}

async function checkAndRefresh() {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) return; // deslogado — nada a renovar
    if (Date.now() - lastActivityAt > IDLE_LIMIT_MS) return; // ocioso — deixa expirar normalmente

    const now = Date.now();
    const lockUntil = Number(localStorage.getItem(REFRESH_LOCK_KEY) || 0);
    if (now < lockUntil) return; // renovado recentemente (por esta cópia do módulo ou outra)

    // Reserva a janela ANTES do await — evita que outra chamada síncrona
    // (mesma aba) ou outra cópia do módulo dispare no mesmo instante.
    localStorage.setItem(REFRESH_LOCK_KEY, String(now + REFRESH_INTERVAL_MS));

    try {
        // fetch nativo (não o axios de api.ts) de propósito: evita import
        // circular (api.ts chama markActivity, que mora neste módulo).
        const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
            const data = await res.json();
            if (data?.access_token) {
                localStorage.setItem('token', data.access_token);
            }
        } else if (res.status === 401) {
            localStorage.removeItem(REFRESH_LOCK_KEY); // sessão já expirou de vez
        }
    } catch {
        localStorage.removeItem(REFRESH_LOCK_KEY); // falha de rede — libera pra tentar de novo já já
    }
}

/** Chamar uma vez ao montar o app (com uma sessão ativa ou não — é barato). */
export function startSessionKeepAlive() {
    if (started || typeof window === 'undefined') return;
    started = true;

    ACTIVITY_EVENTS.forEach((event) =>
        window.addEventListener(event, markActivity, { passive: true }),
    );
    window.setInterval(checkAndRefresh, CHECK_INTERVAL_MS);
}
