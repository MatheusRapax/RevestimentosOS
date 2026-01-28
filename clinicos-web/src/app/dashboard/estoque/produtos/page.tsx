'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Package, Edit, Trash2, Search } from 'lucide-react';
import CreateStockItemDialog from '@/components/stock/create-stock-item-dialog';
import EditStockItemDialog from '@/components/stock/edit-stock-item-dialog';

interface Product {
    id: string;
    name: string;
    description?: string;
    unit?: string;
    sku?: string;
    minStock: number;
    isActive: boolean;
}

export default function ProdutosPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Create dialog
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // Edit dialog
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Product | null>(null);

    // Delete confirmation
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Loading state for actions
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const fetchProducts = async () => {
        try {
            setIsLoading(true);
            setError('');
            const response = await api.get('/stock');
            setProducts(response.data);
        } catch (err: any) {
            console.error('Error fetching products:', err);
            setError('Erro ao carregar produtos');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // Auto-dismiss success message
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const handleEdit = (item: Product) => {
        setEditingItem(item);
        setIsEditDialogOpen(true);
    };

    const handleDeleteClick = (itemId: string) => {
        setDeletingId(itemId);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!deletingId) return;

        try {
            setLoadingAction(deletingId);
            await api.delete(`/stock/${deletingId}`);
            setProducts(prev => prev.filter(item => item.id !== deletingId));
            setShowDeleteConfirm(false);
            setDeletingId(null);
            setSuccessMessage('Produto removido com sucesso!');
        } catch (err: any) {
            console.error('Error deleting product:', err);
            setError(err.response?.data?.message || 'Erro ao remover produto');
        } finally {
            setLoadingAction(null);
        }
    };

    const truncateText = (text: string | undefined, maxLength = 40) => {
        if (!text) return '-';
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    // Filter products by search
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg text-gray-600">Carregando produtos...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg bg-red-50 p-4">
                <p className="text-red-600">{error}</p>
                <Button onClick={fetchProducts} className="mt-4" variant="outline">
                    Tentar novamente
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
                    <p className="text-gray-600 mt-1">Cadastro de produtos do estoque</p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Produto
                </Button>
            </div>

            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
                    {successMessage}
                </div>
            )}

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                    placeholder="Buscar por nome ou SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            {filteredProducts.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="text-gray-400 mb-4">
                        <Package className="h-16 w-16 mx-auto" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                        {searchTerm ? 'Tente outro termo de busca' : 'Comece cadastrando um novo produto'}
                    </p>
                    {!searchTerm && (
                        <Button onClick={() => setIsCreateDialogOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" />
                            Novo Produto
                        </Button>
                    )}
                </Card>
            ) : (
                <Card>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nome
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Descrição
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Unidade
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        SKU
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Qtd Mínima
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ações
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {product.name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                            {truncateText(product.description)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {product.unit || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {product.sku || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {product.minStock}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEdit(product)}
                                                    disabled={loadingAction === product.id}
                                                >
                                                    <Edit className="h-3 w-3 mr-1" />
                                                    Editar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDeleteClick(product.id)}
                                                    disabled={loadingAction === product.id}
                                                >
                                                    <Trash2 className="h-3 w-3 mr-1" />
                                                    Remover
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Create Dialog */}
            <CreateStockItemDialog
                open={isCreateDialogOpen}
                onClose={() => setIsCreateDialogOpen(false)}
                onSuccess={() => {
                    setIsCreateDialogOpen(false);
                    fetchProducts();
                    setSuccessMessage('Produto criado com sucesso!');
                }}
            />

            {/* Edit Dialog */}
            <EditStockItemDialog
                open={isEditDialogOpen}
                item={editingItem}
                onClose={() => {
                    setIsEditDialogOpen(false);
                    setEditingItem(null);
                }}
                onSuccess={() => {
                    setIsEditDialogOpen(false);
                    setEditingItem(null);
                    fetchProducts();
                    setSuccessMessage('Produto atualizado com sucesso!');
                }}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remover Produto</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja remover este produto?
                            O produto será desativado e não aparecerá mais na listagem.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 justify-end pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeletingId(null);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmDelete}
                            disabled={loadingAction === deletingId}
                        >
                            {loadingAction === deletingId ? 'Removendo...' : 'Sim, Remover'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
