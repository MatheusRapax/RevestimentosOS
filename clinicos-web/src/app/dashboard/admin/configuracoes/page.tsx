'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, Save, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

interface StoreSettings {
    defaultDeliveryFee: number;
}

export default function StoreSettingsPage() {
    const [settings, setSettings] = useState<StoreSettings>({ defaultDeliveryFee: 0 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setLoading(true);
                const res = await api.get('/settings');
                setSettings({
                    defaultDeliveryFee: res.data.defaultDeliveryFee / 100 // converting from cents to display
                });
                setError(null);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Erro ao carregar configurações');
                toast.error('Erro ao carregar configurações');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.patch('/settings', {
                defaultDeliveryFee: Math.round(settings.defaultDeliveryFee * 100) // convert to cents
            });
            toast.success('Configurações salvas com sucesso!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao salvar configurações');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="h-6 w-6" />
                        Configurações Globais
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Gerencie taxas, comportamentos padrão e dados aplicados a toda a loja.
                    </p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-bold">Atenção</h4>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Comercial e Vendas</CardTitle>
                    <CardDescription>
                        Valores padrões que são puxados automaticamente no momento de criar um novo pedido ou cotação.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Taxa de Entrega */}
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Taxa de Entrega Padrão (R$)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-500">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={settings.defaultDeliveryFee}
                                    onChange={(e) => setSettings({ ...settings, defaultDeliveryFee: parseFloat(e.target.value) || 0 })}
                                    className="w-full pl-9 pr-4 py-2 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0,00"
                                />
                            </div>
                            <p className="text-xs text-gray-500">
                                Este valor virá preenchido no campo frete ao criar orçamentos. Pode ser alterado pedido a pedido.
                            </p>
                        </div>
                    </div>

                    {/* Future configuration parameters like global margins, email addresses etc can go here */}

                </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
                >
                    {saving ? 'Salvando...' : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            Salvar Alterações
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
