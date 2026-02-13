import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle } from 'lucide-react';

interface FiscalTotalsFormProps {
    entryId: string;
    initialData?: any;
    onUpdate: (data: any) => Promise<void>;
}

export function FiscalTotalsForm({ entryId, initialData, onUpdate }: FiscalTotalsFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        // Totals
        calculationBaseICMS: initialData?.calculationBaseICMS ?? 0,
        valueICMS: initialData?.valueICMS ?? 0,
        calculationBaseICMSST: initialData?.calculationBaseICMSST ?? 0,
        valueICMSST: initialData?.valueICMSST ?? 0,
        totalProductsValueCents: initialData?.totalProductsValueCents ?? 0,
        freightValueCents: initialData?.freightValueCents ?? 0,
        insuranceValueCents: initialData?.insuranceValueCents ?? 0,
        discountValueCents: initialData?.discountValueCents ?? 0,
        otherExpensesValueCents: initialData?.otherExpensesValueCents ?? 0,
        totalIPIValueCents: initialData?.totalIPIValueCents ?? 0,

        // Transport
        freightType: initialData?.freightType ?? 0, // 0=CIF, 1=FOB
        carrierName: initialData?.carrierName ?? '',
        carrierDocument: initialData?.carrierDocument ?? '',
        carrierPlate: initialData?.carrierPlate ?? '',
        carrierState: initialData?.carrierState ?? '',

        // Volumes
        volumeQuantity: initialData?.volumeQuantity ?? 0,
        volumeSpecies: initialData?.volumeSpecies ?? '',
        grossWeight: initialData?.grossWeight ?? 0,
        netWeight: initialData?.netWeight ?? 0,
        // Header
        invoiceNumber: initialData?.invoiceNumber ?? '',
        series: initialData?.series ?? '',
        accessKey: initialData?.accessKey ?? '',
        operationNature: initialData?.operationNature ?? '',
        protocol: initialData?.protocol ?? '',
        model: initialData?.model ?? '55',
        emissionDate: initialData?.emissionDate ? new Date(initialData.emissionDate).toISOString().split('T')[0] : '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const formatCurrency = (val: number) => (val / 100).toFixed(2);
    const parseCurrency = (val: string) => Math.round(parseFloat(val || '0') * 100);

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    useEffect(() => {
        if (initialData) {
            setFormData({
                // Totals
                calculationBaseICMS: initialData.calculationBaseICMS ?? 0,
                valueICMS: initialData.valueICMS ?? 0,
                calculationBaseICMSST: initialData.calculationBaseICMSST ?? 0,
                valueICMSST: initialData.valueICMSST ?? 0,
                totalProductsValueCents: initialData.totalProductsValueCents ?? 0,
                freightValueCents: initialData.freightValueCents ?? 0,
                insuranceValueCents: initialData.insuranceValueCents ?? 0,
                discountValueCents: initialData.discountValueCents ?? 0,
                otherExpensesValueCents: initialData.otherExpensesValueCents ?? 0,
                totalIPIValueCents: initialData.totalIPIValueCents ?? 0,

                // Transport
                freightType: initialData.freightType ?? 0,
                carrierName: initialData.carrierName ?? '',
                carrierDocument: initialData.carrierDocument ?? '',
                carrierPlate: initialData.carrierPlate ?? '',
                carrierState: initialData.carrierState ?? '',

                // Volumes
                volumeQuantity: initialData.volumeQuantity ?? 0,
                volumeSpecies: initialData.volumeSpecies ?? '',
                grossWeight: initialData.grossWeight ?? 0,
                netWeight: initialData.netWeight ?? 0,
                // Header
                invoiceNumber: initialData.invoiceNumber ?? '',
                series: initialData.series ?? '',
                accessKey: initialData.accessKey ?? '',
                operationNature: initialData.operationNature ?? '',
                protocol: initialData.protocol ?? '',
                model: initialData.model ?? '55',
                emissionDate: initialData.emissionDate ? new Date(initialData.emissionDate).toISOString().split('T')[0] : '',
            });
        }
    }, [initialData]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.invoiceNumber) newErrors.invoiceNumber = 'Campo obrigatório';
        if (!formData.series) newErrors.series = 'Campo obrigatório';
        if (!formData.operationNature) newErrors.operationNature = 'Campo obrigatório';
        if (!formData.emissionDate) newErrors.emissionDate = 'Campo obrigatório';
        if (!formData.totalProductsValueCents) newErrors.totalProductsValueCents = 'Campo obrigatório';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            return; // Stop if validation fails
        }

        setLoading(true);
        try {
            await onUpdate(formData);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs defaultValue="totals">
                <TabsList>
                    <TabsTrigger value="header">Identificação</TabsTrigger>
                    <TabsTrigger value="totals">Totais e Impostos</TabsTrigger>
                    <TabsTrigger value="transport">Transporte e Volumes</TabsTrigger>
                </TabsList>

                <TabsContent value="header" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                                Número da Nota <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={formData.invoiceNumber || ''}
                                onChange={e => handleChange('invoiceNumber', e.target.value)}
                                className={errors.invoiceNumber ? 'border-red-500' : ''}
                            />
                            {errors.invoiceNumber && <span className="text-xs text-red-500">{errors.invoiceNumber}</span>}
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                                Série <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={formData.series || ''}
                                onChange={e => handleChange('series', e.target.value)}
                                className={errors.series ? 'border-red-500' : ''}
                            />
                            {errors.series && <span className="text-xs text-red-500">{errors.series}</span>}
                        </div>
                        <div className="space-y-2">
                            <Label>Modelo</Label>
                            <Input
                                value={formData.model || ''}
                                onChange={e => handleChange('model', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-1">
                            <Label className="flex items-center gap-1">
                                Data de Emissão <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="date"
                                value={formData.emissionDate || ''}
                                onChange={e => handleChange('emissionDate', e.target.value)}
                                className={errors.emissionDate ? 'border-red-500' : ''}
                            />
                            {errors.emissionDate && <span className="text-xs text-red-500">{errors.emissionDate}</span>}
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Chave de Acesso</Label>
                            <Input
                                value={formData.accessKey || ''}
                                onChange={e => handleChange('accessKey', e.target.value)}
                                maxLength={44}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label className="flex items-center gap-1">
                                Natureza da Operação <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={formData.operationNature || ''}
                                onChange={e => handleChange('operationNature', e.target.value)}
                                className={errors.operationNature ? 'border-red-500' : ''}
                            />
                            {errors.operationNature && <span className="text-xs text-red-500">{errors.operationNature}</span>}
                        </div>
                        <div className="space-y-2">
                            <Label>Protocolo</Label>
                            <Input
                                value={formData.protocol || ''}
                                onChange={e => handleChange('protocol', e.target.value)}
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="totals" className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Base Cálc. ICMS</Label>
                            <Input
                                type="number"
                                value={formatCurrency(formData.calculationBaseICMS)}
                                onChange={e => handleChange('calculationBaseICMS', parseCurrency(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Valor ICMS</Label>
                            <Input
                                type="number"
                                value={formatCurrency(formData.valueICMS)}
                                onChange={e => handleChange('valueICMS', parseCurrency(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Base Cálc. ST</Label>
                            <Input
                                type="number"
                                value={formatCurrency(formData.calculationBaseICMSST)}
                                onChange={e => handleChange('calculationBaseICMSST', parseCurrency(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Valor ST</Label>
                            <Input
                                type="number"
                                value={formatCurrency(formData.valueICMSST)}
                                onChange={e => handleChange('valueICMSST', parseCurrency(e.target.value))}
                            />
                        </div>

                        <Separator className="col-span-full my-2" />

                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                                Total Produtos <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="number"
                                value={formatCurrency(formData.totalProductsValueCents)}
                                onChange={e => handleChange('totalProductsValueCents', parseCurrency(e.target.value))}
                                className={errors.totalProductsValueCents ? 'border-red-500' : ''}
                            />
                            {errors.totalProductsValueCents && <span className="text-xs text-red-500">{errors.totalProductsValueCents}</span>}
                        </div>
                        <div className="space-y-2">
                            <Label>Valor Frete</Label>
                            <Input
                                type="number"
                                value={formatCurrency(formData.freightValueCents)}
                                onChange={e => handleChange('freightValueCents', parseCurrency(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Valor Seguro</Label>
                            <Input
                                type="number"
                                value={formatCurrency(formData.insuranceValueCents)}
                                onChange={e => handleChange('insuranceValueCents', parseCurrency(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Desconto</Label>
                            <Input
                                type="number"
                                value={formatCurrency(formData.discountValueCents)}
                                onChange={e => handleChange('discountValueCents', parseCurrency(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Outras Despesas</Label>
                            <Input
                                type="number"
                                value={formatCurrency(formData.otherExpensesValueCents)}
                                onChange={e => handleChange('otherExpensesValueCents', parseCurrency(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Valor IPI</Label>
                            <Input
                                type="number"
                                value={formatCurrency(formData.totalIPIValueCents)}
                                onChange={e => handleChange('totalIPIValueCents', parseCurrency(e.target.value))}
                            />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="transport" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Frete por Conta</Label>
                            <Select
                                value={String(formData.freightType)}
                                onValueChange={v => handleChange('freightType', parseInt(v))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">0 - Remetente (CIF)</SelectItem>
                                    <SelectItem value="1">1 - Destinatário (FOB)</SelectItem>
                                    <SelectItem value="9">9 - Sem Frete</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>Transportador (Razão Social)</Label>
                            <Input
                                value={formData.carrierName}
                                onChange={e => handleChange('carrierName', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>CNPJ/CPF Transportador</Label>
                            <Input
                                value={formData.carrierDocument}
                                onChange={e => handleChange('carrierDocument', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Placa Veículo</Label>
                            <Input
                                value={formData.carrierPlate}
                                onChange={e => handleChange('carrierPlate', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>UF Veículo</Label>
                            <Input
                                value={formData.carrierState}
                                maxLength={2}
                                onChange={e => handleChange('carrierState', e.target.value.toUpperCase())}
                            />
                        </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Qtd Volumes</Label>
                            <Input
                                type="number"
                                value={formData.volumeQuantity}
                                onChange={e => handleChange('volumeQuantity', parseInt(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Espécie</Label>
                            <Input
                                value={formData.volumeSpecies}
                                onChange={e => handleChange('volumeSpecies', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Peso Bruto (kg)</Label>
                            <Input
                                type="number"
                                step="0.001"
                                value={formData.grossWeight}
                                onChange={e => handleChange('grossWeight', parseFloat(e.target.value))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Peso Líquido (kg)</Label>
                            <Input
                                type="number"
                                step="0.001"
                                value={formData.netWeight}
                                onChange={e => handleChange('netWeight', parseFloat(e.target.value))}
                            />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end">
                <Button type="submit" disabled={loading}>
                    {loading ? 'Salvando...' : 'Salvar Dados Fiscais'}
                </Button>
            </div>
        </form>
    );
}
