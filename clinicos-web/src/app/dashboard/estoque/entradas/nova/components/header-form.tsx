'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
            // Pass items up if prop exists (to be implemented)
            // For now, we just fill the header

            // If items need to be passed, we might need to change the onSubmit or add a new prop
            if (onXmlImported && data.items.length > 0) {
                onXmlImported(data.items);
            }

        } catch (error) {
            console.error("Erro ao importar XML:", error);
            alert("Erro ao ler o arquivo XML. Verifique se é uma NFe válida.");
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
                    <Label>Número Documento / NF</Label>
                    <Input
                        value={invoiceNumber}
                        onChange={e => setInvoiceNumber(e.target.value)}
                        placeholder={type === 'INVOICE' ? 'Ex: 12345' : 'Opcional'}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Série</Label>
                    <Input
                        value={series}
                        onChange={e => setSeries(e.target.value)}
                        placeholder="Ex: 1"
                    />
                </div>

                <div className="space-y-2">
                    <Label>Fornecedor</Label>
                    <Input
                        value={supplierName}
                        onChange={e => setSupplierName(e.target.value)}
                        placeholder="Nome do Fornecedor"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Data Emissão</Label>
                    <Input
                        type="date"
                        value={emissionDate}
                        onChange={e => setEmissionDate(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Data Chegada / Entrada</Label>
                    <Input
                        type="date"
                        value={arrivalDate}
                        onChange={e => setArrivalDate(e.target.value)}
                        required
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
