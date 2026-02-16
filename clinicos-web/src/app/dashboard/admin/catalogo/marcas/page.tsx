'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tag, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import api from '@/lib/api';
import { toast } from "sonner";
import { BrandDialog } from './components/brand-dialog';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Brand {
    id: string;
    name: string;
    defaultMarkup?: number;
    isActive: boolean;
}

interface Props {
    isEmbedded?: boolean;
}

export default function BrandsPage({ isEmbedded }: Props) {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);

    // Alert state
    const [alertOpen, setAlertOpen] = useState(false);
    const [brandToDelete, setBrandToDelete] = useState<Brand | null>(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/catalogue/brands');
            setBrands(response.data);
        } catch (error) {
            toast.error("Erro ao carregar marcas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async () => {
        if (!brandToDelete) return;

        try {
            await api.delete(`/catalogue/brands/${brandToDelete.id}`);
            toast.success("Marca removida com sucesso");
            fetchData();
        } catch (error) {
            toast.error("Erro ao remover marca");
        } finally {
            setAlertOpen(false);
            setBrandToDelete(null);
        }
    };

    const confirmDelete = (brand: Brand) => {
        setBrandToDelete(brand);
        setAlertOpen(true);
    };

    const handleEdit = (brand: Brand) => {
        setSelectedBrand(brand);
        setDialogOpen(true);
    };

    const handleCreate = () => {
        setSelectedBrand(null);
        setDialogOpen(true);
    };

    const filteredBrands = brands.filter(brand =>
        brand.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {!isEmbedded && (
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Tag className="h-6 w-6" />
                            Marcas de Produtos
                        </h1>
                        <p className="text-gray-500">Gerencie as marcas e seus markups padrão</p>
                    </div>
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Marca
                    </Button>
                </div>
            )}

            {isEmbedded && (
                <div className="flex justify-end mb-4">
                    <Button onClick={handleCreate}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Marca
                    </Button>
                </div>
            )}

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-medium">Marcas Cadastradas</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar marca..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Markup Padrão</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBrands.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            Nenhuma marca encontrada
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBrands.map((brand) => (
                                        <TableRow key={brand.id}>
                                            <TableCell className="font-medium">{brand.name}</TableCell>
                                            <TableCell>
                                                {brand.defaultMarkup ? (
                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                                        {brand.defaultMarkup}%
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={brand.isActive ? 'default' : 'secondary'} className={brand.isActive ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
                                                    {brand.isActive ? 'Ativo' : 'Inativo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(brand)}>
                                                        <Pencil className="h-4 w-4 text-gray-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => confirmDelete(brand)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <BrandDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                brand={selectedBrand}
                onSuccess={fetchData}
            />

            <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação irá desativar a marca. Produtos associados podem ser afetados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
