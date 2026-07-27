'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Package, Search } from 'lucide-react';
import { SalesProductDialog } from './components/SalesProductDialog';

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
    height?: number;
    width?: number;
    depth?: number;
    color?: string;
    boxCoverage?: number;
    piecesPerBox?: number;
    boxWeight?: number;
    palletBoxes?: number;
    palletCoverage?: number;
    palletWeight?: number;
    costCents?: number;
    priceCents?: number;
    supplierCode?: string;
    isAdhoc?: boolean;
}

const ProductCard = ({ product, onClick }: { product: Product, onClick: (p: Product) => void }) => {
    const isM2 = product.unit?.toLowerCase() === 'm2' || product.unit?.toLowerCase() === 'm²';
    const boxCoverage = product.boxCoverage || 1;
    const basePrice = product.priceCents || 0;
    
    const displayPricePerBox = basePrice * boxCoverage;
    
    let displayUnit = 'unidade';
    if (isM2) {
        displayUnit = 'm²';
    } else if (product.unit?.toLowerCase() === 'cx') {
        displayUnit = 'caixa';
    }

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(cents / 100);
    };

    return (
        <Card className="flex flex-col h-full overflow-hidden hover:shadow-xl transition-all duration-300 border-gray-200/60 bg-white group hover:-translate-y-1">
            <div className="p-4 sm:p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-bold text-gray-900 text-base sm:text-lg leading-snug line-clamp-2 group-hover:text-emerald-700 transition-colors">
                        {product.name}
                    </h3>
                    {product.isAdhoc && (
                        <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            Avulso
                        </span>
                    )}
                </div>
                
                {product.sku && (
                    <p className="text-[11px] sm:text-xs text-gray-500 mb-4 font-mono bg-gray-100/50 inline-block px-1.5 py-0.5 rounded w-fit">
                        SKU: <span className="font-semibold text-gray-700">{product.sku}</span>
                    </p>
                )}

                <div className="flex flex-wrap gap-1.5 mb-5">
                    {product.format && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 shadow-sm whitespace-nowrap">
                            {product.format}
                        </span>
                    )}
                    {product.line && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100 shadow-sm whitespace-nowrap">
                            {product.line}
                        </span>
                    )}
                    {product.usage && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-100 shadow-sm whitespace-nowrap">
                            {product.usage}
                        </span>
                    )}
                </div>

                <div className="mt-auto pt-2">
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100/80 p-3 sm:p-4 rounded-xl border border-gray-100">
                        <div className="flex flex-col">
                            <p className="text-[10px] sm:text-[11px] text-gray-500 uppercase tracking-widest font-bold mb-1">
                                Preço / {displayUnit}
                            </p>
                            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-emerald-600 tracking-tight truncate">
                                {formatCurrency(basePrice)}
                            </p>
                        </div>
                        
                        {isM2 && product.boxCoverage && product.boxCoverage > 0 ? (
                            <div className="pt-2 sm:pt-3 mt-2 sm:mt-3 border-t border-gray-200/80">
                                <div className="flex justify-between items-center gap-2">
                                    <span className="text-xs sm:text-sm text-gray-600 font-medium whitespace-nowrap">Cx ({product.boxCoverage} m²)</span>
                                    <span className="font-bold text-gray-900 text-sm sm:text-base truncate">{formatCurrency(displayPricePerBox)}</span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
            
            <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
                <Button 
                    variant="outline"
                    className="w-full bg-white hover:bg-gray-900 hover:text-white border-2 transition-all duration-300 font-semibold h-10 sm:h-11 text-xs sm:text-sm" 
                    onClick={() => onClick(product)}
                >
                    Ver Especificações
                </Button>
            </div>
        </Card>
    );
};

