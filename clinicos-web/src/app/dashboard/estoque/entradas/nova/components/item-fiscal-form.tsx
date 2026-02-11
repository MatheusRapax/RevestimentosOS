import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AddItemData } from '@/hooks/useStockEntries';

interface ItemFiscalFormProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: Partial<AddItemData>) => void;
    productName?: string;
}

export function ItemFiscalForm({ open, onClose, onSave, productName }: ItemFiscalFormProps) {
    const [data, setData] = useState({
        ncm: '',
        cfop: '',
        cst: '',
        valueICMS: 0,
        rateICMS: 0,
        valueIPI: 0,
        rateIPI: 0,
        discountValueCents: 0,
        freightValueCents: 0,
        insuranceValueCents: 0
    });

    const handleChange = (field: string, value: any) => {
        setData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onSave(data);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Dados Fiscais do Item: {productName}</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
                    <div className="space-y-2">
                        <Label>NCM</Label>
                        <Input value={data.ncm} onChange={e => handleChange('ncm', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>CFOP</Label>
                        <Input value={data.cfop} onChange={e => handleChange('cfop', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>CST/CSOSN</Label>
                        <Input value={data.cst} onChange={e => handleChange('cst', e.target.value)} />
                    </div>

                    <div className="space-y-2">
                        <Label>Aliq. ICMS (%)</Label>
                        <Input
                            type="number"
                            value={data.rateICMS}
                            onChange={e => handleChange('rateICMS', parseFloat(e.target.value))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Valor ICMS (R$)</Label>
                        <Input
                            type="number"
                            value={(data.valueICMS / 100).toFixed(2)}
                            onChange={e => handleChange('valueICMS', parseFloat(e.target.value) * 100)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Aliq. IPI (%)</Label>
                        <Input
                            type="number"
                            value={data.rateIPI}
                            onChange={e => handleChange('rateIPI', parseFloat(e.target.value))}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave}>Salvar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
