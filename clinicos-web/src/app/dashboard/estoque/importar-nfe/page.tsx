'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    Upload,
    FileCode,
    CheckCircle,
    XCircle,
    AlertTriangle,
    ArrowLeft,
    Loader2,
    Package,
    FileText,
    Truck,
    Building2,
    Calendar
} from 'lucide-react';

interface NFeParsedData {
    numero: string;
    serie: string;
    dataEmissao: string;
    fornecedor: {
        cnpj: string;
        razaoSocial: string;
        cidade: string;
        uf: string;
    };
    produtos: Array<{
        codigo: string;
        descricao: string;
        quantidade: number;
        unidade: string;
        valorUnitario: number;
        valorTotal: number;
        ncm: string;
    }>;
    totais: {
        valorProdutos: number;
        valorFrete: number;
        valorTotal: number;
    };
}

// Mock parser - in production would use a proper XML library
function parseNFeXML(xmlContent: string): NFeParsedData | null {
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlContent, 'text/xml');

        const nfe = doc.querySelector('NFe, nfeProc');
        if (!nfe) return null;

        const ide = nfe.querySelector('ide');
        const emit = nfe.querySelector('emit');
        const total = nfe.querySelector('total ICMSTot');

        const produtos: NFeParsedData['produtos'] = [];
        const dets = nfe.querySelectorAll('det');

        dets.forEach((det) => {
            const prod = det.querySelector('prod');
            if (prod) {
                produtos.push({
                    codigo: prod.querySelector('cProd')?.textContent || '',
                    descricao: prod.querySelector('xProd')?.textContent || '',
                    quantidade: parseFloat(prod.querySelector('qCom')?.textContent || '0'),
                    unidade: prod.querySelector('uCom')?.textContent || 'UN',
                    valorUnitario: parseFloat(prod.querySelector('vUnCom')?.textContent || '0'),
                    valorTotal: parseFloat(prod.querySelector('vProd')?.textContent || '0'),
                    ncm: prod.querySelector('NCM')?.textContent || '',
                });
            }
        });

        return {
            numero: ide?.querySelector('nNF')?.textContent || '',
            serie: ide?.querySelector('serie')?.textContent || '',
            dataEmissao: ide?.querySelector('dhEmi')?.textContent?.split('T')[0] || '',
            fornecedor: {
                cnpj: emit?.querySelector('CNPJ')?.textContent || '',
                razaoSocial: emit?.querySelector('xNome')?.textContent || '',
                cidade: emit?.querySelector('enderEmit xMun')?.textContent || '',
                uf: emit?.querySelector('enderEmit UF')?.textContent || '',
            },
            produtos,
            totais: {
                valorProdutos: parseFloat(total?.querySelector('vProd')?.textContent || '0'),
                valorFrete: parseFloat(total?.querySelector('vFrete')?.textContent || '0'),
                valorTotal: parseFloat(total?.querySelector('vNF')?.textContent || '0'),
            },
        };
    } catch (error) {
        console.error('Error parsing NFe XML:', error);
        return null;
    }
}

