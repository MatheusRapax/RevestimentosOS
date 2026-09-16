'use client';

import { FiscalSettingsForm } from '@/components/fiscal/fiscal-settings-form';
import { Receipt } from 'lucide-react';

/**
 * Configuração fiscal da própria loja (Perfil do Emitente, certificado e
 * regras padrão). Diferente de /admin/fiscal — aquela é do super admin e
 * exige escolher o tenant; esta usa a clínica do usuário logado
 * automaticamente (fiscal.config já é suficiente, sem precisar ser super
 * admin). É o "acesso rápido" às configurações fiscais durante a emissão,
 * pedido pelo usuário na Fase 2.3 do plano fiscal.
 */
export default function LojaFiscalConfigPage() {
    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Receipt className="h-6 w-6" />
                    Configuração Fiscal
                </h1>
                <p className="text-gray-500 mt-1">
                    Dados do emissor, certificado digital e regras padrão usados na emissão de NF-e.
                </p>
            </div>
            <FiscalSettingsForm />
        </div>
    );
}
