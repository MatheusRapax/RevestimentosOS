import React from 'react';
import { CreateQuoteTemplateData, QuoteTemplate } from '@/hooks/useQuoteTemplates';

interface QuoteItem {
    id: string;
    product: {
        name: string;
        sku: string;
        format?: string;
        line?: string;
    };
    quantityBoxes: number;
    unitPriceCents: number;
    totalCents: number;
    resultingArea?: number;
    inputArea?: number;
}

interface Quote {
    number: number;
    createdAt: string;
    customer: {
        name: string;
        phone?: string;
        email?: string;
        document?: string; // CPF/CNPJ
    };
    items: QuoteItem[];
    subtotalCents: number;
    discountCents: number;
    deliveryFee: number;
    totalCents: number;
    seller: {
        name: string;
    };
}

interface QuoteTemplateViewerProps {
    template: QuoteTemplate | CreateQuoteTemplateData;
    quote?: Quote | null;
}

export function QuoteTemplateViewer({ template, quote }: QuoteTemplateViewerProps) {
    // Helper to format currency
    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(cents / 100);
    };

    // Helper to format date
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('pt-BR');
    };

    // Sample data if no quote provided
    const sampleQuote: Quote = {
        number: 1,
        createdAt: new Date().toISOString(),
        customer: {
            name: 'João da Silva',
            document: '123.456.789-00',
            phone: '(11) 99999-9999',
            email: 'joao@email.com',
        },
        items: [
            {
                id: '1',
                product: { name: 'Porcelanato Bianco 60x60', sku: 'P6060' },
                quantityBoxes: 5,
                unitPriceCents: 8990,
                totalCents: 44950,
                resultingArea: 10.5,
            },
            {
                id: '2',
                product: { name: 'Rejunte Cinza Platina 1kg', sku: 'R1KG' },
                quantityBoxes: 2,
                unitPriceCents: 2500,
                totalCents: 5000,
            },
        ],
        subtotalCents: 49950,
        discountCents: 0,
        deliveryFee: 0,
        totalCents: 49950,
        seller: { name: 'Vendedor Exemplo' }
    };

    const data = (quote as Quote) || sampleQuote;

    return (
        <div className="bg-white p-8" style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', minHeight: '297mm', width: '210mm', margin: '0 auto', boxSizing: 'border-box' }}>
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-4 mb-4">
                <div>
                    <h1
                        className="text-xl font-bold mb-1"
                        style={{ color: template.primaryColor || '#000000' }}
                    >
                        {template.companyName || 'Nome da Empresa'}
                    </h1>
                    <p className="text-gray-600 text-xs">
                        {template.companyAddress || 'Endereço da empresa'}
                    </p>
                    <p className="text-gray-600 text-xs">
                        {template.companyPhone && `Tel: ${template.companyPhone}`}
                        {template.companyPhone && template.companyEmail && ' | '}
                        {template.companyEmail}
                    </p>
                    {template.companyCnpj && (
                        <p className="text-gray-600 text-xs">CNPJ: {template.companyCnpj}</p>
                    )}
                </div>
                <div className="text-right">
                    <h2
                        className="text-2xl font-bold"
                        style={{ color: template.primaryColor || '#000000' }}
                    >
                        ORÇAMENTO
                    </h2>
                    <p className="text-gray-600">Nº #{data.number}</p>
                    <p className="text-gray-600 text-xs">Data: {formatDate(data.createdAt)}</p>
                </div>
            </div>

            {/* Cliente */}
            <div className="border rounded p-3 mb-4 bg-gray-50">
                <p className="font-semibold mb-1" style={{ color: template.primaryColor || '#000000' }}>
                    Dados do Cliente
                </p>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <p><strong>Nome:</strong> {data.customer.name}</p>
                        {data.customer.document && <p><strong>CPF/CNPJ:</strong> {data.customer.document}</p>}
                    </div>
                    <div>
                        {data.customer.phone && <p><strong>Telefone:</strong> {data.customer.phone}</p>}
                        {data.customer.email && <p><strong>Email:</strong> {data.customer.email}</p>}
                    </div>
                </div>
            </div>

            {/* Tabela de Itens */}
            <table className="w-full mb-4 text-xs border-collapse">
                <thead>
                    <tr style={{ backgroundColor: template.accentColor || '#4CAF50', color: 'white' }}>
                        <th className="p-2 text-left">Produto</th>
                        <th className="p-2 text-center">Qtd</th>
                        <th className="p-2 text-center">Área (m²)</th>
                        <th className="p-2 text-right">Unit.</th>
                        <th className="p-2 text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.items.map((item) => (
                        <tr key={item.id} className="border-b">
                            <td className="p-2">
                                <span className="font-semibold">{item.product.name}</span>
                                <br />
                                <span className="text-[10px] text-gray-500">{item.product.sku}</span>
                            </td>
                            <td className="p-2 text-center">{item.quantityBoxes}</td>
                            <td className="p-2 text-center">{item.resultingArea?.toFixed(2) || item.inputArea?.toFixed(2) || '-'}</td>
                            <td className="p-2 text-right">{formatCurrency(item.unitPriceCents)}</td>
                            <td className="p-2 text-right">{formatCurrency(item.totalCents)}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-semibold border-t">
                        <td colSpan={4} className="p-2 text-right">Subtotal:</td>
                        <td className="p-2 text-right">{formatCurrency(data.subtotalCents)}</td>
                    </tr>
                    {data.discountCents > 0 && (
                        <tr className="text-red-600">
                            <td colSpan={4} className="p-2 text-right">Desconto:</td>
                            <td className="p-2 text-right">-{formatCurrency(data.discountCents)}</td>
                        </tr>
                    )}
                    {data.deliveryFee > 0 && (
                        <tr>
                            <td colSpan={4} className="p-2 text-right">Frete:</td>
                            <td className="p-2 text-right">{formatCurrency(data.deliveryFee)}</td>
                        </tr>
                    )}
                    <tr className="font-bold text-lg border-t" style={{ color: template.primaryColor || '#000000' }}>
                        <td colSpan={4} className="p-2 text-right">TOTAL:</td>
                        <td className="p-2 text-right">{formatCurrency(data.totalCents)}</td>
                    </tr>
                </tfoot>
            </table>

            <div className="flex gap-4">
                {/* Dados Bancários */}
                {template.showBankDetails && template.bankName && (
                    <div className="flex-1 border rounded p-3 mb-4 bg-gray-50 break-inside-avoid">
                        <p className="font-semibold mb-1" style={{ color: template.primaryColor || '#000000' }}>
                            Dados Bancários
                        </p>
                        <div className="text-xs space-y-1">
                            <p><strong>Banco:</strong> {template.bankName}</p>
                            {template.bankAgency && <p><strong>Agência:</strong> {template.bankAgency}</p>}
                            {template.bankAccount && <p><strong>Conta:</strong> {template.bankAccount}</p>}
                            {template.bankAccountHolder && <p><strong>Titular:</strong> {template.bankAccountHolder}</p>}
                            {template.pixKey && <p className="mt-2 pt-1 border-t border-gray-200"><strong>PIX:</strong> {template.pixKey}</p>}
                        </div>
                    </div>
                )}

                {/* Termos (lado a lado se couber, ou em coluna) */}
                {template.showTerms && template.termsAndConditions && (
                    <div className="flex-[2] mb-4">
                        <p className="font-semibold mb-1 text-xs" style={{ color: template.primaryColor || '#000000' }}>
                            Termos e Condições
                        </p>
                        <p className="text-xs text-gray-600 whitespace-pre-line border rounded p-2 bg-gray-50 h-full">
                            {template.termsAndConditions}
                        </p>
                    </div>
                )}
            </div>

            {/* Validade */}
            <p className="text-center text-xs text-gray-600 mb-8 mt-4 border-t pt-4">
                {template.validityText || `Este orçamento é válido por ${template.validityDays || 10} dias.`}
            </p>

            {/* Assinaturas */}
            {template.showSignatureLines && (
                <div className="flex justify-around pt-8 mt-8 break-inside-avoid">
                    <div className="text-center">
                        <div className="border-t border-black w-48 mb-1 mx-auto"></div>
                        <p className="text-xs font-semibold">{data.seller.name}</p>
                        <p className="text-[10px] text-gray-500">Vendedor</p>
                    </div>
                    <div className="text-center">
                        <div className="border-t border-black w-48 mb-1 mx-auto"></div>
                        <p className="text-xs font-semibold">{data.customer.name}</p>
                        <p className="text-[10px] text-gray-500">Cliente</p>
                    </div>
                </div>
            )}

            {/* Footer */}
            {template.footerText && (
                <p className="text-center text-[10px] text-gray-400 mt-12 pt-4 border-t">
                    {template.footerText}
                </p>
            )}
        </div>
    );
}
