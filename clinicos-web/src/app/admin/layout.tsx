'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

// IMPROVED LAYOUT for Super Admin
export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!user) {
                router.push('/login');
            } else if (!user.isSuperAdmin) {
                router.push('/dashboard'); // Not allowed
            }
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        );
    }

    if (!user?.isSuperAdmin) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen flex text-slate-900 bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold tracking-tight">Super Admin</h1>
                    <p className="text-xs text-slate-400 mt-1">RevestimentosOS</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link
                        href="/admin"
                        className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        📊 Dashboard
                    </Link>
                    <Link
                        href="/admin/tenants"
                        className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        🏢 Lojas (Tenants)
                    </Link>
                    <Link
                        href="/admin/users"
                        className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        👥 Usuários
                    </Link>
                    <Link
                        href="/admin/audit"
                        className="flex items-center gap-3 px-4 py-3 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium"
                    >
                        🛡️ Auditoria
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <Link href="/dashboard" className="text-xs text-slate-400 hover:text-white flex items-center gap-2">
                        ← Voltar para Lojas
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
                    <h2 className="font-semibold text-slate-700">Painel Administrativo</h2>
                    <div className="flex items-center gap-4">
                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                            SA
                        </div>
                    </div>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
