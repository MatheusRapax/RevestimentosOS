'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreateExitData } from '@/hooks/useStockExits';
import { Loader2 } from 'lucide-react';

interface ExitHeaderFormProps {
    onSubmit: (data: CreateExitData) => Promise<void>;
    isLoading: boolean;
}

export function ExitHeaderForm({ onSubmit, isLoading }: ExitHeaderFormProps) {
    const [type, setType] = useState('SECTOR_REQUEST');
    const [destinationType, setDestinationType] = useState('SECTOR');
    const [destinationName, setDestinationName] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            type,
            destinationType,
            destinationName,
            notes,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-md">
            <h2 className="text-lg font-semibold">Dados da Saída / Requisição</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Tipo de Saída</Label>
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="SECTOR_REQUEST">Requisição de Setor</SelectItem>
                            <SelectItem value="PATIENT_USE">Uso Interno / Cliente</SelectItem>
                            <SelectItem value="DISCARD">Descarte / Avaria</SelectItem>
                            <SelectItem value="ADJUSTMENT">Ajuste de Estoque</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Tipo de Destino</Label>
                    <Select value={destinationType} onValueChange={setDestinationType}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="SECTOR">Setor</SelectItem>
                            <SelectItem value="ROOM">Showroom / Escritório</SelectItem>
                            <SelectItem value="CLIENT">Cliente</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label>Identificação do Destino (Nome do Setor, Paciente, etc)</Label>
                    <Input
                        value={destinationName}
                        onChange={e => setDestinationName(e.target.value)}
                        placeholder="Ex: Showroom Principal, João Silva, Depósito"
                        required
                    />
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label>Observações / Motivo</Label>
                    <Input
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Iniciar Saída
                </Button>
            </div>
        </form>
    );
}
