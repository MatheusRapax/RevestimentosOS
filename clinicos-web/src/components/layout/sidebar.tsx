'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
            { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
            { href: '/dashboard/arquitetos', label: 'Arquitetos', icon: Building2 },
            { href: '/dashboard/orcamentos', label: 'Orçamentos', icon: FileText },
            { href: '/dashboard/pedidos', label: 'Pedidos', icon: ShoppingCart },
            { href: '/dashboard/entregas', label: 'Entregas', icon: Truck },
        ],
    },
    {
        title: 'Estoque',
        items: [
            { href: '/dashboard/estoque', label: 'Estoque', icon: Package },
            { href: '/dashboard/estoque/produtos', label: 'Produtos', icon: ClipboardList },
            { href: '/dashboard/estoque/movimentacoes', label: 'Movimentações', icon: ArrowLeftRight },
            { href: '/dashboard/estoque/importar', label: 'Importar CSV', icon: FileText },
            { href: '/dashboard/estoque/importar-nfe', label: 'Importar NFe', icon: FileText },
        ],
    },
    {
        title: 'Compras',
        items: [
            { href: '/dashboard/compras', label: 'Pedidos de Compra', icon: ShoppingCart },
            { href: '/dashboard/fornecedores', label: 'Fornecedores', icon: Building2 },
        ],
    },
    {
        title: 'Financeiro',
        items: [
            { href: '/dashboard/financeiro', label: 'Visão Geral', icon: DollarSign },
            { href: '/dashboard/financeiro/vendedores', label: 'Por Vendedor', icon: Users },
            { href: '/dashboard/financeiro/arquitetos', label: 'Comissões Arquitetos', icon: Building2 },
        ],
    },
    {
        title: 'Administração',
        items: [
            { href: '/dashboard/admin/usuarios', label: 'Usuários', icon: Users },
            { href: '/dashboard/admin/papeis', label: 'Papéis e Acessos', icon: Shield },
            { href: '/dashboard/admin/auditoria', label: 'Auditoria', icon: Shield },
        ],
    },
];

export default function Sidebar() {
    const pathname = usePathname();

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
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                <h1 className="text-xl font-bold">RevestimentosOS</h1>
                <Link
                    href="/dashboard"
                    className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                    title="Ir para Home"
                >
                    <Home size={20} />
                </Link>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
                {menuSections.map((section) => (
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
