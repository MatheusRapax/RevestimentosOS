'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from '@/lib/api';
import { toast } from "sonner";
import { useAuth } from '@/hooks/use-auth';
import { Save, Settings } from 'lucide-react';

export function GeneralSettings() {
    const { activeClinic } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [markup, setMarkup] = useState<number | string>('');

    useEffect(() => {
        if (activeClinic) {
            fetchClinicData();
        }
    }, [activeClinic]);

    const fetchClinicData = async () => {
        try {
            setFetching(true);
            const response = await api.get(`/clinics/${activeClinic}`);
            setMarkup(response.data.globalMarkup ?? 40);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar configurações");
        } finally {
            setFetching(false);
        }
    };

    const handleSave = async () => {
        if (!activeClinic) return;

        try {
            setLoading(true);
            await api.patch(`/clinics/${activeClinic}`, {
                globalMarkup: Number(markup)
            });
            toast.success("Configurações salvas com sucesso");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar configurações");
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-500" />
                    <CardTitle>Configurações Gerais</CardTitle>
                </div>
                <CardDescription>
                    Defina comportamentos padrão para o catálogo e precificação.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-2 max-w-sm">
                    <Label htmlFor="markup">Markup Global Padrão (%)</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="markup"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Ex: 40"
                            value={markup}
                            onChange={(e) => setMarkup(e.target.value)}
                        />
                        <span className="text-sm text-gray-500">%</span>
                    </div>
                    <p className="text-sm text-gray-500">
                        Este valor será utilizado quando um produto não tiver markup definido, nem sua categoria ou marca.
                    </p>
                </div>

                <div className="pt-4">
                    <Button onClick={handleSave} disabled={loading}>
                        <Save className="h-4 w-4 mr-2" />
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