export default function VendasCatalogoPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [unitFilter, setUnitFilter] = useState('ALL');
    const [formatFilter, setFormatFilter] = useState('');
    const [colorFilter, setColorFilter] = useState('');
    const [lineFilter, setLineFilter] = useState('');
    const [usageFilter, setUsageFilter] = useState('');
    const [brandFilter, setBrandFilter] = useState('');

    const [filterOptions, setFilterOptions] = useState({
        formats: [] as string[],
        colors: [] as string[],
        lines: [] as string[],
        usages: [] as string[],
        brands: [] as {id: string, name: string}[]
    });

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const LIMIT = 48; // A good multiple of 2, 3, and 4 for responsive grids

    const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    useEffect(() => {
        // Fetch filter options on mount
        api.get('/stock/products/filters')
            .then(res => setFilterOptions(res.data))
            .catch(err => console.error('Error fetching filter options:', err));
    }, []);

    const fetchProducts = async (
        currentPage: number, search: string, unit: string, format: string, color: string, line: string, usage: string, brandId: string
    ) => {
        try {
            setIsLoading(true);
            setError('');
            const params: Record<string, any> = { 
                page: currentPage, 
                limit: LIMIT 
            };
            if (search) params.search = search;
            if (unit !== 'ALL') params.unit = unit;
            if (format) params.format = format;
            if (color) params.color = color;
            if (line) params.line = line;
            if (usage) params.usage = usage;
            if (brandId) params.brandId = brandId;
            
            const response = await api.get('/stock/products', { params });
            const { data, meta } = response.data;
            setProducts(data ?? response.data);
            if (meta) {
                setTotalPages(meta.totalPages);
                setTotalItems(meta.total);
            }
        } catch (err: any) {
            console.error('Error fetching products:', err);
            setError('Erro ao carregar produtos');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyFilters = () => {
        setPage(1);
        fetchProducts(1, searchTerm, unitFilter, formatFilter, colorFilter, lineFilter, usageFilter, brandFilter);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setUnitFilter('ALL');
        setFormatFilter('');
        setColorFilter('');
        setLineFilter('');
        setUsageFilter('');
        setBrandFilter('');
        setPage(1);
        fetchProducts(1, '', 'ALL', '', '', '', '', '');
    };

    // Auto-fetch ONLY on text search (with debounce)
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setPage(1);
            fetchProducts(1, searchTerm, unitFilter, formatFilter, colorFilter, lineFilter, usageFilter, brandFilter);
        }, 500);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [searchTerm]);

    // Page changes
    useEffect(() => {
        fetchProducts(page, searchTerm, unitFilter, formatFilter, colorFilter, lineFilter, usageFilter, brandFilter);
    }, [page]);

    const handleProductClick = (item: Product) => {
        // Strip out cost data before passing to the details sheet
        const { costCents, ...safeProduct } = item;
        setSelectedProduct(safeProduct as Product);
        setIsDetailsOpen(true);
    };

    return (
        <div className="min-h-full flex flex-col space-y-6 pb-8">
            {/* Header Area */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Catálogo de Vendas</h1>
                        <p className="text-gray-500 mt-1 text-sm font-medium">Explore e busque rapidamente nossos produtos</p>
                    </div>

                    <div className="flex-1 w-full md:max-w-md relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <Input
                            placeholder="Buscar nome, código, EAN..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-12 bg-gray-50/50 border-gray-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-500 text-base rounded-xl transition-all w-full"
                        />
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-3 pt-4 border-t border-gray-100">
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Unidade Comercial</label>
                        <select
                            value={unitFilter}
                            onChange={(e) => setUnitFilter(e.target.value)}
                            className="w-full h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 text-gray-700"
                        >
                            <option value="ALL">Todas as Unidades</option>
                            <option value="M2">M²</option>
                            <option value="CX">Caixa</option>
                            <option value="UN">Unidade</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Formato</label>
                        <select
                            value={formatFilter}
                            onChange={(e) => setFormatFilter(e.target.value)}
                            className="w-full h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 text-gray-700"
                        >
                            <option value="">Todos os Formatos</option>
                            {filterOptions.formats?.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Cor / Acabamento</label>
                        <select
                            value={colorFilter}
                            onChange={(e) => setColorFilter(e.target.value)}
                            className="w-full h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 text-gray-700"
                        >
                            <option value="">Todas as Cores</option>
                            {filterOptions.colors?.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Linha / Coleção</label>
                        <select
                            value={lineFilter}
                            onChange={(e) => setLineFilter(e.target.value)}
                            className="w-full h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 text-gray-700"
                        >
                            <option value="">Todas as Linhas</option>
                            {filterOptions.lines?.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Uso / Aplicação</label>
                        <select
                            value={usageFilter}
                            onChange={(e) => setUsageFilter(e.target.value)}
                            className="w-full h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 text-gray-700"
                        >
                            <option value="">Todas as Aplicações</option>
                            {filterOptions.usages?.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Marca</label>
                        <select
                            value={brandFilter}
                            onChange={(e) => setBrandFilter(e.target.value)}
                            className="w-full h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 text-gray-700"
                        >
                            <option value="">Todas as Marcas</option>
                            {filterOptions.brands?.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-3 border-t border-gray-100 mt-1">
                    <Button
                        onClick={handleClearFilters}
                        variant="ghost"
                        className="w-full sm:w-auto text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    >
                        Limpar Filtros
                    </Button>
                    <Button
                        onClick={handleApplyFilters}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                        Aplicar Filtros
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl bg-red-50 p-4 border border-red-100">
                    <p className="text-red-600 font-medium">{error}</p>
                    <Button onClick={() => fetchProducts(page, searchTerm)} className="mt-3 bg-white text-red-700 hover:bg-red-50 border-red-200" variant="outline" size="sm">
                        Tentar novamente
                    </Button>
                </div>
            )}

            {isLoading && products.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
                    <h3 className="text-lg font-medium text-gray-600">Carregando catálogo...</h3>
                </div>
            ) : products.length === 0 ? (
                <Card className="flex-1 flex flex-col items-center justify-center p-16 text-center border-dashed border-2">
                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                        <Package className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {searchTerm ? 'Nenhum produto encontrado' : 'Catálogo vazio'}
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-sm">
                        {searchTerm ? `Não encontramos nenhum produto correspondente a "${searchTerm}". Tente usar outros termos.` : 'Ainda não existem produtos disponíveis no catálogo de vendas.'}
                    </p>
                    {searchTerm && (
                        <Button variant="outline" onClick={() => setSearchTerm('')}>
                            Limpar busca
                        </Button>
                    )}
                </Card>
            ) : (
                <div className="flex-1 flex flex-col space-y-8">
                    {/* Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <ProductCard 
                                key={product.id} 
                                product={product} 
                                onClick={handleProductClick} 
                            />
                        ))}
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white rounded-xl shadow-sm border border-gray-100 gap-4">
                            <div className="text-sm text-gray-500 font-medium">
                                Mostrando página <span className="font-bold text-gray-900">{page}</span> de <span className="font-bold text-gray-900">{totalPages}</span>
                                <span className="mx-2">•</span>
                                {totalItems} produtos no total
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                    className="font-medium hover:bg-gray-50"
                                >
                                    Anterior
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setPage(page + 1)}
                                    disabled={page >= totalPages}
                                    className="font-medium hover:bg-gray-50"
                                >
                                    Próxima
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Product Details Modal */}
            <SalesProductDialog
                isOpen={isDetailsOpen}
                product={selectedProduct}
                onClose={() => {
                    setIsDetailsOpen(false);
                    setSelectedProduct(null);
                }}
            />
        </div>
    );
}
