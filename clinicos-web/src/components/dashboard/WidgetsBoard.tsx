'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, X, Cake, Package, AlertTriangle, DollarSign, TrendingUp, ShoppingCart } from 'lucide-react';

// Widget type definitions for flooring store
const WIDGET_CONFIG = {
    birthdays: {
        label: 'Aniversários',
        icon: Cake,
        color: 'text-pink-500',
        bgColor: 'bg-pink-50',
        description: 'Clientes que fazem aniversário esta semana',
    },
    stock_alerts: {
        label: 'Estoque Baixo',
        icon: Package,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
        description: 'Produtos abaixo do estoque mínimo',
    },
    expenses_due: {
        label: 'Contas a Vencer',
        icon: AlertTriangle,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        description: 'Despesas com vencimento próximo',
    },
    pending_orders: {
        label: 'Pedidos Pendentes',
        icon: ShoppingCart,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50',
        description: 'Pedidos aguardando ação',
    },
    today_revenue: {
        label: 'Vendas Hoje',
        icon: TrendingUp,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        description: 'Resumo de vendas do dia',
    },
    pending_deliveries: {
        label: 'Entregas Pendentes',
        icon: DollarSign,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        description: 'Entregas agendadas para hoje',
    },
} as const;

type WidgetType = keyof typeof WIDGET_CONFIG;

interface WidgetsBoardProps {
    className?: string;
}

export default function WidgetsBoard({ className = '' }: WidgetsBoardProps) {
    const [widgets, setWidgets] = useState<WidgetType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showSelector, setShowSelector] = useState<number | null>(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await api.get('/dashboard/config');
            // Filter only valid widget types that exist in our config
            const validWidgets = (response.data || []).filter((w: string) => w in WIDGET_CONFIG);
            setWidgets(validWidgets);
        } catch (error) {
            console.error('Error fetching config:', error);
            setWidgets([]);
        } finally {
            setIsLoading(false);
        }
    };

    const saveConfig = async (newWidgets: WidgetType[]) => {
        try {
            await api.put('/dashboard/config', { widgets: newWidgets });
            setWidgets(newWidgets);
        } catch (error) {
            console.error('Error saving config:', error);
        }
    };

    const addWidget = (type: WidgetType) => {
        if (widgets.length < 3 && !widgets.includes(type)) {
            saveConfig([...widgets, type]);
        }
        setShowSelector(null);
    };

    const removeWidget = (type: WidgetType) => {
        saveConfig(widgets.filter((w) => w !== type));
    };

    if (isLoading) {
        return <div className="animate-pulse h-32 bg-gray-100 rounded-xl mt-6" />;
    }

    const availableWidgets = (Object.keys(WIDGET_CONFIG) as WidgetType[]).filter(
        (w) => !widgets.includes(w)
    );

    // Always show 3 slots
    const slots = [0, 1, 2];

    return (
        <div className={`mt-6 ${className}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {slots.map((slotIndex) => {
                    const widgetType = widgets[slotIndex];

                    if (widgetType) {
                        return (
                            <WidgetCard
                                key={widgetType}
                                type={widgetType}
                                onRemove={() => removeWidget(widgetType)}
                            />
                        );
                    }

                    // Empty slot
                    return (
                        <div key={`empty-${slotIndex}`} className="relative">
                            {showSelector === slotIndex ? (
                                <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm h-full min-h-[160px]">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm font-medium text-gray-700">
                                            Escolha um widget
                                        </span>
                                        <button
                                            onClick={() => setShowSelector(null)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {availableWidgets.map((type) => {
                                            const config = WIDGET_CONFIG[type];
                                            const Icon = config.icon;
                                            return (
                                                <button
                                                    key={type}
                                                    onClick={() => addWidget(type)}
                                                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <Icon size={16} className={config.color} />
                                                    <span className="text-sm">{config.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowSelector(slotIndex)}
                                    className="w-full h-full min-h-[160px] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-gray-400 hover:text-blue-500"
                                >
                                    <Plus size={24} />
                                    <span className="text-sm">Adicionar Widget</span>
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Individual Widget Card
function WidgetCard({
    type,
    onRemove,
}: {
    type: WidgetType;
    onRemove: () => void;
}) {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    const config = WIDGET_CONFIG[type];
    const Icon = config.icon;

    useEffect(() => {
        fetchData();
    }, [type]);

    const fetchData = async () => {
        try {
            const endpoint = `/dashboard/widgets/${type.replace(/_/g, '-')}`;
            const response = await api.get(endpoint);
            setData(response.data);
        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
            setData(null);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (cents: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

    return (
        <div className={`p-4 rounded-xl border border-gray-100 shadow-sm ${config.bgColor}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                    <Icon size={18} className={config.color} />
                    <span className="font-medium text-gray-800">{config.label}</span>
                </div>
                <button
                    onClick={onRemove}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title="Remover widget"
                >
                    <X size={14} />
                </button>
            </div>

            {isLoading ? (
                <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
            ) : !data || (Array.isArray(data) && data.length === 0) ? (
                <p className="text-sm text-gray-500 italic">Nenhum item</p>
            ) : (
                <div className="space-y-1">
                    {renderWidgetContent(type, data, formatCurrency)}
                </div>
            )}
        </div>
    );
}

