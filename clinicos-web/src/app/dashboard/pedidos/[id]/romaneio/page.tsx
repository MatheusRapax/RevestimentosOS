'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Package, User, Calendar, MapPin, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';

// Types (simplified for view)
interface Order {
    number: number;
    customer: { name: string; phone?: string; address?: string };
    deliveryDate?: string;
    items: {
        id: string;
        product: { name: string; sku?: string; unit?: string; piecesPerBox?: number };
        quantityBoxes: number;
        lotId?: string;
        lot?: { lotNumber: string; shade?: string; caliber?: string }; // If lot included relation exists
        notes?: string;
    }[];
}

export default function RomaneioPage() {
    const params = useParams();
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                // Need to ensure backend mock/real implementation returns items.product and lot info
                const res = await api.get(`/orders/${params.id}`);
                setOrder(res.data);
            } catch (error) {
                console.error('Error fetching order:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [params.id]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-center">Carregando romaneio...</div>;
    if (!order) return <div className="p-8 text-center text-red-500">Pedido não encontrado</div>;

    return (
        <div className="min-h-screen bg-white text-black p-4 md:p-8 max-w-4xl mx-auto print:p-0">
            {/* No-Print Header */}
            <div className="flex justify-between items-center mb-8 print:hidden">
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                </Button>
                <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700">
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir Romaneio
                </Button>
            </div>

            {/* Printable Content */}
            <div className="border-2 border-black p-6 space-y-6 print:border-0 print:p-0">
                {/* Header */}
                <div className="flex justify-between items-start border-b-2 border-black pb-4">
                    <div>
                        <h1 className="text-3xl font-bold uppercase tracking-wider">Romaneio de Separação</h1>
                        <p className="text-sm font-mono mt-1">DOC #: {order.items[0]?.id.split('-')[0].toUpperCase()}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-4xl font-black">#{order.number}</div>
                        <p className="text-sm text-gray-600">
                            Data: {new Date().toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                </div>

                {/* Customer Info Box */}
                <div className="grid grid-cols-2 gap-4 border border-gray-300 p-4 rounded-lg bg-gray-50 print:bg-transparent print:border-black">
                    <div>
                        <h3 className="text-xs font-bold uppercase text-gray-500 mb-1 flex items-center gap-1">
                            <User className="h-3 w-3" /> Cliente
                        </h3>
                        <p className="font-bold text-lg">{order.customer.name}</p>
                        <p className="text-sm">{order.customer.phone || 'Sem telefone'}</p>
                    </div>
                    <div>
                        <h3 className="text-xs font-bold uppercase text-gray-500 mb-1 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Previsão Entrega
                        </h3>
                        <p className="font-bold text-lg">
                            {order.deliveryDate
                                ? new Date(order.deliveryDate).toLocaleDateString('pt-BR')
                                : 'Imediata / A combinar'}
                        </p>
                    </div>
                </div>

                {/* Items Table */}
                <div>
                    <h3 className="text-lg font-bold uppercase mb-2 border-l-4 border-black pl-2">Itens para Separação</h3>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-black">
                                <th className="py-2 w-12 text-center">OK</th>
                                <th className="py-2 w-20">Qtd</th>
                                <th className="py-2">Produto / SKU</th>
                                <th className="py-2 w-32">Lote / Tom</th>
                                <th className="py-2 w-24">Loc.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-300">
                            {order.items.map((item, idx) => (
                                <tr key={idx} className="group">
                                    <td className="py-4 text-center border-r border-gray-200">
                                        <div className="w-6 h-6 border-2 border-gray-400 rounded mx-auto print:border-black"></div>
                                    </td>
                                    <td className="py-4 font-bold text-xl text-center">
                                        {item.quantityBoxes} <span className="text-xs font-normal text-gray-500 block">{item.product.unit || 'CX'}</span>
                                    </td>
                                    <td className="py-4">
                                        <p className="font-bold">{item.product.name}</p>
                                        <p className="text-sm text-gray-500 font-mono">{item.product.sku}</p>
                                        {item.notes && <p className="text-xs text-red-600 mt-1 italic">Obs: {item.notes}</p>}
                                    </td>
                                    <td className="py-4 bg-gray-50 print:bg-transparent">
                                        {/* Since lot isn't always populated in GET /orders/:id, we might need to fetch it or rely on description */}
                                        {/* Ideally, backend should populate item.lot */}
                                        <div className="border border-black px-2 py-1 inline-block bg-white text-center min-w-[80px]">
                                            <span className="block text-xs text-gray-500">LOTE</span>
                                            <span className="font-mono font-bold">
                                                {/* Fallback if lotId exists but lot object missing */}
                                                {(item as any).lot?.lotNumber || (item.lotId ? 'Verif. ID' : 'Qualquer')}
                                            </span>
                                        </div>
                                        {(item as any).lot?.shade && (
                                            <p className="text-xs mt-1">Ton: {(item as any).lot.shade}</p>
                                        )}
                                    </td>
                                    <td className="py-4 text-gray-400 italic text-sm">
                                        ___-___
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer / Signatures */}
                <div className="mt-12 pt-8 border-t-2 border-black flex justify-between gap-8 text-sm">
                    <div className="flex-1 text-center">
                        <div className="border-t border-black w-3/4 mx-auto mb-2"></div>
                        <p>Separado por</p>
                    </div>
                    <div className="flex-1 text-center">
                        <div className="border-t border-black w-3/4 mx-auto mb-2"></div>
                        <p>Conferido por</p>
                    </div>
                    <div className="flex-1 text-center">
                        <div className="border-t border-black w-3/4 mx-auto mb-2"></div>
                        <p>Data / Hora</p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 1cm; }
                    body { background: white; }
                }
            `}</style>
        </div>
    );
}
