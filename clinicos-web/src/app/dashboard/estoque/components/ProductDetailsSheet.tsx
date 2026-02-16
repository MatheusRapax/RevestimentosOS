
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Package, AlertTriangle, CheckCircle, XCircle, Calendar, Layers, Box, Truck, BarChart3, Info } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductDetailsSheetProps {
    product: any;
    isOpen: boolean;
    onClose: () => void;
}

export function ProductDetailsSheet({ product, isOpen, onClose }: ProductDetailsSheetProps) {
    if (!product) return null;

    const totalStock = product.totalStock || 0;
    const totalReserved = product.totalReserved || 0;
    const availableStock = product.availableStock ?? totalStock;

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[500px] sm:w-[640px] flex flex-col h-full shadow-2xl border-l-[3px] border-l-gray-100 p-0">
                <SheetHeader className="px-6 py-4 border-b">
                    <div className="flex justify-between items-start">
                        <div>
                            <SheetTitle className="text-2xl font-bold text-gray-900">{product.name}</SheetTitle>
                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                                <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-medium">SKU: {product.sku || '-'}</span>
                                {product.unit && <span>| Unidade: {product.unit}</span>}
                            </div>
                        </div>
                    </div>
                    {/* Tags / Badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                        {product.format && <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100">{product.format}</Badge>}
                        {product.line && <Badge variant="outline" className="border-gray-300 text-gray-700">{product.line}</Badge>}
                        {product.usage && <Badge variant="outline" className="border-gray-300 text-gray-700">{product.usage}</Badge>}
                    </div>
                </SheetHeader>

                <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
                    <div className="px-6 pt-4">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                            <TabsTrigger value="lots">Lotes e Estoque</TabsTrigger>
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 h-full">
                        <div className="px-6 pb-24 pt-4">
                            <TabsContent value="overview" className="space-y-6 mt-0">
                                {/* Stock KPI Cards */}
                                <div className="grid grid-cols-3 gap-3">
                                    <Card className="bg-gray-50 border-gray-200 shadow-sm">
                                        <div className="p-3">
                                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Físico</p>
                                            <div className="flex items-center gap-2">
                                                <Package className="h-5 w-5 text-gray-400" />
                                                <span className="text-2xl font-bold text-gray-900">{totalStock}</span>
                                            </div>
                                        </div>
                                    </Card>
                                    <Card className="bg-orange-50 border-orange-100 shadow-sm">
                                        <div className="p-3">
                                            <p className="text-xs font-medium text-orange-600 uppercase tracking-wider mb-1">Reservado</p>
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="h-5 w-5 text-orange-500" />
                                                <span className="text-2xl font-bold text-orange-700">{totalReserved}</span>
                                            </div>
                                        </div>
                                    </Card>
                                    <Card className="bg-green-50 border-green-100 shadow-sm">
                                        <div className="p-3">
                                            <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">Disponível</p>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <span className="text-2xl font-bold text-green-700">{availableStock}</span>
                                            </div>
                                        </div>
                                    </Card>
                                </div>

                                {totalReserved > 0 && (
                                    <div className="p-3 bg-orange-50 rounded-md border border-orange-100 text-sm text-orange-800 flex items-start gap-2">
                                        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                        <p>Há <strong>{totalReserved}</strong> itens reservados em orçamentos ou pedidos pendentes. Verifique a aba <strong>Lotes e Estoque</strong> para detalhes.</p>
                                    </div>
                                )}

                                <Separator />

                                {/* Details Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Dimensional Specs */}
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                                            <Layers className="h-4 w-4 text-gray-500" />
                                            Especificações
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <DetailItem label="Formato" value={product.format} />
                                            <DetailItem label="Linha" value={product.line} />
                                            <DetailItem label="Uso" value={product.usage} />
                                            <DetailItem label="Superfície" value={product.surface || '-'} />
                                        </div>
                                    </div>

                                    {/* Logistics Specs */}
                                    <div className="space-y-3">
                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                                            <Truck className="h-4 w-4 text-gray-500" />
                                            Logística
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            <DetailItem label="m² por Caixa" value={product.boxCoverage ? `${product.boxCoverage} m²` : null} />
                                            <DetailItem label="Peças/Caixa" value={product.piecesPerBox} />
                                            <DetailItem label="Peso/Caixa" value={product.boxWeight ? `${product.boxWeight} kg` : null} />
                                            <DetailItem label="Caixas/Palete" value={product.palletBoxes} />
                                        </div>
                                    </div>
                                </div>

                                {/* Financial Specs */}
                                <div className="space-y-3 pt-2">
                                    <h4 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                                        <BarChart3 className="h-4 w-4 text-gray-500" />
                                        Financeiro
                                    </h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
                                            <span className="text-xs text-gray-500 block mb-0.5">Custo</span>
                                            <span className="font-semibold text-gray-900">
                                                {product.costCents ? `R$ ${(product.costCents / 100).toFixed(2)}` : '-'}
                                            </span>
                                        </div>
                                        <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
                                            <span className="text-xs text-gray-500 block mb-0.5">Preço Venda</span>
                                            <span className="font-semibold text-gray-900">
                                                {product.priceCents ? `R$ ${(product.priceCents / 100).toFixed(2)}` : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>

                            <TabsContent value="lots" className="space-y-4 mt-0">
                                {(!product.lots || product.lots.length === 0) ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                        <Box className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-medium">Nenhum lote registrado</p>
                                        <p className="text-sm text-gray-400 mt-1">Este produto não possui saldo em estoque por lote.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {product.lots.map((lot: any) => {
                                            const lotReserved = lot.reservations?.reduce((acc: number, r: any) => acc + r.quantity, 0) || 0;
                                            const lotAvailable = lot.quantity - lotReserved;

                                            return (
                                                <Card key={lot.id} className="overflow-hidden border-gray-200">
                                                    <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-bold text-lg text-blue-700">{lot.lotNumber}</span>
                                                                {lot.shade && <Badge variant="secondary" className="text-xs bg-white border border-gray-200">Ton: {lot.shade}</Badge>}
                                                                {lot.caliber && <Badge variant="secondary" className="text-xs bg-white border border-gray-200">Cal: {lot.caliber}</Badge>}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-xs text-gray-500 block">Validade</span>
                                                            <span className="text-sm font-medium flex items-center justify-end gap-1">
                                                                <Calendar className="h-3 w-3 text-gray-400" />
                                                                {format(new Date(lot.expirationDate), 'dd/MM/yyyy')}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 space-y-4">
                                                        {/* Lot Stats Grid */}
                                                        <div className="grid grid-cols-3 gap-4">
                                                            <div className="text-center p-2 rounded bg-gray-50">
                                                                <span className="block text-gray-500 text-xs uppercase font-medium">Total</span>
                                                                <span className="block text-lg font-bold text-gray-900">{lot.quantity}</span>
                                                            </div>
                                                            <div className="text-center p-2 rounded bg-orange-50">
                                                                <span className="block text-orange-600 text-xs uppercase font-medium">Reservado</span>
                                                                <span className="block text-lg font-bold text-orange-700">{lotReserved}</span>
                                                            </div>
                                                            <div className="text-center p-2 rounded bg-green-50">
                                                                <span className="block text-green-600 text-xs uppercase font-medium">Disponível</span>
                                                                <span className="block text-lg font-bold text-green-700">{lotAvailable}</span>
                                                            </div>
                                                        </div>

                                                        {/* Reservations List */}
                                                        {lot.reservations && lot.reservations.length > 0 && (
                                                            <div className="mt-2">
                                                                <h5 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Reservas Ativas</h5>
                                                                <div className="space-y-2">
                                                                    {lot.reservations.map((res: any) => (
                                                                        <div key={res.id} className="flex justify-between items-center text-sm p-2 rounded border border-gray-100 bg-white hover:bg-gray-50 transition-colors">
                                                                            <div className="flex flex-col">
                                                                                <span className="font-medium text-gray-900 flex items-center gap-1.5">
                                                                                    {res.quote ? (
                                                                                        <span className="text-blue-600">Orçamento #{res.quote.number}</span>
                                                                                    ) : res.order ? (
                                                                                        <span className="text-green-600">Pedido #{res.order.number}</span>
                                                                                    ) : 'Outra Reserva'}
                                                                                </span>
                                                                                <span className="text-xs text-gray-500">
                                                                                    {res.quote?.customer?.name || res.order?.customer?.name || 'Cliente N/A'}
                                                                                </span>
                                                                            </div>
                                                                            <Badge variant="secondary" className="bg-orange-100 text-orange-800 font-mono">
                                                                                {res.quantity} un
                                                                            </Badge>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </TabsContent>
                        </div>
                    </ScrollArea>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}


function DetailItem({ label, value }: { label: string, value: string | number | null | undefined }) {
    if (!value) return null;
    return (
        <div className="bg-gray-50 p-2.5 rounded border border-gray-100 h-full">
            <span className="text-xs text-gray-500 block mb-0.5">{label}</span>
            <span className="font-medium text-gray-900 text-sm block whitespace-normal break-words leading-tight" title={String(value)}>{value}</span>
        </div>
    );
}
