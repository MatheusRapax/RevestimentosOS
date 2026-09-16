// Avisa a UI que a sessão expirou de verdade (401 que nem o refresh salva),
// sem acoplar o interceptor do axios (módulo puro) a nenhum componente React.
// Quem escuta é o SessionExpiredModal, montado uma vez no AuthProvider.
type Listener = () => void;

let listeners: Listener[] = [];

export function onSessionExpired(cb: Listener): () => void {
    listeners.push(cb);
    return () => {
        listeners = listeners.filter((l) => l !== cb);
    };
}

export function emitSessionExpired() {
    listeners.forEach((l) => l());
}