export default function ImportNFePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<NFeParsedData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
    const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile && selectedFile.name.endsWith('.xml')) {
            setFile(selectedFile);
            setIsLoading(true);

            try {
                const xmlContent = await selectedFile.text();
                const parsed = parseNFeXML(xmlContent);

                if (parsed) {
                    setParsedData(parsed);
                    setStep('preview');
                } else {
                    alert('Não foi possível processar o XML. Verifique se é uma NFe válida.');
                }
            } catch (error) {
                alert('Erro ao ler o arquivo XML');
            } finally {
                setIsLoading(false);
            }
        } else {
            alert('Por favor, selecione um arquivo XML válido.');
        }
    };

    const handleImport = async () => {
        if (!parsedData) return;

        setIsLoading(true);
        try {
            // In production, this would call the API to:
            // 1. Create/update products from NFe items
            // 2. Create stock entry movements
            // 3. Create purchase order record

            await new Promise(resolve => setTimeout(resolve, 2000));

            setImportResult({
                success: true,
                message: `${parsedData.produtos.length} produtos importados da NFe ${parsedData.numero}`,
            });
            setStep('result');
        } catch (error) {
            setImportResult({
                success: false,
                message: 'Erro ao processar importação',
            });
            setStep('result');
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    const formatCNPJ = (cnpj: string) => {
        return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    };

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
                    <h1 className="text-2xl font-bold text-gray-900">Importar NFe</h1>
                    <p className="text-gray-500">Entrada de estoque a partir de Nota Fiscal Eletrônica</p>
                </div>
            </div>

            {/* Step: Upload */}
            {step === 'upload' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <div className="text-center space-y-6">
                        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                            <FileCode className="h-8 w-8 text-green-600" />
                        </div>

                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Upload do XML da NFe</h2>
                            <p className="text-gray-500 mt-1">
                                Selecione o arquivo XML da Nota Fiscal Eletrônica de compra
                            </p>
                        </div>

                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
                        >
                            {isLoading ? (
                                <Loader2 className="h-12 w-12 text-green-500 mx-auto mb-4 animate-spin" />
                            ) : (
                                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                            )}
                            <p className="text-gray-600">
                                Clique para selecionar ou arraste o arquivo aqui
                            </p>
                            <p className="text-sm text-gray-400 mt-2">
                                Arquivos XML de NFe (Nota Fiscal Eletrônica)
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xml"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>

                        <div className="pt-4 border-t text-sm text-gray-500">
                            <p>O sistema irá:</p>
                            <ul className="mt-2 space-y-1">
                                <li>• Ler os produtos da nota fiscal</li>
                                <li>• Comparar com produtos existentes por código/SKU</li>
                                <li>• Criar entrada de estoque automática</li>
                                <li>• Registrar o pedido de compra</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Step: Preview */}
            {step === 'preview' && parsedData && (
                <div className="space-y-6">
                    {/* NFe Info Card */}
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
                                    <FileText className="h-5 w-5 text-blue-500" />
                                    Dados da Nota
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Número:</span>
                                        <span className="font-medium">{parsedData.numero}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Série:</span>
                                        <span className="font-medium">{parsedData.serie}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Data Emissão:</span>
                                        <span className="font-medium">
                                            {parsedData.dataEmissao ? new Date(parsedData.dataEmissao).toLocaleDateString('pt-BR') : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-medium text-gray-900 flex items-center gap-2 mb-4">
                                    <Building2 className="h-5 w-5 text-green-500" />
                                    Fornecedor
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">CNPJ:</span>
                                        <span className="font-medium font-mono">
                                            {formatCNPJ(parsedData.fornecedor.cnpj)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Razão Social:</span>
                                        <p className="font-medium">{parsedData.fornecedor.razaoSocial}</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Cidade/UF:</span>
                                        <span className="font-medium">
                                            {parsedData.fornecedor.cidade}/{parsedData.fornecedor.uf}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Products Table */}
                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                            <h3 className="font-medium flex items-center gap-2">
                                <Package className="h-5 w-5 text-blue-500" />
                                Produtos ({parsedData.produtos.length})
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left">Código</th>
                                        <th className="px-4 py-3 text-left">Descrição</th>
                                        <th className="px-4 py-3 text-center">Qtd</th>
                                        <th className="px-4 py-3 text-center">UN</th>
                                        <th className="px-4 py-3 text-right">Vl. Unit.</th>
                                        <th className="px-4 py-3 text-right">Vl. Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {parsedData.produtos.map((prod, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-mono text-gray-600">{prod.codigo}</td>
                                            <td className="px-4 py-3 font-medium">{prod.descricao}</td>
                                            <td className="px-4 py-3 text-center">{prod.quantidade}</td>
                                            <td className="px-4 py-3 text-center">{prod.unidade}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(prod.valorUnitario)}</td>
                                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(prod.valorTotal)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Totals */}
                        <div className="p-4 border-t bg-gray-50">
                            <div className="flex justify-end space-x-8 text-sm">
                                <div className="flex gap-4">
                                    <span className="text-gray-500">Produtos:</span>
                                    <span className="font-medium">{formatCurrency(parsedData.totais.valorProdutos)}</span>
                                </div>
                                {parsedData.totais.valorFrete > 0 && (
                                    <div className="flex gap-4">
                                        <span className="text-gray-500">Frete:</span>
                                        <span className="font-medium">{formatCurrency(parsedData.totais.valorFrete)}</span>
                                    </div>
                                )}
                                <div className="flex gap-4">
                                    <span className="text-gray-900 font-medium">Total NFe:</span>
                                    <span className="font-bold text-lg">{formatCurrency(parsedData.totais.valorTotal)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between">
                        <button
                            onClick={() => {
                                setStep('upload');
                                setFile(null);
                                setParsedData(null);
                            }}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Escolher outro arquivo
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={isLoading}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            <Truck className="h-4 w-4" />
                            Importar e Dar Entrada no Estoque
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
                                <p className="text-gray-500 mt-1">{importResult.message}</p>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                <XCircle className="h-8 w-8 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-gray-900">Erro na Importação</h2>
                                <p className="text-gray-500 mt-1">{importResult.message}</p>
                            </div>
                        </>
                    )}

                    <div className="flex justify-center gap-4">
                        <button
                            onClick={() => router.push('/dashboard/estoque')}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Ver Estoque
                        </button>
                        <button
                            onClick={() => {
                                setStep('upload');
                                setFile(null);
                                setParsedData(null);
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
