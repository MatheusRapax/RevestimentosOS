import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Package, Ruler, Hash, Layers, Droplets, Palette, Box, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Product {
    id: string;
    name: string;
    description?: string;
    unit?: string;
    sku?: string;
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
    priceCents?: number;
    supplierCode?: string;
    isAdhoc?: boolean;
    lots?: any[];
}

interface SalesProductDialogProps {
    isOpen: boolean;
    product: Product | null;
    onClose: () => void;
}

const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(cents / 100);
};

const SpecItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | number | undefined }) => {
    const isMissing = value === undefined || value === null || value === '';
    const displayValue = isMissing ? 'Não informado' : value;
    
    return (
        <div className={`flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 ${isMissing ? 'opacity-70' : ''}`}>
            <div className="bg-white p-2 rounded-md shadow-sm border border-gray-100">
                <Icon className={`h-4 w-4 ${isMissing ? 'text-gray-400' : 'text-emerald-600'}`} />
            </div>
            <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">{label}</p>
                <p className={`text-sm font-semibold ${isMissing ? 'text-gray-400 italic' : 'text-gray-900'}`}>{displayValue}</p>
            </div>
        </div>
    );
};

export function SalesProductDialog({ isOpen, product, onClose }: SalesProductDialogProps) {
    if (!product) return null;

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

    const totalStock = product.lots?.reduce((acc: number, l: any) => acc + l.quantity, 0) || 0;
    const totalReserved = product.lots?.reduce((acc: number, l: any) => acc + (l.reservations?.reduce((a: number, r: any) => a + r.quantity, 0) || 0), 0) || 0;
    const availableStock = totalStock - totalReserved;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] sm:max-w-[700px] md:max-w-[850px] lg:max-w-[1050px] w-full p-0 overflow-hidden bg-white rounded-2xl border-0 shadow-2xl">
                {/* Visually hidden titles for screen readers to fix accessibility warnings */}
                <div className="sr-only">
                    <DialogTitle>Detalhes do Produto {product.name}</DialogTitle>
                    <DialogDescription>Especificações técnicas e preços do produto {product.name}</DialogDescription>
                </div>
                <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                    
                    {/* Left Column - Visual/Price Focus */}
                    <div className="md:w-[45%] lg:w-[42%] bg-gray-900 p-6 md:p-8 flex flex-col relative overflow-hidden shrink-0">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-emerald-500 opacity-10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-48 h-48 bg-blue-500 opacity-10 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="relative z-10 mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-white/80 text-[10px] sm:text-xs font-medium backdrop-blur-sm border border-white/10 mb-4">
                                <Hash className="h-3 w-3" /> SKU: {product.sku || 'N/A'}
                            </div>
                            
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-white leading-tight mb-4 break-words line-clamp-4">
                                {product.name}
                            </h2>

                            <div className="flex flex-wrap gap-2">
                                {Boolean(product.format) && (
                                    <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-white text-[11px] sm:text-xs font-medium whitespace-nowrap">
                                        {product.format}
                                    </span>
                                )}
                                {Boolean(product.line) && (
                                    <span className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-white text-[11px] sm:text-xs font-medium whitespace-nowrap">
                                        {product.line}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="relative z-10">
                            <div className="bg-gradient-to-br from-emerald-900/40 to-black/40 backdrop-blur-xl rounded-2xl border border-emerald-500/20 shadow-2xl relative overflow-hidden">
                                {/* Subtle top shine */}
                                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent"></div>
                                
                                <div className="p-5 sm:p-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <p className="text-emerald-400/80 text-[10px] sm:text-xs uppercase tracking-widest font-bold">
                                            Valor de Venda
                                        </p>
                                        <div className="bg-emerald-500/20 px-3 py-1 rounded-md text-emerald-200 text-xs sm:text-sm font-bold uppercase tracking-wider border border-emerald-400/30 shadow-sm">
                                            Por {displayUnit}
                                        </div>
                                    </div>
                                    
                                    <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter drop-shadow-md">
                                        {formatCurrency(basePrice)}
                                    </p>
                                </div>

                                {isM2 && Boolean(product.boxCoverage) && product.boxCoverage! > 0 ? (
                                    <div className="bg-black/20 border-t border-emerald-500/10 p-4 sm:px-6 flex justify-between items-center backdrop-blur-md">
                                        <div className="flex items-center gap-2">
                                            <Box className="h-4 w-4 text-emerald-500/70" />
                                            <span className="text-emerald-100/70 font-medium text-xs">Caixa fechada ({product.boxCoverage} m²)</span>
                                        </div>
                                        <span className="font-bold text-emerald-50 text-sm">{formatCurrency(displayPricePerBox)}</span>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Specs Focus */}
                    <div className="md:w-[55%] lg:w-[58%] p-6 sm:p-8 overflow-y-auto bg-white">
                        <div className="mb-6">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Especificações Técnicas</h3>
                            <p className="text-xs sm:text-sm text-gray-500">Detalhes operacionais, medidas e estoque.</p>
                        </div>

                        {product.description && (
                            <div className="mb-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-sm text-gray-700 leading-relaxed">{product.description}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                            <SpecItem icon={Box} label="Unidade Comercial" value={product.unit?.toUpperCase()} />
                            <SpecItem icon={Palette} label="Cor / Acabamento" value={product.color} />
                            <SpecItem icon={Activity} label="Uso / Aplicação" value={product.usage} />
                            <SpecItem icon={Layers} label="Linha / Coleção" value={product.line} />
                            <SpecItem icon={Package} label="Formato" value={product.format} />
                            <SpecItem icon={Hash} label="Ref. Fornecedor" value={product.supplierCode} />
                        </div>

                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Ruler className="h-4 w-4 text-gray-400" /> Dimensões Físicas
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                    <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100 text-center">
                                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Altura</p>
                                        <p className={`font-semibold text-xs sm:text-sm ${product.height ? 'text-gray-900' : 'text-gray-400'}`}>{product.height ? `${product.height} cm` : '--'}</p>
                                    </div>
                                    <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100 text-center">
                                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Largura</p>
                                        <p className={`font-semibold text-xs sm:text-sm ${product.width ? 'text-gray-900' : 'text-gray-400'}`}>{product.width ? `${product.width} cm` : '--'}</p>
                                    </div>
                                    <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100 text-center">
                                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Profund.</p>
                                        <p className={`font-semibold text-xs sm:text-sm ${product.depth ? 'text-gray-900' : 'text-gray-400'}`}>{product.depth ? `${product.depth} cm` : '--'}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Box className="h-4 w-4 text-gray-400" /> Dados da Caixa
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                    <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100 text-center">
                                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Cobertura</p>
                                        <p className={`font-semibold text-xs sm:text-sm ${product.boxCoverage ? 'text-gray-900' : 'text-gray-400'}`}>{product.boxCoverage ? `${product.boxCoverage} m²` : '--'}</p>
                                    </div>
                                    <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100 text-center">
                                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Peças</p>
                                        <p className={`font-semibold text-xs sm:text-sm ${product.piecesPerBox ? 'text-gray-900' : 'text-gray-400'}`}>{product.piecesPerBox ? `${product.piecesPerBox} un` : '--'}</p>
                                    </div>
                                    <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100 text-center">
                                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Peso</p>
                                        <p className={`font-semibold text-xs sm:text-sm ${product.boxWeight ? 'text-gray-900' : 'text-gray-400'}`}>{product.boxWeight ? `${product.boxWeight} kg` : '--'}</p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Layers className="h-4 w-4 text-gray-400" /> Dados do Palete
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                    <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100 text-center">
                                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Caixas</p>
                                        <p className={`font-semibold text-xs sm:text-sm ${product.palletBoxes ? 'text-gray-900' : 'text-gray-400'}`}>{product.palletBoxes ? `${product.palletBoxes} cx` : '--'}</p>
                                    </div>
                                    <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100 text-center">
                                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Cobertura</p>
                                        <p className={`font-semibold text-xs sm:text-sm ${product.palletCoverage ? 'text-gray-900' : 'text-gray-400'}`}>{product.palletCoverage ? `${product.palletCoverage} m²` : '--'}</p>
                                    </div>
                                    <div className="bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100 text-center">
                                        <p className="text-[10px] sm:text-xs text-gray-500 mb-0.5 sm:mb-1">Peso</p>
                                        <p className={`font-semibold text-xs sm:text-sm ${product.palletWeight ? 'text-gray-900' : 'text-gray-400'}`}>{product.palletWeight ? `${product.palletWeight} kg` : '--'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Stock and Lots Information */}
                            <div className="pt-5 border-t border-gray-100">
                                <h4 className="text-lg font-bold text-gray-900 mb-3">Disponibilidade de Estoque</h4>
                                
                                {/* KPI Cards */}
                                <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                                    <div className="bg-gray-50 p-2 sm:p-3 rounded-xl border border-gray-200 text-center">
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Físico</p>
                                        <p className="text-lg sm:text-xl font-black text-gray-900">{totalStock}</p>
                                    </div>
                                    <div className="bg-orange-50 p-2 sm:p-3 rounded-xl border border-orange-100 text-center">
                                        <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-0.5">Reservado</p>
                                        <p className="text-lg sm:text-xl font-black text-orange-700">{totalReserved}</p>
                                    </div>
                                    <div className="bg-emerald-50 p-2 sm:p-3 rounded-xl border border-emerald-100 text-center">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-0.5">Disponível</p>
                                        <p className="text-lg sm:text-xl font-black text-emerald-700">{availableStock}</p>
                                    </div>
                                </div>

                                {/* Lots List */}
                                {(!product.lots || product.lots.length === 0) ? (
                                    <div className="text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                        <p className="text-[11px] sm:text-xs text-gray-500 font-medium">Nenhum lote registrado</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {product.lots.map((lot: any) => {
                                            const lotReserved = lot.reservations?.reduce((acc: number, r: any) => acc + r.quantity, 0) || 0;
                                            const lotAvailable = lot.quantity - lotReserved;

                                            return (
                                                <div key={lot.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <div className="bg-gray-50 px-3 py-1.5 border-b flex justify-between items-center">
                                                        <div className="flex flex-wrap items-center gap-1.5">
                                                            <span className="font-mono font-bold text-xs text-gray-900">Lote: {lot.lotNumber}</span>
                                                            {lot.shade && <span className="px-1.5 py-0.5 rounded text-[10px] bg-white border font-medium">Ton: {lot.shade}</span>}
                                                            {lot.caliber && <span className="px-1.5 py-0.5 rounded text-[10px] bg-white border font-medium">Cal: {lot.caliber}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="p-2 bg-white grid grid-cols-3 gap-1 text-center divide-x">
                                                        <div>
                                                            <p className="text-[9px] uppercase text-gray-500 font-semibold">Total</p>
                                                            <p className="font-bold text-xs">{lot.quantity}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] uppercase text-orange-600 font-semibold">Reservado</p>
                                                            <p className="font-bold text-xs text-orange-700">{lotReserved}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[9px] uppercase text-emerald-600 font-semibold">Livre</p>
                                                            <p className="font-bold text-xs text-emerald-700">{lotAvailable}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto px-6 sm:px-8 bg-gray-100 hover:bg-gray-200 border-none font-semibold text-sm">
                                Fechar Detalhes
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
