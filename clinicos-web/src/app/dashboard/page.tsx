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
        moduleGroup: 'SALES',
        permission: 'customer.read',
    },
    {
        href: '/dashboard/arquitetos',
        label: 'Arquitetos',
        icon: PenTool,
        color: 'bg-indigo-500',
        moduleGroup: 'ARCHITECTS',
        permission: 'architect.read',
    },
    {
        href: '/dashboard/orcamentos',
        label: 'Orçamentos',
        icon: FileText,
        color: 'bg-green-500',
        moduleGroup: 'SALES',
        permission: 'quote.read',
    },
    {
        href: '/dashboard/pedidos',
        label: 'Pedidos',
        icon: ShoppingCart,
        color: 'bg-purple-500',
        moduleGroup: 'SALES',
        permission: 'order.read',
    },
    {
        href: '/dashboard/vendas/promocoes',
        label: 'Promoções',
        icon: Percent,
        color: 'bg-pink-500',
        moduleGroup: 'PROMOTIONS',
        permission: 'promotion.read',
    },
    // Estoque & Logística
    {
        href: '/dashboard/estoque',
        label: 'Visão Geral (Estoque)',
        icon: LayoutDashboard,
        color: 'bg-amber-600',
        moduleGroup: 'STOCK',
        permission: 'stock.view',
    },
    {
        href: '/dashboard/estoque/produtos',
        label: 'Produtos',
        icon: Package,
        color: 'bg-amber-500',
        moduleGroup: 'STOCK',
        permission: 'product.read',
    },
    {
        href: '/dashboard/estoque/movimentacoes',
        label: 'Movimentações',
        icon: ArrowLeftRight,
        color: 'bg-teal-500',
        moduleGroup: 'STOCK',
        permission: 'stock.view',
    },
    {
        href: '/dashboard/estoque/ocorrencias',
        label: 'Avarias (RMA)',
        icon: AlertTriangle,
        color: 'bg-red-500',
        moduleGroup: 'RMA',
        permission: 'rma.read',
    },
    {
        href: '/dashboard/entregas',
        label: 'Expedição / Entregas',
        icon: Truck,
        color: 'bg-orange-500',
        moduleGroup: 'DELIVERIES',
        permission: 'delivery.read',
    },
    // Compras
    {
        href: '/dashboard/fornecedores',
        label: 'Fornecedores',
        icon: Factory,
        color: 'bg-rose-600',
        moduleGroup: 'PURCHASES',
        permission: 'supplier.read',
    },
    {
        href: '/dashboard/compras',
        label: 'Pedidos Compra',
        icon: ShoppingCart,
        color: 'bg-rose-500',
        moduleGroup: 'PURCHASES',
        permission: 'purchase.read',
    },
    // Financeiro
    {
        href: '/dashboard/financeiro',
        label: 'Visão Geral (Financeiro)',
        icon: DollarSign,
        color: 'bg-emerald-500',
        moduleGroup: 'FINANCE',
        permission: 'finance.read',
    },
    {
        href: '/dashboard/financeiro/contas-a-pagar',
        label: 'Contas a Pagar',
        icon: CreditCard,
        color: 'bg-red-400',
        moduleGroup: 'FINANCE',
        permission: 'finance.read', // or clearer sub-permission if exists
    },
    {
        href: '/dashboard/financeiro/vendedores',
        label: 'Comissão Vend.',
        icon: Wallet,
        color: 'bg-sky-500',
        moduleGroup: 'FINANCE',
        permission: 'commission.report.read',
    },
    {
        href: '/dashboard/financeiro/arquitetos',
        label: 'Comissão Arq.',
        icon: Landmark,
        color: 'bg-violet-500',
        moduleGroup: 'FINANCE',
        permission: 'commission.report.read',
    },
    // Admin
    {
        href: '/dashboard/admin/configuracoes',
        label: 'Config. Globais',
        icon: Settings,
        color: 'bg-slate-800',
        moduleGroup: 'ADMIN',
        permission: 'clinic.settings.manage',
    },
    {
        href: '/dashboard/admin/catalogo',
        label: 'Conf. Catálogo',
        icon: Tags,
        color: 'bg-slate-700',
        moduleGroup: 'STOCK', // Or ADMIN depending on requirement
        permission: 'catalogue.settings',
    },
    {
        href: '/dashboard/admin/usuarios',
        label: 'Usuários',
        icon: Users,
        color: 'bg-slate-600',
        moduleGroup: 'ADMIN',
        permission: 'role.manage', // Assuming user management sits here
    },
    {
        href: '/dashboard/admin/papeis',
        label: 'Permissões',
        icon: Shield,
        color: 'bg-gray-600',
        moduleGroup: 'ADMIN',
        permission: 'role.read',
    },
    {
        href: '/dashboard/configuracoes/templates',
        label: 'Templates',
        icon: FileText,
        color: 'bg-slate-500',
        moduleGroup: 'ADMIN',
        permission: 'clinic.settings.manage',
    },
    {
        href: '/dashboard/admin/auditoria',
        label: 'Auditoria',
        icon: Activity,
        color: 'bg-zinc-600',
        moduleGroup: 'ADMIN',
        permission: 'audit.read',
    },
];

export default function DashboardPage() {
    const { user, activeClinic: activeClinicId } = useAuth();

    const activeClinic = user?.clinics?.find(c => c.id === activeClinicId);
    const enabledModules = activeClinic?.modules || [];
    const userPermissions = activeClinic?.permissions || [];
    const isSuperAdmin = user?.isSuperAdmin || false;

    // Filter modules based on Clinic Modules only (Allow RBAC to be handled by ModuleGuard popup)
    const visibleModules = modules.filter(m => {
        if (isSuperAdmin) return true;

        const hasModuleGroup = enabledModules.includes(m.moduleGroup);
        if (!hasModuleGroup) return false;

        return true;
    });

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
                {visibleModules.map((module) => {
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
