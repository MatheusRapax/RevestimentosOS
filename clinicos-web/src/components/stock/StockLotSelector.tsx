
import React from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertCircle, Split } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface StockLot {
    id: string;
    lotNumber: string;
    quantity: number;
    shade?: string;
    caliber?: string;
    reservations?: any[];
}

interface StockLotSelectorProps {
    lots: StockLot[];
    selectedLotId?: string;
    quantityRequested: number;
    onSelectLot: (lotId: string | undefined) => void;
    onSplitItem?: (lotId: string, maxQuantity: number) => void;
    disabled?: boolean;
}

export function StockLotSelector({
    lots,
    selectedLotId,
    quantityRequested,
    onSelectLot,
    onSplitItem,
    disabled
}: StockLotSelectorProps) {

    // Helper to calculate available stock
    const getAvailable = (lot: StockLot) => {
        const reserved = lot.reservations?.reduce((acc: number, r: any) => acc + r.quantity, 0) || 0;
        return lot.quantity - reserved;
    };

    const selectedLot = lots.find(l => l.id === selectedLotId);
    const availableInSelected = selectedLot ? getAvailable(selectedLot) : 0;
    const isInsufficient = selectedLotId && quantityRequested > availableInSelected;

    return (
        <div className="space-y-2">
            <Label>Lote Preferencial (Opcional)</Label>
            <div className="flex gap-2 items-start">
                <div className="flex-1">
                    <Select
                        value={selectedLotId || 'none'}
                        onValueChange={(value) => onSelectLot(value === 'none' ? undefined : value)}
                        disabled={disabled}
                    >
                        <SelectTrigger className={isInsufficient ? 'border-amber-500 bg-amber-50' : ''}>
                            <SelectValue placeholder="Qualquer lote (Automático)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">
                                <span className="font-medium">Qualquer lote (Automático)</span>
                                <span className="block text-xs text-gray-500">O sistema escolherá o mais antigo</span>
                            </SelectItem>
                            {lots.map((lot) => {
                                const available = getAvailable(lot);
                                const isMismatch = quantityRequested > available;

                                return (
                                    <SelectItem key={lot.id} value={lot.id} className="flex flex-col items-start py-2">
                                        <div className="flex justify-between w-full gap-4">
                                            <span className="font-medium">Lot: {lot.lotNumber}</span>
                                            <span className={`text-xs ${isMismatch ? 'text-amber-600' : 'text-green-600'}`}>
                                                Disp: {available}cx
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400 flex gap-2">
                                            {lot.shade && <span>Ton: {lot.shade}</span>}
                                            {lot.caliber && <span>Cal: {lot.caliber}</span>}
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Warning and Action for Insufficient Stock */}
            {isInsufficient && (
                <div className="rounded-md bg-amber-50 p-3 border border-amber-200">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                        <div className="text-sm text-amber-800">
                            <p className="font-medium">Estoque insuficiente neste lote!</p>
                            <p className="text-xs mt-1">
                                Você pediu <strong>{quantityRequested}</strong> mas só temos <strong>{availableInSelected}</strong>.
                                O sistema completará com outro lote, o que pode gerar diferença de tonalidade.
                            </p>

                            {onSplitItem && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 w-full border-amber-300 hover:bg-amber-100 text-amber-900"
                                    onClick={() => onSplitItem(selectedLotId!, availableInSelected)}
                                >
                                    <Split className="h-3 w-3 mr-2" />
                                    Dividir em 2 Linhas
                                    <span className="ml-1 text-xs opacity-70">
                                        ({availableInSelected} deste + {quantityRequested - availableInSelected} de outro)
                                    </span>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
