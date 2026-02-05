
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { Package, AlertTriangle, CheckCircle, XCircle, Calendar, Layers } from "lucide-react";

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
            <SheetContent className="w-[400px] sm:w-[540px]">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-xl">{product.name}</SheetTitle>
                    <SheetDescription>
                        SKU: {product.sku || '-'} | Unidade: {product.unit || '-'}
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-120px)] pr-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 bg-gray-50 rounded-lg border">
                            <span className="text-sm text-gray-500 block mb-1">Físico</span>
                            <span className="text-2xl font-bold flex items-center gap-2">
                                <Package className="h-5 w-5 text-gray-400" />
                                {totalStock}
                            </span>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                            <span className="text-sm text-green-700 block mb-1">Disponível</span>
                            <span className="text-2xl font-bold text-green-700 flex items-center gap-2">
                                <CheckCircle className="h-5 w-5" />
                                {availableStock}
                            </span>
                        </div>
                    </div>

                    {/* Reservation Warning */}
                    {totalReserved > 0 && (
                        <div className="p-4 mb-6 bg-orange-50 rounded-lg border border-orange-100 flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                            <div>
                                <h4 className="font-semibold text-orange-800">Estoque Reservado: {totalReserved}</h4>
                                <p className="text-sm text-orange-700 mt-1">
                                    Há itens comprometidos em orçamentos ou pedidos pendentes.Veja os detalhes por lote abaixo.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Product Details */}
                    <div className="space-y-3 mb-6">
                        <h4 className="font-medium text-gray-700">Detalhes do Produto</h4>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            {product.format && (
                                <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-gray-500 block text-xs">Formato</span>
                                    <span className="font-medium">{product.format}</span>
                                </div>
                            )}
                            {product.line && (
                                <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-gray-500 block text-xs">Linha</span>
                                    <span className="font-medium">{product.line}</span>
                                </div>
                            )}
                            {product.usage && (
                                <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-gray-500 block text-xs">Uso</span>
                                    <span className="font-medium">{product.usage}</span>
                                </div>
                            )}
                            {product.boxCoverage && (
                                <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-gray-500 block text-xs">m² por Caixa</span>
                                    <span className="font-medium">{product.boxCoverage} m²</span>
                                </div>
                            )}
                            {product.piecesPerBox && (
                                <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-gray-500 block text-xs">Peças por Caixa</span>
                                    <span className="font-medium">{product.piecesPerBox}</span>
                                </div>
                            )}
                            {product.palletBoxes && (
                                <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-gray-500 block text-xs">Caixas por Palete</span>
                                    <span className="font-medium">{product.palletBoxes}</span>
                                </div>
                            )}
                            {product.boxWeight && (
                                <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-gray-500 block text-xs">Peso da Caixa</span>
                                    <span className="font-medium">{product.boxWeight} kg</span>
                                </div>
                            )}
                            {product.costCents && (
                                <div className="bg-gray-50 p-2 rounded">
                                    <span className="text-gray-500 block text-xs">Custo</span>
                                    <span className="font-medium">R$ {(product.costCents / 100).toFixed(2)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator className="my-6" />

                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        <Layers className="h-5 w-5" /> Detalhes dos Lotes
                    </h3>

                    <div className="space-y-4">
                        {product.lots?.map((lot: any) => {
                            const lotReserved = lot.reservations?.reduce((acc: number, r: any) => acc + r.quantity, 0) || 0;
                            const lotAvailable = lot.quantity - lotReserved;

                            return (
                                <div key={lot.id} className="border rounded-lg p-4 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-lg text-blue-700">{lot.lotNumber}</div>
                                            <div className="text-sm text-gray-500 mt-1 flex gap-2">
                                                {lot.shade && <Badge variant="outline">Ton: {lot.shade}</Badge>}
                                                {lot.caliber && <Badge variant="outline">Cal: {lot.caliber}</Badge>}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-500">Validade</div>
                                            <div className="font-medium flex items-center gap-1 justify-end">
                                                <Calendar className="h-3 w-3" />
                                                {format(new Date(lot.expirationDate), 'dd/MM/yyyy')}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 py-2 bg-gray-50 rounded text-center text-sm">
                                        <div>
                                            <span className="block text-gray-500 text-xs">Total</span>
                                            <span className="font-medium">{lot.quantity}</span>
                                        </div>
                                        <div>
                                            <span className="block text-orange-600 text-xs">Reservado</span>
                                            <span className="font-medium text-orange-600">{lotReserved}</span>
                                        </div>
                                        <div>
                                            <span className="block text-green-600 text-xs">Livre</span>
                                            <span className="font-bold text-green-700">{lotAvailable}</span>
                                        </div>
                                    </div>

                                    {/* Reservations List */}
                                    {lot.reservations && lot.reservations.length > 0 && (
                                        <div className="mt-3 pl-3 border-l-2 border-orange-200">
                                            <p className="text-xs font-semibold text-gray-900 mb-2">Reservas Ativas:</p>
                                            <ul className="space-y-2">
                                                {lot.reservations.map((res: any) => (
                                                    <li key={res.id} className="text-sm flex justify-between items-start bg-white p-2 rounded border border-gray-100 shadow-sm">
                                                        <div>
                                                            <span className="text-gray-900 font-medium">
                                                                {res.quote ? `Orçamento #${res.quote.number}` : res.order ? `Pedido #${res.order.number}` : 'Manua/Outro'}
                                                            </span>
                                                            <span className="block text-xs text-gray-500">
                                                                {res.quote?.customer?.name || res.order?.customer?.name || 'Cliente N/A'}
                                                            </span>
                                                        </div>
                                                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                                                            {res.quantity} un
                                                        </Badge>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {(!product.lots || product.lots.length === 0) && (
                            <p className="text-center text-gray-500 py-4">Nenhum lote registrado.</p>
                        )}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
