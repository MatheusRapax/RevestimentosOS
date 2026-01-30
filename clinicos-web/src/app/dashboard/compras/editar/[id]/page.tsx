'use client';

import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import PurchaseOrderForm from '@/components/purchase-orders/PurchaseOrderForm';

export default function EditarPedidoCompraPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const queryClient = useQueryClient();

    const { data: order, isLoading } = useQuery({
        queryKey: ['purchase-order', id],
        queryFn: async () => {
            const response = await api.get(`/purchase-orders/${id}`);
            return response.data;
        },
        enabled: !!id
    });

    const updateMutation = useMutation({
        mutationFn: async (data: any) => {
            await api.put(`/purchase-orders/${id}`, data);
        },
        onSuccess: () => {
            toast.success('Pedido atualizado com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['purchase-order', id] });
            router.push(`/dashboard/compras/${id}`);
        },
        onError: (err: any) => {
            console.error(err);
            toast.error(err.message || 'Erro ao atualizar pedido');
        }
    });

    if (isLoading) {
        return <div className="p-8 text-center">Carregando...</div>;
    }

    if (!order) {
        return <div className="p-8 text-center">Pedido não encontrado</div>;
    }

    if (!['DRAFT', 'SENT'].includes(order.status)) {
        return (
            <div className="p-8 text-center">
                Este pedido não pode ser editado (Status: {order.status})
                <br />
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>Voltar</Button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Editar Pedido #{order.number}</h1>
                    <p className="text-gray-500">Altere informações e itens do pedido</p>
                </div>
            </div>

            <PurchaseOrderForm
                initialData={order}
                isEditing={true}
                onSubmit={async (data) => updateMutation.mutateAsync(data)}
            />
        </div>
    );
}
