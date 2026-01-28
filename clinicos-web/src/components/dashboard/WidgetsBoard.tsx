'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, X, Cake, Calendar, Package, Bell, Stethoscope, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Widget type definitions
const WIDGET_CONFIG = {
    birthdays: {
        label: 'Aniversários',
        icon: Cake,
        color: 'text-pink-500',
        bgColor: 'bg-pink-50',
    },
    today_appointments: {
        label: 'Agenda do Dia',
        icon: Calendar,
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
    },
    stock_alerts: {
        label: 'Alertas de Estoque',
        icon: Package,
        color: 'text-orange-500',
        bgColor: 'bg-orange-50',
    },
    notices: {
        label: 'Avisos',
        icon: Bell,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
    },
    open_encounters: {
        label: 'Atendimentos Abertos',
        icon: Stethoscope,
        color: 'text-purple-500',
        bgColor: 'bg-purple-50',
    },
    upcoming_expirations: {
        label: 'Vencimentos',
        icon: Clock,
        color: 'text-red-500',
        bgColor: 'bg-red-50',
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
            setWidgets(response.data || []);
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
    const [data, setData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const config = WIDGET_CONFIG[type];
    const Icon = config.icon;

    useEffect(() => {
        fetchData();
    }, [type]);

    const fetchData = async () => {
        try {
            const endpoint = `/dashboard/widgets/${type.replace('_', '-')}`;
            const response = await api.get(endpoint);
            setData(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error(`Error fetching ${type}:`, error);
            setData([]);
        } finally {
            setIsLoading(false);
        }
    };

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
            ) : data.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Nenhum item</p>
            ) : (
                <ul className="space-y-1">
                    {data.slice(0, 5).map((item, i) => (
                        <li key={i} className="text-sm text-gray-700 truncate">
                            {renderItem(type, item)}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

// Render item based on widget type
function renderItem(type: WidgetType, item: any): string {
    switch (type) {
        case 'birthdays':
            return `🎂 ${item.name}`;
        case 'today_appointments':
            const time = new Date(item.startAt).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
            });
            return `${time} - ${item.patient?.name || 'Paciente'}`;
        case 'stock_alerts':
            return `⚠️ ${item.name} (${item.currentStock}/${item.minStock})`;
        case 'notices':
            const priority = item.priority === 'urgent' ? '🔴' : item.priority === 'high' ? '🟡' : '';
            return `${priority} ${item.title}`;
        case 'open_encounters':
            return `${item.patient?.name || 'Paciente'} - ${item.professional?.name || 'Profissional'}`;
        case 'upcoming_expirations':
            const expDate = new Date(item.expirationDate).toLocaleDateString('pt-BR');
            return `${item.product?.name || 'Produto'} - ${expDate}`;
        default:
            return JSON.stringify(item);
    }
}
