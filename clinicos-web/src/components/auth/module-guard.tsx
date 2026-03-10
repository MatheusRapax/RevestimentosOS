'use client';

import { useAuth } from '@/hooks/use-auth';
import { Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface ModuleGuardProps {
    module?: string;
    permissions?: string | string[];
    children: React.ReactNode;
}

export function ModuleGuard({ module, permissions, children }: ModuleGuardProps) {
    const { user, activeClinic: activeClinicId, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!activeClinicId || !user) return null;

    const activeClinic = user.clinics.find(c => c.id === activeClinicId);
    if (!activeClinic) return null;

    // 1. Verify Module Level (Skip if SuperAdmin)
    let hasModule = true;
    if (module) {
        hasModule = (activeClinic.modules?.includes(module) ?? false) || (user.isSuperAdmin ?? false);
    }

    // 2. Verify Specific Permissions (Skip if SuperAdmin)
    let hasPermissions = true;
    if (permissions && !user.isSuperAdmin) {
        const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
        const userPermissions = activeClinic.permissions || [];
        hasPermissions = requiredPermissions.every(p => userPermissions.includes(p));
    }

    if (!hasModule || !hasPermissions) {
        return (
            <div className="flex h-[80vh] items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-4 bg-white p-10 rounded-2xl shadow-sm border border-gray-200">
                    <div className="mx-auto w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                        <AlertTriangle className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Acesso Restrito</h2>
                    <p className="text-gray-500 leading-relaxed">
                        {!hasModule
                            ? "Sua clínica não possui este módulo ativado."
                            : "Você não possui permissão para visualizar este conteúdo."}
                        <br /> Entre em contato com o administrador caso precise de acesso extra.
                    </p>
                    <div className="pt-6">
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition"
                        >
                            Voltar ao Início
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
