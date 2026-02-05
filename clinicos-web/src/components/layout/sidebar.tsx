'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
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
    ChevronLeft,
    ChevronRight,
    LucideIcon,
} from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

// Menu sections organized by area - Adapted for Revestimentos
const menuSections = [
    {
        title: 'Cadastros',
        icon: Users,
        items: [
            { href: '/dashboard/clientes', label: 'Clientes', icon: Users, module: 'SALES' },
            { href: '/dashboard/arquitetos', label: 'Arquitetos', icon: Building2, module: 'ARCHITECTS' },
            { href: '/dashboard/fornecedores', label: 'Fornecedores', icon: Building2, module: 'PURCHASES' },
            { href: '/dashboard/estoque/produtos', label: 'Produtos', icon: Package, module: 'STOCK' },
        ],
    },
    {
        title: 'Vendas',
        icon: ShoppingCart,
        items: [
            { href: '/dashboard/orcamentos', label: 'Orçamentos', icon: FileText, module: 'SALES' },
            { href: '/dashboard/pedidos', label: 'Pedidos', icon: ShoppingCart, module: 'SALES' },
            { href: '/dashboard/entregas', label: 'Entregas', icon: Truck, module: 'DELIVERIES' },
        ],
    },
    {
        title: 'Compras',
        icon: ClipboardList,
        items: [
            { href: '/dashboard/compras', label: 'Pedidos de Compra', icon: ShoppingCart, module: 'PURCHASES' },
        ],
    },
    {
        title: 'Estoque',
        icon: Package,
        items: [
            { href: '/dashboard/estoque', label: 'Visão Geral', icon: Package, module: 'STOCK' },
            { href: '/dashboard/estoque/movimentacoes', label: 'Movimentações', icon: ArrowLeftRight, module: 'STOCK' },
        ],
    },
    {
        title: 'Financeiro',
        icon: DollarSign,
        items: [
            { href: '/dashboard/financeiro', label: 'Visão Geral', icon: DollarSign, module: 'FINANCE' },
            { href: '/dashboard/financeiro/contas-a-pagar', label: 'Contas a Pagar', icon: ClipboardList, module: 'FINANCE' },
            { href: '/dashboard/financeiro/vendedores', label: 'Por Vendedor', icon: Users, module: 'FINANCE' },
            { href: '/dashboard/financeiro/arquitetos', label: 'Comissões Arquitetos', icon: Building2, module: 'FINANCE' },
        ],
    },
    {
        title: 'Administração',
        icon: Shield,
        items: [
            { href: '/dashboard/admin/usuarios', label: 'Usuários', icon: Users, module: 'ADMIN' },
            { href: '/dashboard/admin/papeis', label: 'Papéis e Acessos', icon: Shield, module: 'ADMIN' },
            { href: '/dashboard/admin/auditoria', label: 'Auditoria', icon: Shield, module: 'ADMIN' },
        ],
    },
];

interface SectionPopoverProps {
    section: typeof menuSections[0];
    isActive: (href: string) => boolean;
    enabledModules: string[];
}

function SectionPopover({ section, isActive, enabledModules }: SectionPopoverProps) {
    const [open, setOpen] = useState(false);
    const Icon = section.icon;

    const filteredItems = section.items.filter(item => {
        if (!item.module) return true;
        return enabledModules.includes(item.module);
    });

    if (filteredItems.length === 0) return null;

    const hasActiveItem = filteredItems.some(item => isActive(item.href));

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    className={`w-full flex items-center justify-center p-3 rounded-lg transition ${hasActiveItem
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                        }`}
                    title={section.title}
                >
                    <Icon size={22} />
                </button>
            </PopoverTrigger>
            <PopoverContent
                side="right"
                align="start"
                className="w-48 p-2 bg-gray-900 border-gray-700"
                sideOffset={8}
            >
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 py-1 mb-1">
                    {section.title}
                </div>
                {filteredItems.map((item) => {
                    const ItemIcon = item.icon;
                    const active = isActive(item.href);

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm ${active
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:bg-gray-800'
                                }`}
                        >
                            <ItemIcon size={16} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
            </PopoverContent>
        </Popover>
    );
}

export default function Sidebar() {
    const { user, activeClinic: activeClinicId } = useAuth();
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(true);

    const activeClinic = user?.clinics.find(c => c.id === activeClinicId);
    const enabledModules = (activeClinic as any)?.modules || [];

    const filteredMenuSections = menuSections.map(section => ({
        ...section,
        items: section.items.filter(item => {
            if (!item.module) return true;
            return enabledModules.includes(item.module);
        })
    })).filter(section => section.items.length > 0);

    const isActive = (href: string) => {
        const exactMatchRoutes = [
            '/dashboard/estoque',
            '/dashboard/atendimentos',
        ];

        if (exactMatchRoutes.includes(href)) {
            return pathname === href;
        }

        return pathname === href || pathname.startsWith(href + '/');
    };

    return (
        <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-gray-900 text-white flex flex-col transition-all duration-300`}>
            {/* Header */}
            <div className={`border-b border-gray-800 flex items-center h-[89px] ${isCollapsed ? 'justify-center px-2' : 'justify-between px-6'}`}>
                {!isCollapsed && (
                    <>
                        {(activeClinic as any)?.logoUrl ? (
                            <img
                                src={(activeClinic as any).logoUrl}
                                alt={activeClinic?.name}
                                className="max-h-12 max-w-[150px] object-contain"
                            />
                        ) : (
                            <h1 className="text-lg font-bold truncate">RevestimentosOS</h1>
                        )}
                    </>
                )}
                <Link
                    href="/dashboard"
                    className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                    title="Ir para Home"
                >
                    <Home size={20} />
                </Link>
            </div>

            {/* Navigation */}
            <nav className={`flex-1 py-4 space-y-2 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-4'}`}>
                {isCollapsed ? (
                    // Collapsed: Show only icons with popover submenus
                    <div className="space-y-2">
                        {filteredMenuSections.map((section) => (
                            <SectionPopover
                                key={section.title}
                                section={section}
                                isActive={isActive}
                                enabledModules={enabledModules}
                            />
                        ))}
                    </div>
                ) : (
                    // Expanded: Show full menu with labels
                    filteredMenuSections.map((section) => (
                        <div key={section.title} className="space-y-1">
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
                    ))
                )}
            </nav>

            {/* Collapse Toggle Button */}
            <div className="border-t border-gray-800 p-2">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition"
                    title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
                >
                    {isCollapsed ? (
                        <ChevronRight size={20} />
                    ) : (
                        <>
                            <ChevronLeft size={20} />
                            <span className="text-sm">Recolher</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
