'use client';

import { format } from 'date-fns';
import { toast } from 'sonner';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { maskAccessKey } from '@/lib/masks';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateEntryData } from '@/hooks/useStockEntries';
import { Loader2 } from 'lucide-react';

import { NFeItem } from '@/lib/nfe-parser';
import { Upload } from 'lucide-react';

interface HeaderFormProps {
    onSubmit: (data: CreateEntryData) => Promise<void>;
    isLoading: boolean;
    onXmlImported?: (items: NFeItem[]) => void;
}

export function HeaderForm({ onSubmit, isLoading, onXmlImported }: HeaderFormProps) {
    const [type, setType] = useState('INVOICE');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [series, setSeries] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [emissionDate, setEmissionDate] = useState('');
    const [arrivalDate, setArrivalDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');

    // Fiscal
    const [accessKey, setAccessKey] = useState('');
    const [operationNature, setOperationNature] = useState('');
    const [protocol, setProtocol] = useState('');
    const [model, setModel] = useState('55');

    // XML Data Store (Hidden)
    const [xmlTotals, setXmlTotals] = useState<any>(null);
    const [xmlTransport, setXmlTransport] = useState<any>(null);

    const [isLoadingXML, setIsLoadingXML] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsLoadingXML(true);
            const { parseNFeXML } = await import('@/lib/nfe-parser');
            const data = await parseNFeXML(file);

            setInvoiceNumber(data.invoiceNumber);
            setSeries(data.series);
            setSupplierName(data.supplier.name);
            if (data.emissionDate) {
                setEmissionDate(data.emissionDate.toISOString().split('T')[0]);
            }
            if (data.accessKey) setAccessKey(data.accessKey);
            if (data.operationNature) setOperationNature(data.operationNature);
            if (data.protocol) setProtocol(data.protocol);
            if (data.model) setModel(data.model);

            if (data.totals) setXmlTotals(data.totals);
            if (data.transport) setXmlTransport(data.transport);

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

                <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                        Fornecedor <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={supplierName}
                        onChange={e => setSupplierName(e.target.value)}
                        placeholder="Nome do Fornecedor"
                        className={!supplierName ? 'border-red-300' : ''}
                    />
                </div>
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
