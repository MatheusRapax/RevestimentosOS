'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import WidgetsBoard from '@/components/dashboard/WidgetsBoard';
import {
    Users,
    Package,
    FileText,
    ShoppingCart,
    Truck,
    DollarSign,
    Building2,
    BarChart3,
    Shield,
    Receipt,
    UserCog,
    ArrowLeftRight,
    Upload,
    FileCode
} from 'lucide-react';

// Modules for a flooring/tile store ERP - synced with sidebar
const modules = [
    // Vendas
    {
        href: '/dashboard/clientes',
        label: 'Clientes',
        icon: Users,
        color: 'bg-blue-500',
    },
    {
        href: '/dashboard/arquitetos',
        label: 'Arquitetos',
        icon: Building2,
        color: 'bg-indigo-500',
    },
    {
        href: '/dashboard/orcamentos',
        label: 'Orçamentos',
        icon: FileText,
        color: 'bg-green-500',
    },
    {
        href: '/dashboard/pedidos',
        label: 'Pedidos',
        icon: ShoppingCart,
        color: 'bg-purple-500',
    },
    {
        href: '/dashboard/entregas',
        label: 'Entregas',
        icon: Truck,
        color: 'bg-orange-500',
    },
    // Estoque
    {
        href: '/dashboard/estoque',
        label: 'Estoque',
        icon: Package,
        color: 'bg-amber-500',
    },
    {
        href: '/dashboard/estoque/movimentacoes',
        label: 'Movimentações',
        icon: ArrowLeftRight,
        color: 'bg-teal-500',
    },
    {
        href: '/dashboard/estoque/importar',
        label: 'Importar CSV',
        icon: Upload,
        color: 'bg-lime-500',
    },
    {
        href: '/dashboard/estoque/importar-nfe',
        label: 'Importar NFe',
        icon: FileCode,
        color: 'bg-cyan-500',
    },
    // Compras
    {
        href: '/dashboard/compras',
        label: 'Compras',
        icon: Receipt,
        color: 'bg-rose-500',
    },
    // Financeiro
    {
        href: '/dashboard/financeiro',
        label: 'Financeiro',
        icon: DollarSign,
        color: 'bg-emerald-500',
    },
    {
        href: '/dashboard/financeiro/contas-a-pagar',
        label: 'Contas a Pagar',
        icon: Receipt,
        color: 'bg-red-500',
    },
    {
        href: '/dashboard/financeiro/vendedores',
        label: 'Por Vendedor',
        icon: BarChart3,
        color: 'bg-sky-500',
    },
    {
        href: '/dashboard/financeiro/arquitetos',
        label: 'Comissões',
        icon: Building2,
        color: 'bg-violet-500',
    },
    // Admin
    {
        href: '/dashboard/admin/usuarios',
        label: 'Usuários',
        icon: UserCog,
        color: 'bg-slate-600',
    },
    {
        href: '/dashboard/admin/papeis',
        label: 'Permissões',
        icon: Shield,
        color: 'bg-gray-600',
    },
    {
        href: '/dashboard/admin/auditoria',
        label: 'Auditoria',
        icon: Shield,
        color: 'bg-zinc-600',
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
            <div className="grid grid-cols-4 lg:grid-cols-6 gap-4">
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
