'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, Package, Edit, Trash2, Search, Upload, Settings2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import CreateStockItemDialog from '@/components/stock/create-stock-item-dialog';
import EditStockItemDialog from '@/components/stock/edit-stock-item-dialog';

// Column definitions
const COLUMN_DEFINITIONS = [
    { key: 'name', label: 'Nome', defaultVisible: true },
    { key: 'supplierCode', label: 'Ref. Fornecedor', defaultVisible: false },
    { key: 'format', label: 'Formato', defaultVisible: true },
    { key: 'line', label: 'Linha', defaultVisible: true },
    { key: 'usage', label: 'Uso', defaultVisible: true },
    { key: 'sku', label: 'SKU', defaultVisible: true },
    { key: 'piecesPerBox', label: 'Pç/Cx', defaultVisible: false },
    { key: 'boxCoverage', label: 'm²/Cx', defaultVisible: true },
    { key: 'boxWeight', label: 'Peso Cx (kg)', defaultVisible: false },
    { key: 'palletBoxes', label: 'Cx/Pal', defaultVisible: true },
    { key: 'palletCoverage', label: 'm²/Pal', defaultVisible: false },
    { key: 'palletWeight', label: 'Peso Pal (kg)', defaultVisible: false },
    { key: 'costCents', label: 'Custo', defaultVisible: false },
    { key: 'priceCents', label: 'Preço', defaultVisible: false },
] as const;

type ColumnKey = typeof COLUMN_DEFINITIONS[number]['key'];

const STORAGE_KEY = 'products-visible-columns';

interface Product {
    id: string;
    name: string;
    description?: string;
    unit?: string;
    sku?: string;
    minStock: number;
    isActive: boolean;
    format?: string;
    usage?: string;
    line?: string;
    boxCoverage?: number;
    piecesPerBox?: number;
    boxWeight?: number;
    palletBoxes?: number;
    palletCoverage?: number;
    palletWeight?: number;
    costCents?: number;
    priceCents?: number;
    supplierCode?: string;
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

    // Selection for bulk actions
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    // Column visibility state
    const [visibleColumns, setVisibleColumns] = useState<Set<ColumnKey>>(() => {
        // Default columns
        return new Set(COLUMN_DEFINITIONS.filter(c => c.defaultVisible).map(c => c.key));
    });

    // Load column visibility from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved) as ColumnKey[];
                setVisibleColumns(new Set(parsed));
            } catch {
                // Use defaults
            }
        }
    }, []);

    // Save column visibility to localStorage
    const toggleColumn = (key: ColumnKey) => {
        setVisibleColumns(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            // Save to localStorage
            localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
            return newSet;
        });
    };

    // Helper to format cell values
    const formatCellValue = (product: Product, key: ColumnKey): string => {
        const value = product[key as keyof Product];
        if (value === null || value === undefined) return '-';
        if (key === 'costCents' || key === 'priceCents') {
            return `R$ ${((value as number) / 100).toFixed(2)}`;
        }
        if (typeof value === 'number') {
            return value.toString();
        }
        return value.toString();
    };

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

    // Selection handlers
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredProducts.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredProducts.map(p => p.id)));
        }
    };

    const confirmBulkDelete = async () => {
        if (selectedIds.size === 0) return;

        try {
            setLoadingAction('bulk');
            await Promise.all(
                Array.from(selectedIds).map(id => api.delete(`/stock/${id}`))
            );
            setProducts(prev => prev.filter(item => !selectedIds.has(item.id)));
            setSelectedIds(new Set());
            setShowBulkDeleteConfirm(false);
            setSuccessMessage(`${selectedIds.size} produto(s) removido(s) com sucesso!`);
        } catch (err: any) {
            console.error('Error bulk deleting products:', err);
            setError('Erro ao remover produtos selecionados');
        } finally {
            setLoadingAction(null);
        }
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
        <div className="h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
                    <p className="text-gray-600 mt-1">Cadastro de produtos do estoque</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/estoque/importacao">
                            <Upload className="mr-2 h-4 w-4" />
                            Importar
                        </Link>
                    </Button>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Novo Produto
                    </Button>
                </div>
            </div>

            {successMessage && (
                <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
                    {successMessage}
                </div>
            )}

            {/* Search and Bulk Actions */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        placeholder="Buscar por nome ou SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                {selectedIds.size > 0 && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        disabled={loadingAction === 'bulk'}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover {selectedIds.size} selecionado(s)
                    </Button>
                )}
                {/* Column Visibility Popover */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Settings2 className="mr-2 h-4 w-4" />
                            Colunas
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56" align="end">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm text-gray-900">Colunas visíveis</h4>
                            <div className="space-y-1">
                                {COLUMN_DEFINITIONS.map((col) => (
                                    <div key={col.key} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`col-${col.key}`}
                                            checked={visibleColumns.has(col.key)}
                                            onCheckedChange={() => toggleColumn(col.key)}
                                        />
                                        <Label htmlFor={`col-${col.key}`} className="text-sm font-normal cursor-pointer">
                                            {col.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
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
                <Card className="flex-1 flex flex-col min-h-0">
                    <div className="overflow-auto flex-1">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b sticky top-0 z-10">
                                <tr>
                                    <th className="px-3 py-3 text-center w-10">
                                        <Checkbox
                                            checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </th>
                                    {COLUMN_DEFINITIONS.filter(col => visibleColumns.has(col.key)).map(col => (
                                        <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            {col.label}
                                        </th>
                                    ))}
                                    <th className="px-3 py-3 text-center w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredProducts.map((product) => (
                                    <tr key={product.id} className={`hover:bg-gray-50 ${selectedIds.has(product.id) ? 'bg-blue-50' : ''}`}>
                                        <td className="px-3 py-3 text-center">
                                            <Checkbox
                                                checked={selectedIds.has(product.id)}
                                                onCheckedChange={() => toggleSelect(product.id)}
                                            />
                                        </td>
                                        {COLUMN_DEFINITIONS.filter(col => visibleColumns.has(col.key)).map(col => (
                                            <td key={col.key} className={`px-4 py-3 whitespace-nowrap text-sm ${col.key === 'name' ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                                                {formatCellValue(product, col.key)}
                                            </td>
                                        ))}
                                        <td className="px-3 py-3 text-center">
                                            <button
                                                onClick={() => handleEdit(product)}
                                                className="text-gray-400 hover:text-gray-600 p-1"
                                                title="Editar"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
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

            {/* Bulk Delete Confirmation Dialog */}
            <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remover Produtos Selecionados</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja remover {selectedIds.size} produto(s)?
                            Esta ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 justify-end pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowBulkDeleteConfirm(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmBulkDelete}
                            disabled={loadingAction === 'bulk'}
                        >
                            {loadingAction === 'bulk' ? 'Removendo...' : 'Sim, Remover Todos'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
