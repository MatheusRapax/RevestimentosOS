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
    Percent,
    Search,
    ClipboardList,
    // New differentiated icons:
    PenTool,
    LayoutDashboard,
    AlertTriangle,
    Factory,
    CreditCard,
    Wallet,
    Landmark,
    Tags,
    Activity,
    Settings,
} from 'lucide-react';

// Modules for a flooring/tile store ERP - synced with sidebar
const modules = [
    // Comercial
    {
        href: '/dashboard/clientes',
        label: 'Clientes',
        icon: Users,
        color: 'bg-blue-500',
    },
    {
        href: '/dashboard/arquitetos',
        label: 'Arquitetos',
        icon: PenTool,
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
        href: '/dashboard/vendas/promocoes',
        label: 'Promoções',
        icon: Percent,
        color: 'bg-pink-500',
    },
    // Estoque & Logística
    {
        href: '/dashboard/estoque',
        label: 'Visão Geral (Estoque)',
        icon: LayoutDashboard,
        color: 'bg-amber-600',
    },
    {
        href: '/dashboard/estoque/produtos',
        label: 'Produtos',
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
        href: '/dashboard/estoque/ocorrencias',
        label: 'Avarias (RMA)',
        icon: AlertTriangle,
        color: 'bg-red-500',
    },
    {
        href: '/dashboard/entregas',
        label: 'Expedição / Entregas',
        icon: Truck,
        color: 'bg-orange-500',
    },
    // Compras
    {
        href: '/dashboard/fornecedores',
        label: 'Fornecedores',
        icon: Factory,
        color: 'bg-rose-600',
    },
    {
        href: '/dashboard/compras',
        label: 'Pedidos Compra',
        icon: ShoppingCart,
        color: 'bg-rose-500',
    },
    // Financeiro
    {
        href: '/dashboard/financeiro',
        label: 'Visão Geral (Financeiro)',
        icon: DollarSign,
        color: 'bg-emerald-500',
    },
    {
        href: '/dashboard/financeiro/contas-a-pagar',
        label: 'Contas a Pagar',
        icon: CreditCard,
        color: 'bg-red-400',
    },
    {
        href: '/dashboard/financeiro/vendedores',
        label: 'Comissão Vend.',
        icon: Wallet,
        color: 'bg-sky-500',
    },
    {
        href: '/dashboard/financeiro/arquitetos',
        label: 'Comissão Arq.',
        icon: Landmark,
        color: 'bg-violet-500',
    },
    // Admin
    {
        href: '/dashboard/admin/configuracoes',
        label: 'Config. Globais',
        icon: Settings,
        color: 'bg-slate-800',
    },
    {
        href: '/dashboard/admin/catalogo',
        label: 'Conf. Catálogo',
        icon: Tags,
        color: 'bg-slate-700',
    },
    {
        href: '/dashboard/admin/usuarios',
        label: 'Usuários',
        icon: Users,
        color: 'bg-slate-600',
    },
    {
        href: '/dashboard/admin/papeis',
        label: 'Permissões',
        icon: Shield,
        color: 'bg-gray-600',
    },
    {
        href: '/dashboard/configuracoes/templates',
        label: 'Templates',
        icon: FileText,
        color: 'bg-slate-500',
    },
    {
        href: '/dashboard/admin/auditoria',
        label: 'Auditoria',
        icon: Activity,
        color: 'bg-zinc-600',
    },
];

export default function DashboardPage() {
    const { user } = useAuth();

    return (
        <div className="h-full flex flex-col">
            {/* Header compacto */}
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Olá, {user?.name?.split(' ')[0] || 'Usuário'}! 👋
                    </h1>
                    <p className="text-sm text-gray-500">
                        Selecione um módulo para começar
                    </p>
                </div>
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
