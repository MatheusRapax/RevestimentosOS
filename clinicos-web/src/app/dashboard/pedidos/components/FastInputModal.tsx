import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface FastInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: { id: string; name: string }[];
  onSuccess: () => void;
}

type FiscalRow = {
  ncm: string;
  cfop: string;
  cst: string;
  cest: string;
  origin: string;
  gtin: string;
};

const EMPTY_ROW: FiscalRow = {
  ncm: '',
  cfop: '5102',
  cst: '00',
  cest: '',
  origin: '0',
  gtin: '',
};

export const FastInputModal = ({ isOpen, onClose, products, onSuccess }: FastInputModalProps) => {
  const [fiscalData, setFiscalData] = useState<Record<string, FiscalRow>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && products.length > 0) {
      const initialData: Record<string, FiscalRow> = {};
      products.forEach((p) => {
        initialData[p.id] = { ...EMPTY_ROW };
      });
      setFiscalData(initialData);
    }
  }, [isOpen, products]);

  const handleInputChange = (productId: string, field: keyof FiscalRow, value: string) => {
    setFiscalData((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  };

  const handleSave = async () => {
    let hasError = false;
    const updates = products.map((p) => {
      const data = fiscalData[p.id];
      if (!/^\d{8}$/.test(data.ncm) || !data.cfop || !data.cst || data.origin === '') {
        hasError = true;
      }
      return {
        id: p.id,
        ncm: data.ncm,
        cfop: data.cfop,
        cst: data.cst,
        cest: data.cest || undefined,
        origin: data.origin !== '' ? Number(data.origin) : undefined,
        gtin: data.gtin?.trim() || undefined,
      };
    });

    if (hasError) {
      toast.error('Preencha NCM (8 dígitos), CFOP, CST e Origem para todos os produtos.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.patch('/stock/products/batch-fiscal', { updates });
      toast.success('Dados fiscais atualizados com sucesso!');
      onClose();
      onSuccess(); // Retry emission
    } catch (error: any) {
      console.error('Error saving fiscal data:', error);
      toast.error(error.response?.data?.message?.[0] || error.response?.data?.message || 'Erro ao atualizar dados fiscais.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <DialogTitle>Preenchimento Fiscal Obrigatório</DialogTitle>
              <DialogDescription>
                A SEFAZ exige NCM, CFOP, CST e Origem. Os produtos abaixo estão sem essas
                informações no cadastro. Preencha para atualizar o cadastro e concluir a emissão.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {products.map((product) => (
            <div key={product.id} className="border p-4 rounded-lg bg-slate-50">
              <h4 className="font-semibold text-slate-800 mb-3">{product.name}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>NCM <span className="text-red-500">*</span> <span className="text-xs text-gray-400">(8 dígitos)</span></Label>
                  <Input
                    placeholder="Ex: 69072100"
                    maxLength={8}
                    value={fiscalData[product.id]?.ncm || ''}
                    onChange={(e) => handleInputChange(product.id, 'ncm', e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>CFOP <span className="text-red-500">*</span> <span className="text-xs text-gray-400">(sugerido)</span></Label>
                  <Input
                    placeholder="Ex: 5102"
                    value={fiscalData[product.id]?.cfop || ''}
                    onChange={(e) => handleInputChange(product.id, 'cfop', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>CST / CSOSN <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Ex: 00"
                    value={fiscalData[product.id]?.cst || ''}
                    onChange={(e) => handleInputChange(product.id, 'cst', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Origem <span className="text-red-500">*</span></Label>
                  <Select
                    value={fiscalData[product.id]?.origin ?? '0'}
                    onValueChange={(v) => handleInputChange(product.id, 'origin', v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - Nacional</SelectItem>
                      <SelectItem value="1">1 - Estrangeira (importação direta)</SelectItem>
                      <SelectItem value="2">2 - Estrangeira (mercado interno)</SelectItem>
                      <SelectItem value="3">3 - Nacional, conteúdo import. &gt; 40% e ≤ 70%</SelectItem>
                      <SelectItem value="4">4 - Nacional (processos produtivos básicos)</SelectItem>
                      <SelectItem value="5">5 - Nacional, conteúdo import. ≤ 40%</SelectItem>
                      <SelectItem value="6">6 - Estrangeira (import. direta, sem similar)</SelectItem>
                      <SelectItem value="7">7 - Estrangeira (mercado interno, sem similar)</SelectItem>
                      <SelectItem value="8">8 - Nacional, conteúdo import. &gt; 70%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>CEST</Label>
                  <Input
                    placeholder="Opcional"
                    value={fiscalData[product.id]?.cest || ''}
                    onChange={(e) => handleInputChange(product.id, 'cest', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>GTIN / EAN</Label>
                  <Input
                    placeholder="Deixe vazio se não houver"
                    value={fiscalData[product.id]?.gtin || ''}
                    onChange={(e) => handleInputChange(product.id, 'gtin', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar Emissão
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Salvar e Emitir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
