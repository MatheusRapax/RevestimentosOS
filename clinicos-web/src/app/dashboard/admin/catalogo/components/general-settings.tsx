'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from '@/lib/api';
import { toast } from "sonner";
import { useAuth } from '@/hooks/use-auth';
import { Save, Settings, Calculator } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function GeneralSettings() {
    const { activeClinic } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [markup, setMarkup] = useState<number | string>('');

    // Calculator states
    const [calcTax, setCalcTax] = useState<string>('');
    const [calcFixed, setCalcFixed] = useState<string>('');
    const [calcCommission, setCalcCommission] = useState<string>('');
    const [calcNet, setCalcNet] = useState<string>('');
    const [isCalcOpen, setIsCalcOpen] = useState(false);

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

    const calculatedMarkup = (Number(calcTax || 0) + Number(calcFixed || 0) + Number(calcCommission || 0) + Number(calcNet || 0)).toFixed(2);

    const handleApplyCalculator = () => {
        setMarkup(calculatedMarkup);
        setIsCalcOpen(false);
    };

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

                        <Popover open={isCalcOpen} onOpenChange={setIsCalcOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="icon" title="Calculadora de Margem">
                                    <Calculator className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80">
                                <div className="space-y-4">
                                    <h4 className="font-medium leading-none">Calculadora de Markup</h4>
                                    <p className="text-sm text-muted-foreground">Adicione suas margens em % para descobrir o Markup ideal.</p>

                                    <div className="grid gap-3">
                                        <div className="grid grid-cols-3 items-center gap-4">
                                            <Label htmlFor="tax" className="col-span-2 text-xs">Imposto Médio (%)</Label>
                                            <Input id="tax" type="number" step="0.5" className="h-8 col-span-1" value={calcTax} onChange={(e) => setCalcTax(e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-3 items-center gap-4">
                                            <Label htmlFor="fixed" className="col-span-2 text-xs">Custo Fixo/Operação (%)</Label>
                                            <Input id="fixed" type="number" step="0.5" className="h-8 col-span-1" value={calcFixed} onChange={(e) => setCalcFixed(e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-3 items-center gap-4">
                                            <Label htmlFor="commission" className="col-span-2 text-xs">Comissão Venda (%)</Label>
                                            <Input id="commission" type="number" step="0.5" className="h-8 col-span-1" value={calcCommission} onChange={(e) => setCalcCommission(e.target.value)} />
                                        </div>
                                        <div className="grid grid-cols-3 items-center gap-4">
                                            <Label htmlFor="net" className="col-span-2 text-xs font-semibold">Lucro Líquido (%)</Label>
                                            <Input id="net" type="number" step="0.5" className="h-8 col-span-1" value={calcNet} onChange={(e) => setCalcNet(e.target.value)} />
                                        </div>
                                    </div>

                                    <div className="bg-muted p-3 rounded-md flex justify-between items-center mt-2">
                                        <span className="text-sm font-semibold">Markup Sugerido:</span>
                                        <span className="text-lg font-bold text-primary">{calculatedMarkup}%</span>
                                    </div>

                                    <Button className="w-full mt-2" size="sm" onClick={handleApplyCalculator}>
                                        Aplicar Markup
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
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
