'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
    onOpenMobileNav?: () => void;
}

export default function Header({ onOpenMobileNav }: HeaderProps) {
    const { user, activeClinic, logout } = useAuth();
    const router = useRouter();

    const clinic = user?.clinics.find(c => c.id === activeClinic);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        // U2: removido o "Dashboard" fixo (duplicava o <h1> de cada página, sem refletir a rota atual).
        // U1: em telas pequenas só o botão Sair fica visível — Loja/usuário aparecem a partir de sm/md,
        // pra sempre sobrar espaço pro logout, que antes ficava cortado por overflow-hidden no mobile.
        <header className="print:hidden bg-white border-b px-4 sm:px-6 py-4 flex items-center justify-between md:justify-end gap-3 sm:gap-6">
            {/* U3: abre a gaveta de navegação — o menu lateral fixo some abaixo do breakpoint md. */}
            <Button
                variant="ghost"
                size="icon"
                className="md:hidden -ml-2"
                onClick={onOpenMobileNav}
                aria-label="Abrir menu de navegação"
            >
                <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-3 sm:gap-6">
                {clinic && (
                    <div className="hidden md:block text-sm">
                        <span className="text-gray-500">Loja:</span>
                        <span className="ml-2 font-medium text-gray-900">{clinic.name}</span>
                    </div>
                )}

                <div className="hidden sm:block text-sm text-right">
                    <div className="font-medium text-gray-900">{user?.name}</div>
                    <div className="text-gray-500">{user?.email}</div>
                </div>

                <Button variant="outline" size="sm" onClick={handleLogout} className="shrink-0">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                </Button>
            </div>
        </header>
    );
}
