'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FormData {
    type: string;
    notes: string;
    supplierId: string;
    customerId: string;
    orderId: string;
    purchaseOrderId: string;
    items: { productId: string; lotId: string; quantity: number; unitType: string; reason: string }[];
}

interface OptionItem {
    id: string;
    name?: string;
    tradeName?: string;
    number?: number;
    items?: Array<{ product?: { id: string } }>;
}

export default function NovaOcorrenciaPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [products, setProducts] = useState<OptionItem[]>([]);
    const [suppliers, setSuppliers] = useState<OptionItem[]>([]);
    const [customers, setCustomers] = useState<OptionItem[]>([]);
    const [orders, setOrders] = useState<OptionItem[]>([]);
    const [purchaseOrders, setPurchaseOrders] = useState<OptionItem[]>([]);
    const [productLots, setProductLots] = useState<Record<string, any[]>>({});

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
        defaultValues: {
            type: 'RECEBIMENTO',
            notes: '',
            supplierId: '',
            customerId: '',
            orderId: '',
            purchaseOrderId: '',
            items: [{ productId: '', lotId: '', quantity: 1, unitType: 'CAIXA', reason: '' }],
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    const selectedType = watch('type');
    const selectedPurchaseOrderId = watch('purchaseOrderId');
    const selectedOrderId = watch('orderId');
    const watchItems = watch('items');

    useEffect(() => {
        watchItems?.forEach(item => {
            if (item.productId && !productLots[item.productId]) {
                // Initialize with loading or empty to prevent multiple calls
                setProductLots(prev => ({ ...prev, [item.productId]: [] }));
                api.get(`/stock/product/${item.productId}`)
                    .then(res => {
                        setProductLots(prev => ({ ...prev, [item.productId]: res.data.lots || [] }));
                    })
                    .catch(console.error);
            }
        });
    }, [JSON.stringify(watchItems), productLots]);

    const availableProducts = useMemo(() => {
        if (selectedType === 'RECEBIMENTO' && selectedPurchaseOrderId) {
            const po = purchaseOrders.find(p => p.id === selectedPurchaseOrderId);
            if (po && po.items) {
                const productIds = new Set(po.items.map(i => i.product?.id).filter(Boolean));
                return products.filter(p => p.id && productIds.has(p.id));
            }
        } else if (selectedType === 'ENTREGA' && selectedOrderId) {
            const order = orders.find(o => o.id === selectedOrderId);
            if (order && order.items) {
                const productIds = new Set(order.items.map(i => i.product?.id).filter(Boolean));
                return products.filter(p => p.id && productIds.has(p.id));
            }
        }
        return products;
    }, [selectedType, selectedPurchaseOrderId, selectedOrderId, purchaseOrders, orders, products]);

    useEffect(() => {
        // Fetch reference data independently
        api.get('/stock/products?isActive=true').then(res => setProducts(res.data)).catch(console.error);
        api.get('/suppliers').then(res => setSuppliers(res.data)).catch(console.error);
        api.get('/customers').then(res => setCustomers(res.data)).catch(console.error);
        api.get('/orders').then(res => setOrders(res.data)).catch(console.error);
        api.get('/purchase-orders').then(res => setPurchaseOrders(res.data)).catch(console.error);
    }, []);

    const onSubmit = async (data: FormData) => {
        try {
            setIsLoading(true);

            const payload: any = {
                type: data.type,
                notes: data.notes,
                items: data.items.map(i => ({
                    productId: i.productId,
                    lotId: i.lotId || undefined,
                    quantity: Number(i.quantity),
                    unitType: i.unitType,
                    reason: i.reason
                }))
            };

            if (data.type === 'RECEBIMENTO' && data.supplierId) {
                payload.supplierId = data.supplierId;
            }
            if (data.type === 'RECEBIMENTO' && data.purchaseOrderId) {
                payload.purchaseOrderId = data.purchaseOrderId;
            }
            if (data.type === 'ENTREGA' && data.customerId) {
                payload.customerId = data.customerId;
            }
            if (data.type === 'ENTREGA' && data.orderId) {
                payload.orderId = data.orderId;
            }

            await api.post('/occurrences', payload);
            router.push('/dashboard/estoque/ocorrencias');

        } catch (error) {
            console.error('Falha ao criar ocorrência:', error);
            alert((error as any).response?.data?.message || 'Erro ao criar ocorrência');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center space-x-4">
                <Link href="/dashboard/estoque/ocorrencias">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Nova Ocorrência / RMA</h1>
                    <p className="text-gray-500">Registre uma nova avaria ou devolução.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Tipo de Ocorrência</Label>
                            <Controller
                                name="type"
                                control={control}
                                rules={{ required: 'Tipo é obrigatório' }}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o tipo..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="RECEBIMENTO">Recebimento (Fornecedor)</SelectItem>
                                            <SelectItem value="ENTREGA">Entrega (Cliente/Pedido)</SelectItem>
                                            <SelectItem value="DEFEITO">Defeito / Garantia</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>

                        {selectedType === 'RECEBIMENTO' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Fornecedor Relacionado</Label>
                                    <Controller
                                        name="supplierId"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o Fornecedor..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {suppliers.map(s => (
                                                        <SelectItem key={s.id} value={s.id}>{s.name || s.tradeName}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Pedido de Compra Relacionado (Opcional)</Label>
                                    <Controller
                                        name="purchaseOrderId"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o Pedido da Fábrica..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {purchaseOrders.map(po => (
                                                        <SelectItem key={po.id} value={po.id}>Pedido #{po.number}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>
                        )}

                        {selectedType === 'ENTREGA' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Cliente Relacionado (Opcional)</Label>
                                    <Controller
                                        name="customerId"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o Cliente..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {customers.map(c => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Pedido Relacionado (Opcional)</Label>
                                    <Controller
                                        name="orderId"
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o Pedido..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {orders.map(o => (
                                                        <SelectItem key={o.id} value={o.id}>Pedido #{o.number}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label>Observações Gerais</Label>
                        <Textarea
                            {...register('notes')}
                            placeholder="Descreva detalhes sobre a ocorrência, transportadora, etc..."
                            rows={3}
                        />
                    </div>
                </Card>

                <Card className="p-6 space-y-4">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-xl font-bold">Produtos Avariados</h2>
                            <p className="text-sm text-gray-500">Adicione os produtos que sofreram avaria ou defeito.</p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => append({ productId: '', lotId: '', quantity: 1, unitType: 'CAIXA', reason: '' })}
                        >
                            <Plus className="h-4 w-4 mr-2" /> Adicionar Produto
                        </Button>
                    </div>

                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border p-4 rounded-lg bg-gray-50">
                            <div className="md:col-span-4 space-y-2">
                                <Label>Produto</Label>
                                <Controller
                                    name={`items.${index}.productId`}
                                    control={control}
                                    rules={{ required: true }}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o Produto..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {availableProducts.map(p => (
                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                ))}
                                                {availableProducts.length === 0 && (
                                                    <div className="p-2 text-sm text-gray-500">Nenhum produto atrelado ao pedido.</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            <div className="md:col-span-3 space-y-2">
                                <Label>Lote</Label>
                                <Controller
                                    name={`items.${index}.lotId`}
                                    control={control}
                                    rules={{ required: 'Lote é obrigatório' }}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!watchItems[index]?.productId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o Lote" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {productLots[watchItems[index]?.productId] && productLots[watchItems[index]?.productId].length > 0 ? (
                                                    productLots[watchItems[index]?.productId].map(lot => (
                                                        <SelectItem key={lot.id} value={lot.id}>Lote {lot.lotNumber}</SelectItem>
                                                    ))
                                                ) : (
                                                    <div className="p-2 text-sm text-gray-500">Nenhum lote com saldo encontrado.</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>

                            <div className="md:col-span-5 space-y-2">
                                <Label>Quantidade / Medida</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        {...register(`items.${index}.quantity`, { required: true, valueAsNumber: true })}
                                    />
                                    <Controller
                                        name={`items.${index}.unitType`}
                                        control={control}
                                        render={({ field }) => (
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger className="w-[140px]">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="CAIXA">Caixa(s)</SelectItem>
                                                    <SelectItem value="UNIDADE">Peça(s) Avulsa(s)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="md:col-span-12 space-y-2 mt-2">
                                <Label>Motivo da Avaria (Neste Item)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        {...register(`items.${index}.reason`)}
                                        placeholder="Ex: Caixa molhada, peça quebrada..."
                                        className="flex-1"
                                    />
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => remove(index)}
                                        disabled={fields.length === 1}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </Card>

                <div className="flex justify-end gap-4">
                    <Link href="/dashboard/estoque/ocorrencias">
                        <Button variant="outline" type="button">Cancelar</Button>
                    </Link>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Salvando...' : 'Criar Ocorrência e Registrar Rascunho'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
