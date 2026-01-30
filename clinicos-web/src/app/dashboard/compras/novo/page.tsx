'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Plus,
    Trash2,
    Package,
    Building2,
    Calendar,
    DollarSign
} from 'lucide-react';

interface Supplier {
    id: string;
    name: string;
    cnpj?: string;
}

interface Product {
    id: string;
    name: string;
    sku: string;
    priceCents: number;
}

interface PurchaseItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
}

interface SalesOrder {
    id: string;
    number: number;
    customer: { name: string };
    status: string;
}

function formatCurrency(cents: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(cents / 100);
}

export default function NovoPedidoCompraPage() {
    const router = useRouter();
    const [supplierId, setSupplierId] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [unitPrice, setUnitPrice] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState<string>('none');

    // Fetch suppliers
    const { data: suppliers = [] } = useQuery({
        queryKey: ['suppliers', 'active'],
        queryFn: async () => {
            const response = await api.get('/suppliers', { params: { isActive: 'true' } });
            return response.data;
        }
    });

    // Fetch products
    const { data: products = [] } = useQuery({
        queryKey: ['products'],
        queryFn: async () => {
            const response = await api.get('/stock/products');
            return response.data;
        }
    });

    // Fetch active sales orders
    const { data: salesOrders = [] } = useQuery({
        queryKey: ['sales-orders', 'active'],
        queryFn: async () => {
            // Fetch all and filter in frontend for simplicity
            const response = await api.get('/orders');
            return response.data.filter((o: SalesOrder) =>
                !['ENTREGUE', 'CANCELADO'].includes(o.status)
            );
        }
    });

    const handleSupplierChange = (value: string) => {
        setSupplierId(value);
        const supplier = suppliers.find((s: Supplier) => s.id === value);
        if (supplier) {
            setSupplierName(supplier.name);
        }
    };

    const addItem = () => {
        if (!selectedProductId) {
            toast.error('Selecione um produto');
            return;
        }
        if (quantity < 1) {
            toast.error('Quantidade deve ser maior que 0');
            return;
        }

        const product = products.find((p: Product) => p.id === selectedProductId);
        if (!product) return;

        const priceCents = unitPrice ? Math.round(parseFloat(unitPrice.replace(',', '.')) * 100) : product.priceCents;

        const newItem: PurchaseItem = {
            productId: product.id,
            productName: `${product.name} (${product.sku})`,
            quantity,
            unitPriceCents: priceCents,
            totalCents: priceCents * quantity,
        };

        setItems([...items, newItem]);
        setSelectedProductId('');
        setQuantity(1);
        setUnitPrice('');
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const subtotalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
    const shippingCents = 0;
    const totalCents = subtotalCents + shippingCents;

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            if (!supplierName) {
                throw new Error('Selecione ou informe um fornecedor');
            }
            if (items.length === 0) {
                throw new Error('Adicione pelo menos um item');
            }

            await api.post('/purchase-orders', {
                supplierId: supplierId || undefined,
                supplierName,
                salesOrderId: selectedOrderId !== 'none' ? selectedOrderId : undefined,
                expectedDate: expectedDate || undefined,
                notes: notes || undefined,
                subtotalCents,
                shippingCents,
                totalCents,
                items: items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPriceCents: item.unitPriceCents,
                    totalCents: item.totalCents,
                })),
            });
        },
        onSuccess: () => {
            toast.success('Pedido de compra criado com sucesso!');
            router.push('/dashboard/compras');
        },
        onError: (err: any) => {
            toast.error(err.message || 'Erro ao criar pedido de compra');
        }
    });

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Novo Pedido de Compra</h1>
                    <p className="text-gray-500">Crie um novo pedido de compra para fornecedor</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Supplier */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Fornecedor
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Fornecedor Cadastrado</label>
                                <Select value={supplierId} onValueChange={handleSupplierChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um fornecedor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map((supplier: Supplier) => (
                                            <SelectItem key={supplier.id} value={supplier.id}>
                                                {supplier.name} {supplier.cnpj ? `(${supplier.cnpj})` : ''}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Ou Nome Avulso</label>
                                <Input
                                    value={supplierName}
                                    onChange={(e) => {
                                        setSupplierName(e.target.value);
                                        setSupplierId('');
                                    }}
                                    placeholder="Nome do fornecedor"
                                />
                            </div>
                        </div>
                        <div className="mt-4">
                            <label className="block text-sm font-medium mb-1">
                                <Calendar className="inline h-4 w-4 mr-1" />
                                Previsão de Entrega
                            </label>
                            <Input
                                type="date"
                                value={expectedDate}
                                onChange={(e) => setExpectedDate(e.target.value)}
                            />
                        </div>

                        <div className="mt-4 pt-4 border-t">
                            <label className="block text-sm font-medium mb-1">
                                Vincular a Pedido de Venda (Opcional)
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                Use para compras sob encomenda (Back-to-Order).
                            </p>
                            <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um pedido..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum (Estoque Geral)</SelectItem>
                                    {salesOrders.map((order: SalesOrder) => (
                                        <SelectItem key={order.id} value={order.id}>
                                            Pedido #{order.number} - {order.customer.name} ({order.status})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </Card>

                    {/* Items */}
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Itens do Pedido
                        </h3>

                        {/* Add Item Form */}
                        <div className="grid grid-cols-12 gap-2 mb-4 pb-4 border-b">
                            <div className="col-span-5">
                                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o produto" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map((product: Product) => (
                                            <SelectItem key={product.id} value={product.id}>
                                                {product.name} ({product.sku})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2">
                                <Input
                                    type="number"
                                    min={1}
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                    placeholder="Qtd"
                                />
                            </div>
                            <div className="col-span-3">
                                <Input
                                    value={unitPrice}
                                    onChange={(e) => setUnitPrice(e.target.value)}
                                    placeholder="Preço unit. (R$)"
                                />
                            </div>
                            <div className="col-span-2">
                                <Button onClick={addItem} className="w-full">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Items List */}
                        {items.length === 0 ? (
                            <div className="text-center text-gray-500 py-8">
                                Nenhum item adicionado
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {items.map((item, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium">{item.productName}</p>
                                            <p className="text-sm text-gray-500">
                                                {item.quantity} x {formatCurrency(item.unitPriceCents)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-semibold">
                                                {formatCurrency(item.totalCents)}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeItem(index)}
                                            >
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Notes */}
                    <Card className="p-6">
                        <label className="block text-sm font-medium mb-2">Observações</label>
                        <textarea
                            className="w-full border rounded-lg p-3"
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Observações sobre o pedido..."
                        />
                    </Card>
                </div>

                {/* Summary */}
                <div className="space-y-6">
                    <Card className="p-6 sticky top-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <DollarSign className="h-5 w-5" />
                            Resumo
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Itens:</span>
                                <span>{items.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Subtotal:</span>
                                <span>{formatCurrency(subtotalCents)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Frete:</span>
                                <span>{formatCurrency(shippingCents)}</span>
                            </div>
                            <div className="border-t pt-3">
                                <div className="flex justify-between text-lg font-bold">
                                    <span>Total:</span>
                                    <span className="text-green-600">{formatCurrency(totalCents)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            <Button
                                className="w-full"
                                onClick={() => createMutation.mutate()}
                                disabled={createMutation.isPending || items.length === 0}
                            >
                                {createMutation.isPending ? 'Criando...' : 'Criar Pedido de Compra'}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => router.back()}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
