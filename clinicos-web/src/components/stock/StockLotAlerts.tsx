'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Palette, Ruler, X, ChevronRight } from 'lucide-react';

interface StockLotWarning {
    id: string;
    productName: string;
    lotNumber: string;
    shade: string;
    caliber: string;
    quantity: number;
    issue: 'multiple_shades' | 'multiple_calibers' | 'low_stock';
    message: string;
}

// Mock warnings - in production these would come from the API
const mockWarnings: StockLotWarning[] = [
    {
        id: '1',
        productName: 'Porcelanato Carrara 60x60',
        lotNumber: 'LOT-2026-001',
        shade: 'A1',
        caliber: '9mm',
        quantity: 150,
        issue: 'multiple_shades',
        message: 'Este produto tem lotes com tonalidades diferentes (A1, B2). Cuidado ao separar pedidos!'
    },
    {
        id: '2',
        productName: 'Porcelanato Madeira Nogueira 20x120',
        lotNumber: 'LOT-2026-005',
        shade: 'C3',
        caliber: '10mm',
        quantity: 25,
        issue: 'low_stock',
        message: 'Estoque abaixo do mínimo (25 caixas). Considere fazer novo pedido de compra.'
    },
];

interface StockLotAlertsProps {
    onClose?: () => void;
    compact?: boolean;
}

export default function StockLotAlerts({ onClose, compact = false }: StockLotAlertsProps) {
    const [warnings, setWarnings] = useState<StockLotWarning[]>(mockWarnings);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    const visibleWarnings = warnings.filter(w => !dismissed.has(w.id));

    const dismissWarning = (id: string) => {
        setDismissed(prev => new Set([...prev, id]));
    };

    const getIcon = (issue: StockLotWarning['issue']) => {
        switch (issue) {
            case 'multiple_shades':
                return <Palette className="h-5 w-5 text-amber-500" />;
            case 'multiple_calibers':
                return <Ruler className="h-5 w-5 text-orange-500" />;
            case 'low_stock':
                return <AlertTriangle className="h-5 w-5 text-red-500" />;
        }
    };

    const getBgColor = (issue: StockLotWarning['issue']) => {
        switch (issue) {
            case 'multiple_shades':
                return 'bg-amber-50 border-amber-200';
            case 'multiple_calibers':
                return 'bg-orange-50 border-orange-200';
            case 'low_stock':
                return 'bg-red-50 border-red-200';
        }
    };

    if (visibleWarnings.length === 0) return null;

    if (compact) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-700">
                    {visibleWarnings.length} alerta{visibleWarnings.length > 1 ? 's' : ''} de estoque
                </span>
                <ChevronRight className="h-4 w-4 text-amber-500" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Alertas de Estoque
                </h3>
                {onClose && (
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            <div className="space-y-2">
                {visibleWarnings.map(warning => (
                    <div
                        key={warning.id}
                        className={`relative p-4 rounded-lg border ${getBgColor(warning.issue)}`}
                    >
                        <button
                            onClick={() => dismissWarning(warning.id)}
                            className="absolute top-2 right-2 p-1 hover:bg-white/50 rounded"
                        >
                            <X className="h-3 w-3" />
                        </button>

                        <div className="flex gap-3">
                            {getIcon(warning.issue)}
                            <div className="flex-1">
                                <p className="font-medium text-gray-900">{warning.productName}</p>
                                <p className="text-sm text-gray-600 mt-1">{warning.message}</p>
                                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                    <span>Lote: {warning.lotNumber}</span>
                                    {warning.shade && <span>Tonalidade: {warning.shade}</span>}
                                    {warning.caliber && <span>Calibre: {warning.caliber}</span>}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
