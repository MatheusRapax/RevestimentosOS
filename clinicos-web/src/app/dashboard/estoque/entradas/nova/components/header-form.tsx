'use client';

import { format } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { maskAccessKey, maskCNPJ } from '@/lib/masks';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateEntryData } from '@/hooks/useStockEntries';
import { Loader2 } from 'lucide-react';

import { NFeItem } from '@/lib/nfe-parser';
import { Upload, Search, PlusCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

interface HeaderFormProps {
    onSubmit: (data: CreateEntryData) => Promise<void>;
    isLoading: boolean;
    onXmlImported?: (items: NFeItem[]) => void;
}

export function HeaderForm({ onSubmit, isLoading, onXmlImported }: HeaderFormProps) {
    const [type, setType] = useState('INVOICE');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [series, setSeries] = useState('');
    const [supplierId, setSupplierId] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [supplierCnpj, setSupplierCnpj] = useState('');
    const [emissionDate, setEmissionDate] = useState('');
    const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [isRegisteringSupplier, setIsRegisteringSupplier] = useState(false);
    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);

    // Fiscal
    const [accessKey, setAccessKey] = useState('');
    const [operationNature, setOperationNature] = useState('');
    const [protocol, setProtocol] = useState('');
    const [model, setModel] = useState('55');

    // XML Data Store (Hidden)
    const [xmlTotals, setXmlTotals] = useState<any>(null);
    const [xmlTransport, setXmlTransport] = useState<any>(null);
    const [xmlInstallments, setXmlInstallments] = useState<any[]>([]);

    const [isLoadingXML, setIsLoadingXML] = useState(false);

    // Fetch existing suppliers
    const { data: suppliers = [], refetch: refetchSuppliers } = useQuery({
        queryKey: ['suppliers', 'active'],
        queryFn: async () => {
            const response = await api.get('/suppliers', { params: { isActive: 'true' } });
            return Array.isArray(response.data) ? response.data : (response.data?.data || []);
        }
    });

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsLoadingXML(true);
            const { parseNFeXML } = await import('@/lib/nfe-parser');
            const data = await parseNFeXML(file);

            setInvoiceNumber(data.invoiceNumber);
            setSeries(data.series);
            
            const xmlCnpj = data.supplier?.cnpj?.replace(/\D/g, '');
            const xmlName = data.supplier?.name;
            
            setSupplierName(xmlName || '');
            if (xmlCnpj) {
                setSupplierCnpj(maskCNPJ(xmlCnpj));
                // Check if supplier already exists by CNPJ
                const matched = suppliers.find((s: any) => s.cnpj && s.cnpj.replace(/\D/g, '') === xmlCnpj);
                if (matched) {
                    setSupplierId(matched.id);
                    toast.success(`Fornecedor ${matched.name} encontrado no sistema!`);
                } else {
                    setSupplierId('');
                    toast.info(`Fornecedor do XML não está cadastrado. Você pode cadastrá-lo agora.`);
                }
            }
            if (data.emissionDate) {
                setEmissionDate(data.emissionDate.toISOString().split('T')[0]);
            }
            if (data.accessKey) setAccessKey(data.accessKey);
            if (data.operationNature) setOperationNature(data.operationNature);
            if (data.protocol) setProtocol(data.protocol);
            if (data.model) setModel(data.model);

            if (data.totals) setXmlTotals(data.totals);
            if (data.transport) setXmlTransport(data.transport);
            if (data.installments && data.installments.length > 0) {
                setXmlInstallments(data.installments);
            }

            // Pass items up if prop exists
            if (onXmlImported && data.items.length > 0) {
                onXmlImported(data.items);
            }

        } catch (error) {
            console.error("Erro ao importar XML:", error);
            toast.error("Erro ao ler o arquivo XML. Verifique se é uma NFe válida.");
        } finally {
            setIsLoadingXML(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            type,
            invoiceNumber,
            series,
            supplierId: supplierId || undefined,
            supplierName,
            emissionDate: emissionDate || undefined,
            arrivalDate,
            notes,
            accessKey,
            operationNature,
            protocol,
            model,

            // Totals from XML (converted to cents/types as needed)
            calculationBaseICMS: xmlTotals?.vBC,
            valueICMS: xmlTotals?.vICMS,
            calculationBaseICMSST: xmlTotals?.vBCST,
            valueICMSST: xmlTotals?.vST,
            totalProductsValueCents: xmlTotals?.vProd ? Math.round(xmlTotals.vProd * 100) : undefined,
            freightValueCents: xmlTotals?.vFrete ? Math.round(xmlTotals.vFrete * 100) : undefined,
            insuranceValueCents: xmlTotals?.vSeg ? Math.round(xmlTotals.vSeg * 100) : undefined,
            discountValueCents: xmlTotals?.vDesc ? Math.round(xmlTotals.vDesc * 100) : undefined,
            otherExpensesValueCents: (
                (xmlTotals?.vOutro ? Math.round(xmlTotals.vOutro * 100) : 0) +
                (xmlTotals?.vIBS ? Math.round(xmlTotals.vIBS * 100) : 0) +
                (xmlTotals?.vCBS ? Math.round(xmlTotals.vCBS * 100) : 0)
            ) || undefined,
            totalIPIValueCents: xmlTotals?.vIPI ? Math.round(xmlTotals.vIPI * 100) : undefined,

            // Transport from XML
            freightType: xmlTransport?.modFrete,
            carrierName: xmlTransport?.carrierName,
            carrierDocument: xmlTransport?.carrierDocument,
            // carrierAddress: xmlTransport?.carrierAddress, // Not in CreateEntryData type yet?
            // carrierCity: xmlTransport?.carrierCity,
            carrierState: xmlTransport?.carrierState,
            carrierPlate: xmlTransport?.carrierPlate,

            // Volumes
            volumeQuantity: xmlTransport?.volQuantity,
            volumeSpecies: xmlTransport?.volSpecies,
            grossWeight: xmlTransport?.volGrossWeight,
            netWeight: xmlTransport?.volNetWeight,

            // Installments
            installments: xmlInstallments.length > 0 ? xmlInstallments : undefined,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-md relative">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Dados da Nota / Entrada</h2>
                <div className="relative">
                    <input
                        type="file"
                        accept=".xml"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        disabled={isLoading || isLoadingXML}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={isLoading || isLoadingXML}>
                        {isLoadingXML ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <Upload className="h-4 w-4 mr-2" />
                        )}
                        Importar XML
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="INVOICE">Nota Fiscal</SelectItem>
                            <SelectItem value="MANUAL">Manual / Avulsa</SelectItem>
                            <SelectItem value="DONATION">Doação</SelectItem>
                            <SelectItem value="RETURN">Devolução</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                        Número Documento / NF
                        {type === 'INVOICE' && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                        value={invoiceNumber}
                        onChange={e => setInvoiceNumber(e.target.value)}
                        placeholder={type === 'INVOICE' ? 'Ex: 12345' : 'Opcional'}
                        className={type === 'INVOICE' && !invoiceNumber ? 'border-red-300' : ''}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                        Série
                        {type === 'INVOICE' && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                        value={series}
                        onChange={e => setSeries(e.target.value)}
                        placeholder="Ex: 1"
                        className={type === 'INVOICE' && !series ? 'border-red-300' : ''}
                    />
                </div>
            </div>

            {/* Supplier Section */}
            <div className="border border-dashed border-gray-300 rounded-md p-4 bg-gray-50/50">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Fornecedor</h3>
                    {supplierId ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Vinculado ao Sistema</span>
                    ) : (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">Não Vinculado (Entrada Avulsa)</span>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Selecione um Fornecedor Cadastrado</Label>
                        <Select 
                            value={supplierId} 
                            onValueChange={(val) => {
                                if (val === 'none') {
                                    setSupplierId('');
                                    setSupplierName('');
                                    setSupplierCnpj('');
                                } else {
                                    setSupplierId(val);
                                    const sup = suppliers.find((s: any) => s.id === val);
                                    if (sup) {
                                        setSupplierName(sup.name);
                                        setSupplierCnpj(sup.cnpj ? maskCNPJ(sup.cnpj) : '');
                                    }
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">-- Preencher Manualmente --</SelectItem>
                                {suppliers.map((s: any) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name} {s.cnpj ? `(${s.cnpj})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {!supplierId && (
                        <div className="space-y-2">
                            <Label>Ou digite o CNPJ para buscar</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={supplierCnpj}
                                    onChange={e => setSupplierCnpj(maskCNPJ(e.target.value))}
                                    placeholder="00.000.000/0000-00"
                                    maxLength={18}
                                />
                                <Button 
                                    type="button" 
                                    variant="secondary"
                                    onClick={async () => {
                                        if (!supplierCnpj) return;
                                        setIsFetchingCnpj(true);
                                        try {
                                            const cleanCnpj = supplierCnpj.replace(/\D/g, '');
                                            // Check DB first
                                            const matched = suppliers.find((s: any) => s.cnpj && s.cnpj.replace(/\D/g, '') === cleanCnpj);
                                            if (matched) {
                                                setSupplierId(matched.id);
                                                setSupplierName(matched.name);
                                                toast.success('Fornecedor encontrado no sistema!');
                                                return;
                                            }
                                            // Fetch from BrasilAPI
                                            const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
                                            if (res.ok) {
                                                const data = await res.json();
                                                setSupplierName(data.razao_social || data.nome_fantasia);
                                                toast.success('Dados carregados da Receita Federal!');
                                            } else {
                                                toast.error('CNPJ não encontrado na Receita.');
                                            }
                                        } catch (err) {
                                            toast.error('Erro ao buscar CNPJ.');
                                        } finally {
                                            setIsFetchingCnpj(false);
                                        }
                                    }}
                                    disabled={isFetchingCnpj}
                                >
                                    {isFetchingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2 md:col-span-2">
                        <Label className="flex items-center gap-1">
                            Razão Social / Nome <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={supplierName}
                            onChange={e => setSupplierName(e.target.value)}
                            placeholder="Nome do Fornecedor"
                            className={!supplierName ? 'border-red-300' : ''}
                            disabled={!!supplierId}
                        />
                    </div>
                </div>

                {!supplierId && supplierName && (
                    <div className="mt-4 flex justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                            onClick={async () => {
                                setIsRegisteringSupplier(true);
                                try {
                                    const res = await api.post('/suppliers', {
                                        name: supplierName,
                                        cnpj: supplierCnpj || undefined
                                    });
                                    toast.success('Fornecedor cadastrado com sucesso!');
                                    setSupplierId(res.data.id);
                                    refetchSuppliers();
                                } catch (err) {
                                    toast.error('Erro ao cadastrar fornecedor.');
                                } finally {
                                    setIsRegisteringSupplier(false);
                                }
                            }}
                            disabled={isRegisteringSupplier}
                        >
                            {isRegisteringSupplier ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlusCircle className="h-4 w-4 mr-2" />}
                            Salvar Fornecedor no Sistema
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2 md:col-span-2">
                    <Label>Chave de Acesso</Label>
                    <Input
                        value={maskAccessKey(accessKey)}
                        onChange={e => setAccessKey(maskAccessKey(e.target.value))}
                        placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                        maxLength={54}
                    />
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                        Nat. Operação
                        {type === 'INVOICE' && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                        value={operationNature}
                        onChange={e => setOperationNature(e.target.value)}
                        className={type === 'INVOICE' && !operationNature ? 'border-red-300' : ''}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Protocolo</Label>
                    <Input
                        value={protocol}
                        onChange={e => setProtocol(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                        Data Emissão
                        {type === 'INVOICE' && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                        type="date"
                        value={emissionDate}
                        onChange={e => setEmissionDate(e.target.value)}
                        className={type === 'INVOICE' && !emissionDate ? 'border-red-300' : ''}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                        Data Chegada / Entrada <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        type="date"
                        value={arrivalDate}
                        onChange={e => setArrivalDate(e.target.value)}
                        required
                        className={!arrivalDate ? 'border-red-300' : ''}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Observações</Label>
                    <Input
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Iniciar Entrada
                </Button>
            </div>
        </form>
    );
}
