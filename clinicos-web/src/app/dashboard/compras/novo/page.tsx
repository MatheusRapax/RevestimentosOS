'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import PurchaseOrderForm from '@/components/purchase-orders/PurchaseOrderForm';

export default function NovoPedidoCompraPage() {
    const router = useRouter();
    const queryClient = useQueryClient();

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            await api.post('/purchase-orders', data);
        },
        onSuccess: () => {
            toast.success('Pedido de compra criado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            router.push('/dashboard/compras');
        },
        onError: (err: any) => {
            console.error(err);
            toast.error(err.message || 'Erro ao criar pedido de compra');
        }
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Novo Pedido de Compra</h1>
                    <p className="text-gray-500">Crie um novo pedido de compra para fornecedor</p>
                </div>
            </div>

            <PurchaseOrderForm
                onSubmit={async (data) => createMutation.mutateAsync(data)}
            />
        </div>
    );
}
