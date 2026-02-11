'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { QuoteTemplateViewer } from '@/components/quotes/quote-template-viewer';
import { useQuoteTemplates, QuoteTemplate } from '@/hooks/useQuoteTemplates';
import api from '@/lib/api';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function QuotePrintPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const templateIdParam = searchParams.get('templateId');

    const { templates, isLoading: isLoadingTemplates } = useQuoteTemplates();
    const [quote, setQuote] = useState<any>(null);
    const [isLoadingQuote, setIsLoadingQuote] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);

    useEffect(() => {
        const fetchQuote = async () => {
            try {
                setIsLoadingQuote(true);
                const { data } = await api.get(`/quotes/${params.id}`);
                setQuote(data);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Erro ao carregar orçamento');
            } finally {
                setIsLoadingQuote(false);
            }
        };

        if (params.id) {
            fetchQuote();
        }
    }, [params.id]);

    useEffect(() => {
        if (!isLoadingTemplates && templates.length > 0) {
            if (templateIdParam) {
                const found = templates.find(t => t.id === templateIdParam);
                if (found) {
                    setSelectedTemplate(found);
                    return;
                }
            }

            const def = templates.find(t => t.isDefault);
            if (def) {
                setSelectedTemplate(def);
            } else {
                setSelectedTemplate(templates[0]);
            }
        }
    }, [isLoadingTemplates, templates, templateIdParam]);

    // Auto-print when ready
    useEffect(() => {
        if (quote && selectedTemplate && !isLoadingQuote && !isLoadingTemplates) {
            // Small delay to ensure rendering
            const timer = setTimeout(() => {
                window.print();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [quote, selectedTemplate, isLoadingQuote, isLoadingTemplates]);

    if (isLoadingQuote || isLoadingTemplates || !selectedTemplate || !quote) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500 mb-4" />
                <p className="text-gray-500">Preparando impressão...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-lg font-bold text-red-700 mb-2">Erro ao carregar</h1>
                    <p className="text-red-600 mb-4">{error}</p>
                    <Button onClick={() => window.close()}>Fechar</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="print-layout bg-white min-h-screen">
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    .print-layout {
                        padding: 0;
                        margin: 0;
                    }
                    /* Hide browser default header/footer if possible, though mostly user setting */
                }
                @media screen {
                    .print-layout {
                        padding: 2rem;
                        background: #f3f4f6;
                    }
                    .preview-container {
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                        background: white;
                        margin: 0 auto;
                        max-width: 210mm;
                    }
                }
            `}</style>

            <div className="preview-container">
                <QuoteTemplateViewer template={selectedTemplate} quote={quote} />
            </div>
        </div>
    );
}