// Render content based on widget type
function renderWidgetContent(type: WidgetType, data: any, formatCurrency: (c: number) => string): React.ReactNode {
    const items = Array.isArray(data) ? data : [];

    switch (type) {
        case 'birthdays':
            return (
                <ul className="space-y-1">
                    {items.slice(0, 5).map((item: any, i: number) => (
                        <li key={i} className="text-sm text-gray-700 truncate">
                            🎂 {item.name} {item.phone && `- ${item.phone}`}
                        </li>
                    ))}
                </ul>
            );

        case 'stock_alerts':
            return (
                <ul className="space-y-1">
                    {items.slice(0, 5).map((item: any, i: number) => (
                        <li key={i} className="text-sm text-gray-700 truncate">
                            ⚠️ {item.name} ({item.currentStock}/{item.minStock})
                        </li>
                    ))}
                </ul>
            );

        case 'expenses_due':
            return (
                <ul className="space-y-1">
                    {items.slice(0, 5).map((item: any, i: number) => {
                        const dueDate = new Date(item.dueDate).toLocaleDateString('pt-BR');
                        return (
                            <li key={i} className="text-sm text-gray-700 truncate">
                                📅 {item.description} - {formatCurrency(item.amountCents)} ({dueDate})
                            </li>
                        );
                    })}
                </ul>
            );

        case 'pending_orders':
            return (
                <ul className="space-y-1">
                    {items.slice(0, 5).map((item: any, i: number) => (
                        <li key={i} className="text-sm text-gray-700 truncate">
                            📦 Pedido #{item.number} - {item.customer?.name || 'Cliente'}
                        </li>
                    ))}
                </ul>
            );

        case 'today_revenue':
            // Expecting { totalCents, count }
            const total = data.totalCents || 0;
            const count = data.count || 0;
            return (
                <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(total)}</p>
                    <p className="text-sm text-gray-500">{count} venda(s) hoje</p>
                </div>
            );

        case 'pending_deliveries':
            return (
                <ul className="space-y-1">
                    {items.slice(0, 5).map((item: any, i: number) => {
                        const deliveryDate = item.deliveryDate
                            ? new Date(item.deliveryDate).toLocaleDateString('pt-BR')
                            : 'N/A';
                        return (
                            <li key={i} className="text-sm text-gray-700 truncate">
                                🚚 {item.customer?.name || 'Cliente'} - {deliveryDate}
                            </li>
                        );
                    })}
                </ul>
            );

        default:
            return <p className="text-sm text-gray-500">Widget não configurado</p>;
    }
}
