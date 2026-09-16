import axios from 'axios';
import { markActivity } from './session-activity';
import { emitSessionExpired } from './session-expired-bus';

const isServer = typeof window === 'undefined';

const api = axios.create({
    // If running on Next.js Server (SSR), talk directly via Docker network.
    // If running on the user's browser, fetch `/api` via NGINX Proxy.
    baseURL: isServer ? (process.env.INTERNAL_API_URL || 'http://backend:3000') : '/api',
});

// Request interceptor
api.interceptors.request.use((config) => {
    // Add auth token
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        const clinicId = localStorage.getItem('clinicId');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add clinic header
        if (clinicId) {
            config.headers['X-Clinic-Id'] = clinicId;
        }
    }

    return config;
});

api.interceptors.response.use(
    (response) => {
        // Uma chamada à API que teve sucesso já é, por si só, prova de que o
        // usuário está ativo — conta para a renovação deslizante de sessão.
        markActivity();
        return response;
    },
    (error) => {
        // Only log actual API errors, not cancelled requests
        if (error?.response?.status) {
            try {
                const status = error.response.status;
                const url = error.config?.url;
                const data = error.response.data;
                const message = (data && typeof data === 'object' && 'message' in data) ? (data as any).message : 'No message';

                console.error(`❌ API Error [${status}] ${url}:`, message);
            } catch (loggingError) {
                console.error('❌ API Error (Raw):', error.message);
            }
        }

        if (error.response?.status === 401) {
            // Se o erro de 401 vier da PRÓPRIA rota de login (senha errada) ou
            // do refresh silencioso de sessão, NÃO aciona o modal — quem
            // chamou já sabe tratar (tela de login mostra o erro; o refresh
            // em segundo plano só desiste em silêncio).
            const url = error.config?.url || '';
            const isLoginRequest = url.includes('/auth/login');
            const isRefreshRequest = url.includes('/auth/refresh');

            if (!isLoginRequest && !isRefreshRequest && typeof window !== 'undefined') {
                // Sessão expirou de vez (nem o refresh em segundo plano
                // salvou — provavelmente ficou ocioso por perto das 8h).
                // Em vez de limpar tudo e forçar um redirect (que destrói
                // qualquer trabalho não salvo na tela, ex.: itens já
                // adicionados a um orçamento), avisa a UI pra mostrar um
                // modal de "faça login de novo" SEM navegar pra lugar
                // nenhum — a tela atual e seu estado continuam intactos.
                if (window.location.pathname !== '/login') {
                    emitSessionExpired();
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;
