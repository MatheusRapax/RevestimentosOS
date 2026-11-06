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
import { NcmPicker } from '@/components/fiscal/ncm-picker';
import { ORIGENS } from '@/lib/fiscal-labels';

interface FastInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: {
    id: string;
    name: string;
    ncm?: string;
    cfop?: string;
    cst?: string;
    cest?: string;
    origin?: number;
    gtin?: string;
  }[];
  onSuccess: () => void;
}

type FiscalRow = {
  ncm: string;
  cest: string;
  origin: string;
  gtin: string;
};

/**
 * Só pedimos o que o sistema não consegue descobrir sozinho: a classificação do produto
 * (NCM) e a origem. CFOP e CST saem do motor de regras fiscais, a partir do perfil da
 * empresa e do cadastro do cliente — por isso não aparecem aqui.
 */
export const FastInputModal = ({ isOpen, onClose, products, onSuccess }: FastInputModalProps) => {
  const [fiscalData, setFiscalData] = useState<Record<string, FiscalRow>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (isOpen && products.length > 0) {
      const initialData: Record<string, FiscalRow> = {};
      products.forEach((p) => {
        // Parte do que já está cadastrado (ex.: só falta a origem). A origem NÃO tem valor
        // padrão: "nacional" por engano num porcelanato importado muda o imposto.
        initialData[p.id] = {
          ncm: p.ncm && /^\d{8}$/.test(p.ncm) ? p.ncm : '',
          cest: p.cest || '',
          origin: p.origin != null ? String(p.origin) : '',
          gtin: p.gtin || '',
        };
      });
      setFiscalData(initialData);
      setShowErrors(false);
    }
  }, [isOpen, products]);

  const handleInputChange = (productId: string, field: keyof FiscalRow, value: string) => {
    setFiscalData((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  };

  const handleSave = async () => {
    const incompleto = products.some((p) => {
      const data = fiscalData[p.id];
      return !data || !/^\d{8}$/.test(data.ncm) || data.origin === '';
    });

    if (incompleto) {
      setShowErrors(true);
      toast.error('Escolha a classificação fiscal e a origem de todos os produtos.');
      return;
    }

    const updates = products.map((p) => {
      const data = fiscalData[p.id];
      return {
        id: p.id,
        ncm: data.ncm,
        cest: data.cest.trim() || undefined,
        origin: Number(data.origin),
        gtin: data.gtin.trim() || undefined,
      };
    });

    setIsSubmitting(true);
    try {
      await api.patch('/stock/products/batch-fiscal', { updates });
      toast.success('Dados fiscais salvos no cadastro dos produtos.');
      onClose();
      onSuccess(); // Retry emission
    } catch (error: any) {
      console.error('Error saving fiscal data:', error);
      toast.error(error.response?.data?.message?.[0] || error.response?.data?.message || 'Erro ao salvar os dados fiscais.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <DialogTitle>Faltam dados fiscais nos produtos</DialogTitle>
              <DialogDescription>
                Para emitir a nota, cada produto precisa de duas informações. Você preenche uma vez:
                elas ficam salvas no cadastro e não serão pedidas de novo. Os impostos e o tipo da
                operação (dentro ou fora do estado) o sistema calcula sozinho.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {products.map((product) => {
            const row = fiscalData[product.id];
            const ncmFalta = showErrors && !/^\d{8}$/.test(row?.ncm || '');
            const origemFalta = showErrors && (row?.origin ?? '') === '';
            return (
              <div key={product.id} className="border p-4 rounded-lg bg-slate-50 space-y-4">
                <h4 className="font-semibold text-slate-800">{product.name}</h4>

                <div className="space-y-1.5">
                  <Label>
                    O que é este produto? (classificação fiscal) <span className="text-red-500">*</span>
                  </Label>
                  <NcmPicker value={row?.ncm || ''} onChange={(v) => handleInputChange(product.id, 'ncm', v)} />
                  {ncmFalta && <p className="text-xs text-red-600">Escolha uma classificação para este produto.</p>}
                </div>

                <div className="space-y-1.5 md:max-w-md">
                  <Label>
                    De onde vem o produto? <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={row?.origin ?? ''}
                    onValueChange={(v) => handleInputChange(product.id, 'origin', v)}
                  >
                    <SelectTrigger className={origemFalta ? 'border-red-400' : undefined}>
                      <SelectValue placeholder="Escolha a origem" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORIGENS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {origemFalta && <p className="text-xs text-red-600">Escolha a origem deste produto.</p>}
                </div>

                <details className="text-sm">
                  <summary className="cursor-pointer text-slate-500 hover:text-slate-700">
                    Mais dados (opcionais)
                  </summary>
                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Código de barras (GTIN / EAN)</Label>
                      <Input
                        placeholder="Deixe vazio se não houver"
                        value={row?.gtin || ''}
                        onChange={(e) => handleInputChange(product.id, 'gtin', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>CEST</Label>
                      <Input
                        placeholder="Só se o contador pedir"
                        value={row?.cest || ''}
                        onChange={(e) => handleInputChange(product.id, 'cest', e.target.value)}
                      />
                    </div>
                  </div>
                </details>
              </div>
            );
          })}
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
