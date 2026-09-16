'use client';

import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/contexts/auth-context';
import { onSessionExpired } from '@/lib/session-expired-bus';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Sessão expirou de vez (nem a renovação em segundo plano salvou — quem
 * ficou ocioso por perto das 8h). Em vez do comportamento antigo (limpar
 * tudo e forçar um redirect pro /login, destruindo qualquer trabalho não
 * salvo na tela — ex.: itens já adicionados a um orçamento), mostra este
 * modal por cima da MESMA tela. A página nunca é desmontada, então o que já
 * estava preenchido continua lá; a pessoa só precisa repetir a última ação
 * (ex.: clicar em Salvar de novo) depois de logar.
 */
export function SessionExpiredModal() {
    const { login } = useContext(AuthContext);
    const [isOpen, setIsOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        return onSessionExpired(() => {
            setIsOpen((alreadyOpen) => {
                if (!alreadyOpen) {
                    // Lê o usuário direto do localStorage em vez do `user` do
                    // contexto: este efeito roda só uma vez (monta com o app),
                    // então `user` ficaria preso ao valor do primeiro render
                    // (normalmente null, antes do AuthProvider carregar do
                    // localStorage) e o e-mail nunca seria pré-preenchido.
                    let storedEmail = '';
                    try {
                        const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
                        storedEmail = userData ? JSON.parse(userData)?.email || '' : '';
                    } catch {
                        storedEmail = '';
                    }
                    setEmail(storedEmail);
                    setPassword('');
                    setError('');
                }
                return true;
            });
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            await login(email, password);
            setIsOpen(false);
            setPassword('');
            toast.success('Sessão renovada — repita a última ação (ex.: Salvar) para continuar.');
        } catch (err: any) {
            setError(err.response?.data?.message || 'E-mail ou senha incorretos.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-100 rounded-full">
                            <AlertTriangle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <DialogTitle>Sua sessão expirou</DialogTitle>
                            <DialogDescription>
                                Faça login de novo para continuar — o que você já preencheu nesta
                                tela não foi perdido.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                    <div className="space-y-2">
                        <Label htmlFor="session-expired-email">E-mail</Label>
                        <Input
                            id="session-expired-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="session-expired-password">Senha</Label>
                        <Input
                            id="session-expired-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <DialogFooter className="mt-4">
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Entrando...
                                </>
                            ) : (
                                'Entrar e continuar'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
