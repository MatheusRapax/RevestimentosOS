'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import {
    Users,
    Package,
    Shield,
    ClipboardList,
    ArrowLeftRight,
    Home,
    FileText,
    Building2,
    ShoppingCart,
    DollarSign,
    Truck,
} from 'lucide-react';

// Menu sections organized by area - Adapted for Revestimentos
const menuSections = [
    {
        title: 'Vendas',
        items: [
            { href: '/dashboard/clientes', label: 'Clientes', icon: Users, module: 'SALES' },
            { href: '/dashboard/arquitetos', label: 'Arquitetos', icon: Building2, module: 'ARCHITECTS' },
            { href: '/dashboard/orcamentos', label: 'Orçamentos', icon: FileText, module: 'SALES' },
            { href: '/dashboard/pedidos', label: 'Pedidos', icon: ShoppingCart, module: 'SALES' },
            { href: '/dashboard/entregas', label: 'Entregas', icon: Truck, module: 'DELIVERIES' },
        ],
    },
    {
        title: 'Estoque',
        items: [
            { href: '/dashboard/estoque', label: 'Estoque', icon: Package, module: 'STOCK' },
            { href: '/dashboard/estoque/produtos', label: 'Produtos', icon: ClipboardList, module: 'STOCK' },
            { href: '/dashboard/estoque/movimentacoes', label: 'Movimentações', icon: ArrowLeftRight, module: 'STOCK' },
        ],
    },
    {
        title: 'Compras',
        items: [
            { href: '/dashboard/compras', label: 'Pedidos de Compra', icon: ShoppingCart, module: 'PURCHASES' },
            { href: '/dashboard/fornecedores', label: 'Fornecedores', icon: Building2, module: 'PURCHASES' },
        ],
    },
    {
        title: 'Financeiro',
        items: [
            { href: '/dashboard/financeiro', label: 'Visão Geral', icon: DollarSign, module: 'FINANCE' },
            { href: '/dashboard/financeiro/vendedores', label: 'Por Vendedor', icon: Users, module: 'FINANCE' },
            { href: '/dashboard/financeiro/arquitetos', label: 'Comissões Arquitetos', icon: Building2, module: 'FINANCE' },
        ],
    },
    {
        title: 'Administração',
        items: [
            { href: '/dashboard/admin/usuarios', label: 'Usuários', icon: Users, module: 'admin' },
            { href: '/dashboard/admin/papeis', label: 'Papéis e Acessos', icon: Shield, module: 'admin' },
            { href: '/dashboard/admin/auditoria', label: 'Auditoria', icon: Shield, module: 'admin' },
        ],
    },
];

export default function Sidebar() {
    const { user, activeClinic: activeClinicId } = useAuth();
    const pathname = usePathname();

    const activeClinic = user?.clinics.find(c => c.id === activeClinicId);
    // Assuming modules are available in activeClinic object. If not, might need to fetch or ensure they are present in user context.
    // Based on previous AuthContext update, user has clinics array. Let's assume Clinic interface has modules.

    // Default to all modules if no restriction (or for SuperAdmin viewing everything? No, tenant rules apply)
    // Actually, usually we have a list of all items and we filter them.

    // We need to verify if 'modules' is present in the Clinic interface in AuthContext.
    // In AuthContext (Step 215), Clinic interface: id, name, slug. It is MISSING modules. 
    // I need to update AuthContext structure first to include modules in Clinic interface.

    const enabledModules = (activeClinic as any)?.modules || []; // Temporary cast until verified

    const filteredMenuSections = menuSections.map(section => ({
        ...section,
        items: section.items.filter(item => {
            if (!item.module) return true; // Items without module requirement are always indicated
            return enabledModules.includes(item.module);
        })
    })).filter(section => section.items.length > 0); // Remove sections that become empty after filtering

    const isActive = (href: string) => {
        // Routes that need exact match (parent routes with children)
        const exactMatchRoutes = [
            '/dashboard/estoque',
            '/dashboard/atendimentos',
        ];

        if (exactMatchRoutes.includes(href)) {
            return pathname === href;
        }

        // For all other routes, use startsWith for sub-routes
        return pathname === href || pathname.startsWith(href + '/');
    };

    return (
        <div className="w-64 bg-gray-900 text-white flex flex-col">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between h-[89px]">
                {(activeClinic as any)?.logoUrl ? (
                    <img
                        src={(activeClinic as any).logoUrl}
                        alt={activeClinic?.name}
                        className="max-h-12 max-w-[150px] object-contain"
                    />
                ) : (
                    <h1 className="text-xl font-bold">RevestimentosOS</h1>
                )}
                <Link
                    href="/dashboard"
                    className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                    title="Ir para Home"
                >
                    <Home size={20} />
                </Link>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
                {filteredMenuSections.map((section) => (
                    <div key={section.title} className="space-y-2">
                        <div className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            {section.title}
                        </div>
                        {section.items.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${active
                                        ? 'bg-blue-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-800'
                                        }`}
                                >
                                    <Icon size={20} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>
        </div>
    );
}
