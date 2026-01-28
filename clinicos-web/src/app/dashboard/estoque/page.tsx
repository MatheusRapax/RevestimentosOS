'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Package, Search, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ProductWithStock {
    id: string;
    name: string;
    sku?: string;
    unit?: string;
    minStock: number;
    totalStock: number;
    isActive: boolean;
}

type FilterType = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export default function EstoquePage() {
    const [products, setProducts] = useState<ProductWithStock[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<FilterType>('all');

    const fetchStock = async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await api.get('/stock');
            setProducts(response.data);
        } catch (err: any) {
            console.error('Error fetching stock:', err);
            setError('Erro ao carregar estoque');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStock();
    }, []);

    const getStockStatus = (product: ProductWithStock) => {
        if (product.totalStock === 0) return 'out_of_stock';
        if (product.totalStock <= product.minStock) return 'low_stock';
        return 'in_stock';
    };

    const getStatusBadge = (product: ProductWithStock) => {
        const status = getStockStatus(product);

        if (status === 'out_of_stock') {
            return (
                <span className="px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                    <XCircle className="h-3 w-3" />
                    Sem Estoque
                </span>
            );
        }

        if (status === 'low_stock') {
            return (
                <span className="px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    <AlertTriangle className="h-3 w-3" />
                    Estoque Baixo
                </span>
            );
        }

        return (
            <span className="px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3" />
                OK
            </span>
        );
    };

    // Filter and search
    const filteredProducts = products.filter(product => {
        // Search filter
        const matchesSearch =
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()));

        if (!matchesSearch) return false;

        // Status filter
        const status = getStockStatus(product);
        if (filter === 'all') return true;
        if (filter === 'in_stock') return status === 'in_stock';
        if (filter === 'low_stock') return status === 'low_stock';
        if (filter === 'out_of_stock') return status === 'out_of_stock';

        return true;
    });

    // Summary counts
    const totalProducts = products.length;
    const lowStockCount = products.filter(p => getStockStatus(p) === 'low_stock').length;
    const outOfStockCount = products.filter(p => getStockStatus(p) === 'out_of_stock').length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Carregando estoque...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg bg-red-50 p-4">
                <p className="text-red-600">{error}</p>
                <Button onClick={fetchStock} className="mt-4" variant="outline">
                    Tentar novamente
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Estoque</h1>
                <p className="text-gray-600 mt-1">Visão geral do estoque disponível</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Package className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total de Produtos</p>
                            <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <AlertTriangle className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Estoque Baixo</p>
                            <p className="text-2xl font-bold text-yellow-600">{lowStockCount}</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <XCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Sem Estoque</p>
                            <p className="text-2xl font-bold text-red-600">{outOfStockCount}</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Buscar por nome ou SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <div className="flex gap-2">
                    <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('all')}
                    >
                        Todos
                    </Button>
                    <Button
                        variant={filter === 'low_stock' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('low_stock')}
                        className={filter === 'low_stock' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                    >
                        Estoque Baixo
                    </Button>
                    <Button
                        variant={filter === 'out_of_stock' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('out_of_stock')}
                        className={filter === 'out_of_stock' ? 'bg-red-600 hover:bg-red-700' : ''}
                    >
                        Sem Estoque
                    </Button>
                </div>
            </div>

            {/* Stock Table */}
            {filteredProducts.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="text-gray-400 mb-4">
                        <Package className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm || filter !== 'all' ? 'Nenhum produto encontrado' : 'Nenhum produto no estoque'}
                    </h3>
                    <p className="text-gray-600">
                        {searchTerm || filter !== 'all'
                            ? 'Tente alterar os filtros de busca'
                            : 'Cadastre produtos para começar'}
                    </p>
                </Card>
            ) : (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Produto
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        SKU
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Unidade
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Qtd Atual
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Qtd Mínima
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredProducts.map((product) => (
                                    <tr
                                        key={product.id}
                                        className={`hover:bg-gray-50 ${getStockStatus(product) === 'out_of_stock' ? 'bg-red-50' :
                                                getStockStatus(product) === 'low_stock' ? 'bg-yellow-50' : ''
                                            }`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {product.name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {product.sku || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {product.unit || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                                            <span className={
                                                getStockStatus(product) === 'out_of_stock' ? 'text-red-600' :
                                                    getStockStatus(product) === 'low_stock' ? 'text-yellow-600' : 'text-gray-900'
                                            }>
                                                {product.totalStock}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                            {product.minStock}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {getStatusBadge(product)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
        </div>
    );
}
