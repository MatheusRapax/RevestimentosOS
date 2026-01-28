'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import WidgetsBoard from '@/components/dashboard/WidgetsBoard';
import {
    Calendar,
    Users,
    Stethoscope,
    Package,
    Shield,
    ClipboardList,
    History,
    UserCog,
    ArrowLeftRight
} from 'lucide-react';

// All modules in a flat list for compact display
const modules = [
    {
        href: '/dashboard/agenda',
        label: 'Agenda',
        icon: Calendar,
        color: 'bg-blue-500',
    },
    {
        href: '/dashboard/pacientes',
        label: 'Pacientes',
        icon: Users,
        color: 'bg-green-500',
    },
    {
        href: '/dashboard/atendimentos',
        label: 'Atendimentos',
        icon: Stethoscope,
        color: 'bg-purple-500',
    },
    {
        href: '/dashboard/atendimentos/historico',
        label: 'Histórico',
        icon: History,
        color: 'bg-indigo-500',
    },
    {
        href: '/dashboard/financeiro',
        label: 'Financeiro',
        icon: ClipboardList,
        color: 'bg-yellow-500',
    },
    {
        href: '/dashboard/estoque',
        label: 'Estoque',
        icon: Package,
        color: 'bg-orange-500',
    },
    {
        href: '/dashboard/estoque/produtos',
        label: 'Produtos',
        icon: ClipboardList,
        color: 'bg-amber-500',
    },
    {
        href: '/dashboard/estoque/movimentacoes',
        label: 'Movimentações',
        icon: ArrowLeftRight,
        color: 'bg-teal-500',
    },
    {
        href: '/dashboard/admin/usuarios',
        label: 'Usuários',
        icon: Users,
        color: 'bg-cyan-500',
    },
    {
        href: '/dashboard/admin/professionals',
        label: 'Profissionais',
        icon: UserCog,
        color: 'bg-slate-600',
    },
    {
        href: '/dashboard/admin/especialidades',
        label: 'Especialidades',
        icon: ClipboardList,
        color: 'bg-pink-500',
    },
    {
        href: '/dashboard/admin/procedimentos',
        label: 'Procedimentos',
        icon: ClipboardList,
        color: 'bg-emerald-500',
    },
    {
        href: '/dashboard/admin/papeis',
        label: 'Papéis',
        icon: Shield,
        color: 'bg-violet-500',
    },
    {
        href: '/dashboard/admin/auditoria',
        label: 'Auditoria',
        icon: Shield,
        color: 'bg-red-500',
    },
];

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <div className="h-full flex flex-col">
            {/* Header compacto */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    Olá, {user?.name?.split(' ')[0] || 'Usuário'}! 👋
                </h1>
                <p className="text-sm text-gray-500">
                    Selecione um módulo para começar
                </p>
            </div>

            {/* Grid compacto - todos os módulos visíveis */}
            <div className="grid grid-cols-4 lg:grid-cols-9 gap-4">
                {modules.map((module) => {
                    const Icon = module.icon;
                    return (
                        <Link
                            key={module.href}
                            href={module.href}
                            className="group flex flex-col items-center p-4 rounded-xl bg-white border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200"
                        >
                            {/* Icon */}
                            <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${module.color} text-white mb-2 group-hover:scale-110 transition-transform`}>
                                <Icon size={24} />
                            </div>

                            {/* Label */}
                            <span className="text-xs font-medium text-gray-700 text-center">
                                {module.label}
                            </span>
                        </Link>
                    );
                })}
            </div>

            {/* Widgets configuráveis */}
            <WidgetsBoard />
        </div>
    );
}

