'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Upload,
    FileSpreadsheet,
    Download,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ArrowLeft,
    Loader2,
    Package
} from 'lucide-react';

interface ImportResult {
    success: boolean;
    imported: number;
    updated: number;
    errors: Array<{ row: number; error: string; data?: any }>;
}

interface PreviewRow {
    name: string;
    sku: string;
    saleType: string;
    priceCents: number;
    costCents: number;
    boxCoverage?: number;
    piecesPerBox?: number;
    boxWeight?: number;
    minStock?: number;
    isValid: boolean;
    errors?: string[];
}

// Sample CSV template
const csvTemplate = `nome,sku,tipo_venda,preco,custo,m2_por_caixa,pecas_por_caixa,peso_caixa,estoque_minimo
"Porcelanato Carrara 60x60",PRC-CARRARA-60,AREA,159.00,89.00,1.44,4,28.5,20
"Piso Laminado Carvalho",LAM-CARV-8MM,AREA,89.00,45.00,2.36,8,12.0,30
"Rejunte Epóxi Branco 1kg",REJ-EPOX-BCO,UNIT,79.00,45.00,,,,50
"Argamassa AC-III 20kg",ARG-AC3-20,UNIT,59.00,35.00,,,,100`;

export default function ImportProductsPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<PreviewRow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
            parseCSV(selectedFile);
        } else {
            alert('Por favor, selecione um arquivo CSV válido.');
        }
    };

    const parseCSV = async (file: File) => {
        setIsLoading(true);
        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

            const rows: PreviewRow[] = [];

            for (let i = 1; i < lines.length; i++) {
                const values = parseCSVLine(lines[i]);
                const row = mapRowToProduct(headers, values, i + 1);
                rows.push(row);
            }

            setPreview(rows);
            setStep('preview');
        } catch (error) {
            console.error('Error parsing CSV:', error);
            alert('Erro ao processar o arquivo CSV');
        } finally {
            setIsLoading(false);
        }
    };

    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    };

    const mapRowToProduct = (headers: string[], values: string[], rowNumber: number): PreviewRow => {
        const errors: string[] = [];
        const getIndex = (key: string) => headers.findIndex(h =>
            h.toLowerCase() === key.toLowerCase() ||
            h.toLowerCase().replace(/_/g, '') === key.toLowerCase().replace(/_/g, '')
        );

        const getName = () => values[getIndex('nome')] || '';
        const getSku = () => values[getIndex('sku')] || '';
        const getSaleType = () => {
            const val = values[getIndex('tipo_venda')] || values[getIndex('tipovenda')] || 'UNIT';
            return ['UNIT', 'AREA', 'BOTH'].includes(val.toUpperCase()) ? val.toUpperCase() : 'UNIT';
        };
        const getPrice = () => parseFloat(values[getIndex('preco')] || '0') * 100;
        const getCost = () => parseFloat(values[getIndex('custo')] || '0') * 100;
        const getBoxCoverage = () => {
            const val = values[getIndex('m2_por_caixa')] || values[getIndex('m2porcaixa')];
            return val ? parseFloat(val) : undefined;
        };
        const getPiecesPerBox = () => {
            const val = values[getIndex('pecas_por_caixa')] || values[getIndex('pecasporcaixa')];
            return val ? parseInt(val) : undefined;
        };
        const getBoxWeight = () => {
            const val = values[getIndex('peso_caixa')] || values[getIndex('pesocaixa')];
            return val ? parseFloat(val) : undefined;
        };
        const getMinStock = () => {
            const val = values[getIndex('estoque_minimo')] || values[getIndex('estoqueminimo')];
            return val ? parseInt(val) : undefined;
        };

        const name = getName();
        const sku = getSku();
        const priceCents = getPrice();

        if (!name) errors.push('Nome é obrigatório');
        if (!sku) errors.push('SKU é obrigatório');
        if (priceCents <= 0) errors.push('Preço deve ser maior que zero');

        const saleType = getSaleType();
        if (saleType === 'AREA' && !getBoxCoverage()) {
            errors.push('Produtos vendidos por área precisam de m²/caixa');
        }

        return {
            name,
            sku,
            saleType,
            priceCents,
            costCents: getCost(),
            boxCoverage: getBoxCoverage(),
            piecesPerBox: getPiecesPerBox(),
            boxWeight: getBoxWeight(),
            minStock: getMinStock(),
            isValid: errors.length === 0,
            errors: errors.length > 0 ? errors : undefined,
        };
    };

    const handleImport = async () => {
        setIsLoading(true);
        try {
            // Simulate import - in production this would call the API
            await new Promise(resolve => setTimeout(resolve, 2000));

            const validRows = preview.filter(r => r.isValid);
            const invalidRows = preview.filter(r => !r.isValid);

            setImportResult({
                success: true,
                imported: validRows.length,
                updated: 0,
                errors: invalidRows.map((row, idx) => ({
                    row: idx + 2,
                    error: row.errors?.join(', ') || 'Erro desconhecido',
                    data: row,
                })),
            });
            setStep('result');
        } catch (error) {
            console.error('Import error:', error);
            setImportResult({
                success: false,
                imported: 0,
                updated: 0,
                errors: [{ row: 0, error: 'Erro ao processar importação' }],
            });
            setStep('result');
        } finally {
            setIsLoading(false);
        }
    };

    const downloadTemplate = () => {
        const blob = new Blob([csvTemplate], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'template_produtos.csv';
        link.click();
    };

    const formatCurrency = (cents: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(cents / 100);
    };

    const validCount = preview.filter(r => r.isValid).length;
    const invalidCount = preview.filter(r => !r.isValid).length;

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Importar Produtos</h1>
                    <p className="text-gray-500">Importe produtos em massa via arquivo CSV</p>
                </div>
            </div>

            {/* Step: Upload */}
            {step === 'upload' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <div className="text-center space-y-6">
                        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                            <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Upload do arquivo CSV</h2>
                            <p className="text-gray-500 mt-1">
                                Selecione um arquivo CSV com os produtos para importar
                            </p>
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                        >
                            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">
                                Clique para selecionar ou arraste o arquivo aqui
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                                Apenas arquivos CSV
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>

                        <div className="pt-4 border-t">
                            <button
                                onClick={downloadTemplate}
                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                            >
                                <Download className="h-4 w-4" />
                                Baixar template de exemplo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Step: Preview */}
            {step === 'preview' && (
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border p-4">
                            <div className="flex items-center gap-3">
                                <Package className="h-8 w-8 text-gray-400" />
                                <div>
                                    <p className="text-2xl font-bold">{preview.length}</p>
                                    <p className="text-sm text-gray-500">Total de linhas</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                            <div className="flex items-center gap-3">
                                <CheckCircle className="h-8 w-8 text-green-500" />
                                <div>
                                    <p className="text-2xl font-bold text-green-700">{validCount}</p>
                                    <p className="text-sm text-green-600">Válidos</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                            <div className="flex items-center gap-3">
                                <XCircle className="h-8 w-8 text-red-500" />
                                <div>
                                    <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
                                    <p className="text-sm text-red-600">Com erros</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Preview Table */}
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="p-4 border-b bg-gray-50">
                            <h3 className="font-medium">Prévia dos Produtos</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-left">Nome</th>
                                        <th className="px-4 py-3 text-left">SKU</th>
                                        <th className="px-4 py-3 text-left">Tipo</th>
                                        <th className="px-4 py-3 text-right">Preço</th>
                                        <th className="px-4 py-3 text-right">m²/cx</th>
                                        <th className="px-4 py-3 text-left">Erros</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {preview.map((row, idx) => (
                                        <tr key={idx} className={row.isValid ? '' : 'bg-red-50'}>
                                            <td className="px-4 py-3">
                                                {row.isValid ? (
                                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                                ) : (
                                                    <XCircle className="h-5 w-5 text-red-500" />
                                                )}
                                            </td>
                                            <td className="px-4 py-3 font-medium">{row.name}</td>
                                            <td className="px-4 py-3 font-mono text-gray-600">{row.sku}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs ${row.saleType === 'AREA'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {row.saleType === 'AREA' ? 'm²' : 'UN'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(row.priceCents)}</td>
                                            <td className="px-4 py-3 text-right">{row.boxCoverage || '-'}</td>
                                            <td className="px-4 py-3 text-red-600 text-sm">
                                                {row.errors?.join(', ')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between">
                        <button
                            onClick={() => {
                                setStep('upload');
                                setFile(null);
                                setPreview([]);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Escolher outro arquivo
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={validCount === 0 || isLoading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Importar {validCount} produtos
                        </button>
                    </div>
                </div>
            )}

            {/* Step: Result */}
            {step === 'result' && importResult && (
                <div className="bg-white rounded-xl shadow-sm border p-8 text-center space-y-6">
                    {importResult.success ? (
                        <>
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Importação Concluída!</h2>
                                <p className="text-gray-500 mt-1">
                                    {importResult.imported} produtos importados com sucesso
                                </p>
                            </div>
                            {importResult.errors.length > 0 && (
                                <div className="text-left bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-yellow-700 mb-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        <span className="font-medium">{importResult.errors.length} linhas com erros foram ignoradas</span>
                                    </div>
                                    <ul className="text-sm text-yellow-600 space-y-1">
                                        {importResult.errors.slice(0, 5).map((err, idx) => (
                                            <li key={idx}>Linha {err.row}: {err.error}</li>
                                        ))}
                                        {importResult.errors.length > 5 && (
                                            <li>... e mais {importResult.errors.length - 5} erros</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                <XCircle className="h-8 w-8 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Erro na Importação</h2>
                                <p className="text-gray-500 mt-1">
                                    Ocorreu um erro ao processar a importação
                                </p>
                            </div>
                        </>
                    )}

                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard/estoque/produtos')}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Ver Produtos
                        </button>
                        <button
                            onClick={() => {
                                setStep('upload');
                                setFile(null);
                                setPreview([]);
                                setImportResult(null);
                            }}
                            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Nova Importação
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
