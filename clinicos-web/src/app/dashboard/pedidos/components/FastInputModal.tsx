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
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface FastInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: { id: string; name: string }[];
  onSuccess: () => void;
}

export const FastInputModal = ({ isOpen, onClose, products, onSuccess }: FastInputModalProps) => {
  const [fiscalData, setFiscalData] = useState<Record<string, { ncm: string; cfop: string; cst: string; cest: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && products.length > 0) {
      const initialData: Record<string, { ncm: string; cfop: string; cst: string; cest: string }> = {};
      products.forEach(p => {
        initialData[p.id] = { ncm: '', cfop: '5102', cst: '00', cest: '' };
      });
      setFiscalData(initialData);
    }
  }, [isOpen, products]);

  const handleInputChange = (productId: string, field: string, value: string) => {
    setFiscalData(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    // Validate
    let hasError = false;
    const updates = products.map(p => {
      const data = fiscalData[p.id];
      if (!data.ncm || !data.cfop || !data.cst) {
        hasError = true;
      }
      return {
        id: p.id,
        ncm: data.ncm,
        cfop: data.cfop,
        cst: data.cst,
        cest: data.cest || undefined,
      };
    });

    if (hasError) {
      toast.error('Preencha os campos obrigatórios (NCM, CFOP, CST) para todos os produtos.');
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
      toast.error(error.response?.data?.message || 'Erro ao atualizar dados fiscais.');
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
                A SEFAZ exige NCM e CFOP válidos. Os produtos abaixo não possuem essas informações no cadastro. 
                Preencha-os para que o sistema atualize o cadastro permanentemente e conclua a emissão.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {products.map((product) => (
            <div key={product.id} className="border p-4 rounded-lg bg-slate-50">
              <h4 className="font-semibold text-slate-800 mb-3">{product.name}</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label>NCM <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Ex: 69072100"
                    value={fiscalData[product.id]?.ncm || ''}
                    onChange={(e) => handleInputChange(product.id, 'ncm', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>CFOP <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Ex: 5102"
                    value={fiscalData[product.id]?.cfop || ''}
                    onChange={(e) => handleInputChange(product.id, 'cfop', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>CST <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Ex: 00"
                    value={fiscalData[product.id]?.cst || ''}
                    onChange={(e) => handleInputChange(product.id, 'cst', e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>CEST</Label>
                  <Input
                    placeholder="Opcional"
                    value={fiscalData[product.id]?.cest || ''}
                    onChange={(e) => handleInputChange(product.id, 'cest', e.target.value)}
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
