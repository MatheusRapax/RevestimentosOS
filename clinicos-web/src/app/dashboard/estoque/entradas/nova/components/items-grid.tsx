'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StockEntryItem, AddItemData } from '@/hooks/useStockEntries';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Trash2, Plus, Check, ChevronsUpDown, AlertTriangle, Link2, Unlink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NFeItem } from '@/lib/nfe-parser';
import api from '@/lib/api';
import { ItemFiscalForm } from './item-fiscal-form';

interface ItemsGridProps {
    items: StockEntryItem[];
    onAdd: (data: AddItemData) => Promise<void>;
    onRemove: (itemId: string) => Promise<void>;
    isLoading: boolean;
    readOnly?: boolean;
    pendingItems?: NFeItem[];
    onResolvePending?: (index: number) => void;
    onUpdate?: (itemId: string, data: Partial<AddItemData>) => Promise<void>;
    availablePOs?: any[];
}

interface Product {
    id: string;
    name: string;
    unit?: string;
    boxCoverage?: number;
    piecesPerBox?: number;
}

export function ItemsGrid({ items, onAdd, onRemove, isLoading, readOnly, pendingItems, onResolvePending, onUpdate, availablePOs }: ItemsGridProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [open, setOpen] = useState(false);
    const [resolvingIndex, setResolvingIndex] = useState<number | null>(null);
    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [inputUnit, setInputUnit] = useState('CX');
    const [unitCost, setUnitCost] = useState('');
    const [lotNumber, setLotNumber] = useState('');
    const [expirationDate, setExpirationDate] = useState('');
    const [manufacturer, setManufacturer] = useState('');
    const [purchaseOrderItemId, setPurchaseOrderItemId] = useState('');
    const [globalPurchaseOrder, setGlobalPurchaseOrder] = useState<any>(null);

    // Edit state
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [editQuantity, setEditQuantity] = useState('');
    const [editUnitCost, setEditUnitCost] = useState('');
    const [editLotNumber, setEditLotNumber] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Fiscal integration
    const [fiscalData, setFiscalData] = useState<Partial<AddItemData>>({});
    const [showFiscal, setShowFiscal] = useState(false);

    // Pagination state to prevent extreme lag with large XMLs
    const [pendingPage, setPendingPage] = useState(1);
    const [itemsPage, setItemsPage] = useState(1);
    const ITEMS_PER_PAGE = 50;

    useEffect(() => {
        fetchProducts();
    }, []);

    // Auto-match removed from here, moved to render and handleAdd for better reliability
    const fetchProducts = async () => {
        try {
            const res = await api.get('/stock/products?isActive=true');
            if (res.data && Array.isArray(res.data.data)) {
                setProducts(res.data.data);
            } else if (Array.isArray(res.data)) {
                setProducts(res.data);
            } else {
                setProducts([]);
            }
        } catch (err) {
            console.error('Error fetching products', err);
        }
    };

    const handleAdd = async () => {
        if (!productId || !quantity) return;

        let matchedPoItemId = purchaseOrderItemId;
        
        let finalQuantity = parseFloat(quantity);
        let finalUnitCost = unitCost ? parseFloat(unitCost) : undefined;
        const selectedProductObj = products.find(p => p.id === productId);

        // Se informou em M2 mas o produto usa cobertura (CX), calcula o custo por caixa,
        // mas NÃO arredonda a quantidade. O estoque aceitará a fração e o usuário deverá
        // decidir como corrigir (ex: rejeitar nota, alterar cadastro).
        if (inputUnit === 'M2' && selectedProductObj?.boxCoverage) {
            finalQuantity = finalQuantity / selectedProductObj.boxCoverage;
            if (finalUnitCost) {
                finalUnitCost = finalUnitCost * selectedProductObj.boxCoverage;
            }
        }

        // Se tem um PO Global selecionado e não tem linha vinculada, força a busca na hora de adicionar!
        if (globalPurchaseOrder && !matchedPoItemId) {
            const match = globalPurchaseOrder.items.find((pi: any) => 
                pi.productId === productId || 
                (selectedProductObj && pi.productName?.toLowerCase() === selectedProductObj.name.toLowerCase())
            );
            if (match) {
                matchedPoItemId = match.id;
            }
        }

        await onAdd({
            productId,
            quantity: finalQuantity,
            unitCost: finalUnitCost,
            lotNumber: lotNumber || undefined,
            expirationDate: expirationDate || undefined,
            manufacturer: manufacturer || undefined,
            purchaseOrderId: globalPurchaseOrder?.id || availablePOs?.find(po => po.items?.some((pi: any) => pi.id === matchedPoItemId))?.id,
            purchaseOrderItemId: matchedPoItemId || undefined,
            ...fiscalData
        });

        if (resolvingIndex !== null && onResolvePending) {
            onResolvePending(resolvingIndex);
            setResolvingIndex(null);
        }

        // Reset fields
        setProductId('');
        setQuantity('');
        setInputUnit('CX');
        setUnitCost('');
        setLotNumber('');
        setExpirationDate('');
        setManufacturer('');
        setPurchaseOrderItemId('');
        setFiscalData({});
    };

    const handleResolve = (index: number, item: NFeItem) => {
        setResolvingIndex(index);
        setQuantity(item.quantity.toString());
        setUnitCost(item.unitValue.toFixed(4));
        
        const unit = item.unit?.toUpperCase() || '';
        if (['M2', 'M²'].includes(unit)) {
            setInputUnit('M2');
        } else if (['UN', 'PC', 'PÇ', 'PEÇA', 'PÇS', 'UNID'].includes(unit)) {
            setInputUnit('UN');
        } else {
            setInputUnit('CX');
        }

        if (item.lotNumber) setLotNumber(item.lotNumber);
        if (item.expirationDate) setExpirationDate(item.expirationDate);

        // Populate fiscal data from XML
        const newFiscalData: Partial<AddItemData> = {};
        if (item.ncm) newFiscalData.ncm = item.ncm;
        if (item.cest) newFiscalData.cest = item.cest;
        if (item.cfop) newFiscalData.cfop = item.cfop;
        setFiscalData(newFiscalData);

        const match = products.find(p => p.name.toLowerCase() === item.name.toLowerCase() || p.name.toLowerCase().includes(item.name.toLowerCase()));
        if (match) {
            setProductId(match.id);
        }

        // Auto-match PO Item if Global PO is selected
        let autoMatchedPoItemId = '';
        if (globalPurchaseOrder?.items) {
            const poMatch = globalPurchaseOrder.items.find((poItem: any) => 
                poItem.productName?.toLowerCase().includes(item.name.toLowerCase()) || 
                item.name.toLowerCase().includes(poItem.productName?.toLowerCase())
            );
            if (poMatch) {
                autoMatchedPoItemId = poMatch.id;
            }
        }
        setPurchaseOrderItemId(autoMatchedPoItemId);
    };

    const handleEditClick = (item: StockEntryItem) => {
        setEditingItemId(item.id);
        setEditQuantity(String(item.quantity));
        setEditUnitCost(item.unitCost ? String(item.unitCost) : '');
        setEditLotNumber(item.lotNumber || '');
    };

    const handleCancelEdit = () => {
        setEditingItemId(null);
    };

    const handleSaveEdit = async () => {
        if (!editingItemId || !onUpdate) return;
        try {
            setIsUpdating(true);
            await onUpdate(editingItemId, {
                quantity: parseFloat(editQuantity),
                unitCost: editUnitCost ? parseFloat(editUnitCost) : undefined,
                lotNumber: editLotNumber || undefined
            });
            setEditingItemId(null);
        } finally {
            setIsUpdating(false);
        }
    };

    const selectedProduct = products.find(p => p.id === productId);

    // Pagination logic
    const paginatedPending = pendingItems?.slice((pendingPage - 1) * ITEMS_PER_PAGE, pendingPage * ITEMS_PER_PAGE);
    const totalPendingPages = pendingItems ? Math.ceil(pendingItems.length / ITEMS_PER_PAGE) : 0;

    const paginatedItems = items?.slice((itemsPage - 1) * ITEMS_PER_PAGE, itemsPage * ITEMS_PER_PAGE);
    const totalItemsPages = items ? Math.ceil(items.length / ITEMS_PER_PAGE) : 0;

    return (
        <div className="space-y-4 border p-4 rounded-md">

            <ItemFiscalForm
                open={showFiscal}
                onClose={() => setShowFiscal(false)}
                onSave={(data) => setFiscalData(data)}
                productName={selectedProduct?.name}
            />

            {pendingItems && pendingItems.length > 0 && (
                <div className="mb-6 border-b pb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-orange-600 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Itens Pendentes (Importado do XML) - {pendingItems.length} itens
                        </h3>
                        {totalPendingPages > 1 && (
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPendingPage(p => Math.max(1, p - 1))} disabled={pendingPage === 1}>Anterior</Button>
                                <span className="text-xs text-muted-foreground">Pág {pendingPage} de {totalPendingPages}</span>
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPendingPage(p => Math.min(totalPendingPages, p + 1))} disabled={pendingPage === totalPendingPages}>Próxima</Button>
                            </div>
                        )}
                    </div>
                    <div className="rounded-md border bg-orange-50/50">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Produto (XML)</TableHead>
                                    <TableHead>Qtd</TableHead>
                                    <TableHead>Valor Unit.</TableHead>
                                    <TableHead>Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedPending?.map((item, localIdx) => {
                                    const realIdx = (pendingPage - 1) * ITEMS_PER_PAGE + localIdx;
                                    return (
                                        <TableRow key={realIdx} className={resolvingIndex === realIdx ? "bg-blue-50" : ""}>
                                        <TableCell className="text-xs">{item.code}</TableCell>
                                        <TableCell className="text-xs font-medium">{item.name}</TableCell>
                                        <TableCell className="text-xs">{item.quantity} {item.unit}</TableCell>
                                        <TableCell className="text-xs">R$ {item.unitValue}</TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                variant={resolvingIndex === realIdx ? "default" : "outline"}
                                                className="h-7 text-xs"
                                                onClick={() => handleResolve(realIdx, item)}
                                            >
                                                {resolvingIndex === realIdx ? "Preenchendo..." : "Usar"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <h2 className="text-lg font-semibold flex items-center gap-2">
                Itens da Entrada
            </h2>
            
            {availablePOs && availablePOs.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-md mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-blue-900">
                                {globalPurchaseOrder ? `Nota vinculada ao Pedido #${globalPurchaseOrder.number}` : `Pedidos de Compra Encontrados (${availablePOs.length})`}
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                                {globalPurchaseOrder 
                                    ? `Itens do XML serão pré-selecionados para as linhas do Pedido #${globalPurchaseOrder.number} automaticamente.`
                                    : 'Vincule a Nota a um pedido para facilitar e automatizar a conciliação dos itens.'}
                            </p>
                        </div>
                    </div>
                    
                    {!globalPurchaseOrder ? (
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                                    <Link2 className="h-4 w-4 mr-2" />
                                    Vincular a Pedido
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Vincular a Pedido de Compra</DialogTitle>
                                    <DialogDescription>
                                        Selecione qual pedido esta Nota Fiscal irá abater. O sistema tentará 
                                        pré-selecionar os itens correspondentes.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto pr-2">
                                    {availablePOs.map((po) => (
                                        <div 
                                            key={po.id} 
                                            className="border rounded-md p-3 hover:bg-muted cursor-pointer transition-colors"
                                            onClick={() => setGlobalPurchaseOrder(po)}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-semibold text-sm">Pedido #{po.number}</span>
                                                <span className="text-xs font-medium text-muted-foreground">{po.status}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {po.items?.length || 0} itens • Total: R$ {(po.totalCents / 100).toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </DialogContent>
                        </Dialog>
                    ) : (
                        <Button variant="outline" size="sm" onClick={() => setGlobalPurchaseOrder(null)} className="shrink-0 text-red-600 border-red-200 hover:bg-red-50">
                            <Unlink className="h-4 w-4 mr-2" />
                            Remover Vínculo
                        </Button>
                    )}
                </div>
            )}

            {!readOnly && (
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end bg-muted/50 p-2 rounded-md">
                    <div className="md:col-span-2 space-y-1 relative">
                        <label className="text-xs font-medium">Produto</label>
                        
                        {/* Indicador de Auto-Match do PO */}
                        {globalPurchaseOrder && productId && (
                            <span className={cn(
                                "absolute -top-1 right-1 text-[10px] px-1.5 py-0.5 rounded-sm font-medium border",
                                globalPurchaseOrder.items.find((pi: any) => pi.productId === productId || pi.productName?.toLowerCase() === products.find(p => p.id === productId)?.name?.toLowerCase())
                                ? "bg-green-100 text-green-700 border-green-300"
                                : "bg-orange-100 text-orange-700 border-orange-300"
                            )}>
                                {globalPurchaseOrder.items.find((pi: any) => pi.productId === productId || pi.productName?.toLowerCase() === products.find(p => p.id === productId)?.name?.toLowerCase())
                                ? "✅ No Pedido" : "⚠️ Produto Extra"}
                            </span>
                        )}
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    aria-expanded={open}
                                    className="w-full justify-between font-normal"
                                >
                                    {productId
                                        ? products.find((p) => p.id === productId)?.name
                                        : "Selecione o produto..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Buscar produto..." />
                                    <CommandList>
                                        <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                        <CommandGroup>
                                            {products.map((product) => (
                                                <CommandItem
                                                    key={product.id}
                                                    value={product.name}
                                                    onSelect={() => {
                                                        setProductId(product.id);
                                                        setOpen(false);
                                                    }}
                                                    className="cursor-pointer data-[disabled]:pointer-events-auto data-[disabled]:opacity-100"
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            productId === product.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                    {product.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1 relative">
                        <label className="text-xs font-medium">Qtd {selectedProduct?.unit ? `(Base: ${selectedProduct.unit})` : ''}</label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                min="0.01"
                                value={quantity}
                                onChange={e => setQuantity(e.target.value)}
                                className="w-2/3"
                            />
                            <Select value={inputUnit} onValueChange={setInputUnit}>
                                <SelectTrigger className="w-1/3 text-xs px-2 h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CX">CX</SelectItem>
                                    <SelectItem value="M2">M²</SelectItem>
                                    <SelectItem value="UN">UN</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {inputUnit === 'M2' && selectedProduct?.boxCoverage && quantity && (
                            <div className="pt-1">
                                <p className="text-[10px] text-muted-foreground leading-tight">
                                    = {(parseFloat(quantity) / selectedProduct.boxCoverage).toFixed(2)} Caixas
                                </p>
                                {(parseFloat(quantity) / selectedProduct.boxCoverage) % 1 !== 0 && (
                                    <p className="text-[10px] text-red-600 font-medium leading-tight mt-0.5">
                                        ⚠️ Fração de caixa detectada. Verifique os valores do XML ou atualize o M²/Caixa no cadastro.
                                    </p>
                                )}
                            </div>
                        )}
                        {inputUnit === 'CX' && selectedProduct?.boxCoverage && quantity && (
                            <p className="text-[10px] text-muted-foreground pt-1 leading-tight">
                                = {(parseFloat(quantity) * selectedProduct.boxCoverage).toFixed(2)} m²
                            </p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium">
                            {selectedProduct?.boxCoverage && selectedProduct.boxCoverage > 0
                                ? 'Custo Unit. (R$/m²)'
                                : 'Custo Unit. (R$)'}
                        </label>
                        <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={unitCost}
                            onChange={e => setUnitCost(e.target.value)}
                        />
                        {selectedProduct?.boxCoverage && selectedProduct.boxCoverage > 0 && unitCost && (
                            <p className="text-[10px] text-amber-600 font-medium pt-1">
                                Custo da Cx: R$ {(parseFloat(unitCost) * selectedProduct.boxCoverage).toFixed(2)}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-medium">Lote</label>
                        <Input
                            value={lotNumber}
                            onChange={e => setLotNumber(e.target.value)}
                            placeholder="Ex: NF-123456"
                        />
                    </div>

                    <div className="space-y-1 flex items-end">
                        <Button
                            variant={Object.keys(fiscalData).length > 0 ? "default" : "outline"}
                            size="icon"
                            className="w-10 mr-2"
                            onClick={() => setShowFiscal(true)}
                            title="Dados Fiscais"
                        >
                            <span className="text-xs font-bold">F</span>
                        </Button>

                        <Button
                            className="flex-1"
                            onClick={handleAdd}
                            disabled={isLoading || !productId || !quantity}
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            )}

            {!readOnly && availablePOs && availablePOs.length > 0 && !globalPurchaseOrder && (
                <div className="bg-muted/30 p-2 rounded-md mt-2 flex items-center gap-2 border border-dashed border-gray-300">
                    <label className="text-xs font-medium whitespace-nowrap text-muted-foreground w-auto mr-2">
                        Vincular Pedido (Linha):
                    </label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        value={purchaseOrderItemId}
                        onChange={e => setPurchaseOrderItemId(e.target.value)}
                    >
                        <option value="">-- Não vincular (Entrada Avulsa) --</option>
                        {availablePOs.map(po => po.items?.map((pi: any) => (
                            <option key={pi.id} value={pi.id}>
                                Pedido #{po.number || po.id.slice(-6)} - {pi.productName || pi.productCode || 'N/A'} (Ped: {pi.quantityOrdered} | Faltam: {pi.quantityOrdered - pi.quantityReceived})
                            </option>
                        )))}
                    </select>
                </div>
            )}

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Produto</TableHead>
                            <TableHead>Lote</TableHead>
                            <TableHead>Quantidade</TableHead>
                            <TableHead>Custo Unit.</TableHead>
                            <TableHead>Total</TableHead>
                            {!readOnly && <TableHead className="w-[50px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                                    Nenhum item adicionado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems?.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.product.name}</TableCell>
                                    <TableCell className="text-sm">
                                        {editingItemId === item.id ? (
                                            <Input
                                                value={editLotNumber}
                                                onChange={e => setEditLotNumber(e.target.value)}
                                                className="h-8 w-24 text-xs"
                                                placeholder="Lote"
                                            />
                                        ) : (
                                            item.lotNumber || '-'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            {editingItemId === item.id ? (
                                                <Input
                                                    type="number"
                                                    value={editQuantity}
                                                    onChange={e => setEditQuantity(e.target.value)}
                                                    className="h-8 w-20 text-xs"
                                                />
                                            ) : (
                                                <span>
                                                    {item.quantity} {item.product.unit}
                                                </span>
                                            )}
                                            {item.product.boxCoverage && (
                                                <span className="text-[10px] text-muted-foreground">
                                                    {((editingItemId === item.id ? parseFloat(editQuantity || '0') : item.quantity) * item.product.boxCoverage).toFixed(2)} m²
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {editingItemId === item.id ? (
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={editUnitCost}
                                                onChange={e => setEditUnitCost(e.target.value)}
                                                className="h-8 w-24 text-xs"
                                                placeholder="0,00"
                                            />
                                        ) : (
                                            item.unitCost ?
                                                new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.unitCost)
                                                : '-'
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {item.totalCost && editingItemId !== item.id ?
                                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalCost)
                                            : editingItemId === item.id ? '-' : '-'}
                                    </TableCell>
                                    {!readOnly && (
                                        <TableCell>
                                            {editingItemId === item.id ? (
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={handleSaveEdit}
                                                        disabled={isUpdating || !editQuantity}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground"
                                                        onClick={handleCancelEdit}
                                                        disabled={isUpdating}
                                                    >
                                                        <Trash2 className="h-4 w-4" /> {/* Or an X icon, but let's just use what's available or leave it missing if we want to add an X later */}
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-xs underline"
                                                        onClick={() => handleEditClick(item)}
                                                        disabled={isLoading || isUpdating || editingItemId !== null}
                                                    >
                                                        Editar
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500"
                                                        onClick={() => onRemove(item.id)}
                                                        disabled={isLoading || isUpdating || editingItemId !== null}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            
            {totalItemsPages > 1 && (
                <div className="flex items-center justify-end gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={() => setItemsPage(p => Math.max(1, p - 1))} disabled={itemsPage === 1}>Anterior</Button>
                    <span className="text-xs text-muted-foreground">Página {itemsPage} de {totalItemsPages} ({items?.length} itens)</span>
                    <Button variant="outline" size="sm" onClick={() => setItemsPage(p => Math.min(totalItemsPages, p + 1))} disabled={itemsPage === totalItemsPages}>Próxima</Button>
                </div>
            )}
        </div>
    );
}
