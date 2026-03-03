'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePromotions } from '@/hooks/usePromotions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Check, Percent, Search } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';

interface Product {
    id: string;
    name: string;
    sku: string;
    priceCents: number;
    category?: { name: string };
    brand?: { name: string };
}

export default function EditarPromocaoPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { updatePromotion } = usePromotions();

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [products, setProducts] = useState<Product[]>([]);
    const [searchProduct, setSearchProduct] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        discountPercent: 10,
        startDate: '',
        endDate: '',
        isActive: true,
        productIds: [] as string[]
    });

    useEffect(() => {
        async function loadData() {
            try {
                const [productsRes, promoRes] = await Promise.all([
                    api.get('/stock/products?isActive=true'),
                    api.get(`/promotions/${params.id}`)
                ]);

                setProducts(productsRes.data);

                const promo = promoRes.data;
                setFormData({
                    name: promo.name,
                    description: promo.description || '',
                    discountPercent: promo.discountPercent,
                    startDate: new Date(promo.startDate).toISOString().split('T')[0],
                    endDate: new Date(promo.endDate).toISOString().split('T')[0],
                    isActive: promo.isActive,
                    productIds: promo.products?.map((p: any) => p.productId) || []
                });
            } catch (error) {
                toast.error('Erro ao carregar dados da promoção');
                router.push('/dashboard/vendas/promocoes');
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [params.id, router]);

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
        (p.sku && p.sku.toLowerCase().includes(searchProduct.toLowerCase()))
    );

    const handleToggleProduct = (productId: string) => {
        setFormData(prev => {
            const isSelected = prev.productIds.includes(productId);
            if (isSelected) {
                return { ...prev, productIds: prev.productIds.filter(id => id !== productId) };
            } else {
                return { ...prev, productIds: [...prev.productIds, productId] };
            }
        });
    };

    const handleSelectAll = (filteredOnly = true) => {
        if (filteredOnly) {
            const filteredIds = filteredProducts.map(p => p.id);
            setFormData(prev => {
                const newSet = new Set([...prev.productIds, ...filteredIds]);
                return { ...prev, productIds: Array.from(newSet) };
            });
        } else {
            setFormData(prev => ({ ...prev, productIds: products.map(p => p.id) }));
        }
    };

    const handleDeselectAll = () => {
        setFormData(prev => ({ ...prev, productIds: [] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.productIds.length === 0) {
            toast.error('Selecione pelo menos um produto para a campanha');
            return;
        }

        if (new Date(formData.endDate) < new Date(formData.startDate)) {
            toast.error('A data de término deve ser posterior à data de início');
            return;
        }

        try {
            setIsSubmitting(true);
            await updatePromotion({
                id: params.id,
                data: {
                    name: formData.name,
                    description: formData.description,
                    discountPercent: Number(formData.discountPercent),
                    startDate: new Date(formData.startDate).toISOString(),
                    endDate: new Date(formData.endDate).toISOString(),
                    isActive: formData.isActive,
                    productIds: formData.productIds
                }
            });

            toast.success('Campanha atualizada com sucesso!');
            router.push('/dashboard/vendas/promocoes');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Erro ao atualizar campanha');
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return <div className="p-6 max-w-5xl mx-auto space-y-6 flex justify-center py-10">Carregando detalhes...</div>;
    }

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/vendas/promocoes">
                    <Button variant="outline" size="icon">
                        <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Campanha</h1>
                    <p className="text-gray-500 text-sm mt-1">Ajuste os detalhes e produtos participantes selecionados.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Detalhes Principais</CardTitle>
                                <CardDescription>Informações básicas da campanha</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nome da Campanha</Label>
                                    <Input
                                        required
                                        placeholder="Ex: Black Friday, Queima de Estoque..."
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Descrição (Opcional)</Label>
                                    <Textarea
                                        placeholder="Notas internas sobre a campanha"
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Desconto (%)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            required
                                            min="1"
                                            max="100"
                                            step="0.01"
                                            className="pl-8"
                                            value={formData.discountPercent}
                                            onChange={e => setFormData({ ...formData, discountPercent: Number(e.target.value) })}
                                        />
                                        <Percent className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Duração e Status</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Início</Label>
                                        <Input
                                            type="date"
                                            required
                                            value={formData.startDate}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Término</Label>
                                        <Input
                                            type="date"
                                            required
                                            value={formData.endDate}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-2">
                                    <div className="space-y-0.5">
                                        <Label>Ativa imediatamente</Label>
                                        <p className="text-xs text-muted-foreground">Ligar e desligar esta campanha</p>
                                    </div>
                                    <Switch
                                        checked={formData.isActive}
                                        onCheckedChange={checked => setFormData({ ...formData, isActive: checked })}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-2 space-y-6">
                        <Card className="h-full flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="text-lg">Produtos Participantes</CardTitle>
                                        <CardDescription>Selecione os produtos que receberão o desconto</CardDescription>
                                    </div>
                                    <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium dark:bg-blue-900/30 dark:text-blue-400">
                                        {formData.productIds.length} selecionados
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-col flex-1 pb-6 gap-4">
                                <div className="flex justify-between items-center gap-4">
                                    <div className="relative flex-1">
                                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                        <Input
                                            placeholder="Buscar por nome ou SKU..."
                                            className="pl-9"
                                            value={searchProduct}
                                            onChange={e => setSearchProduct(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => handleSelectAll(true)}>
                                            Todos Filtrados
                                        </Button>
                                        <Button type="button" variant="ghost" size="sm" onClick={handleDeselectAll} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950">
                                            Limpar
                                        </Button>
                                    </div>
                                </div>

                                <div className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-y-auto max-h-[400px] flex-1">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-500 bg-gray-50/80 dark:bg-gray-800/80 dark:text-gray-400 uppercase sticky top-0 z-10 backdrop-blur-sm">
                                            <tr>
                                                <th className="px-4 py-3 w-10"></th>
                                                <th className="px-4 py-3">Produto</th>
                                                <th className="px-4 py-3">Categoria/Marca</th>
                                                <th className="px-4 py-3 text-right">Preço Base</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                                            {filteredProducts.map(product => {
                                                const isSelected = formData.productIds.includes(product.id);
                                                return (
                                                    <tr
                                                        key={product.id}
                                                        className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition select-none ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                                        onClick={() => handleToggleProduct(product.id)}
                                                    >
                                                        <td className="px-4 py-3">
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                                                {isSelected && <Check className="w-3.5 h-3.5" />}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                            {product.name}
                                                            {product.sku && <span className="block text-xs font-normal text-gray-400">{product.sku}</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-500">
                                                            {product.category?.name || '-'} / {product.brand?.name || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                                                            {(product.priceCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {filteredProducts.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                                        Nenhum produto encontrado.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                            </CardContent>
                        </Card>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <Link href="/dashboard/vendas/promocoes">
                        <Button type="button" variant="outline" disabled={isSubmitting}>
                            Cancelar
                        </Button>
                    </Link>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                        {isSubmitting ? 'Salvando...' : 'Atualizar Campanha'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
