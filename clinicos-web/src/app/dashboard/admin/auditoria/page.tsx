'use client';

import { Shield } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { AuditLogTable } from '@/components/admin/audit-log-table';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AuditLogAdminPage() {
    const { logs, loading, error } = useAuditLogs();

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Shield className="h-8 w-8" />
                        Logs de Auditoria
                    </h1>
                    <p className="text-muted-foreground">
                        Histórico de ações administrativas
                    </p>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>
                        {error.message?.includes('403')
                            ? 'Você não tem permissão para acessar os logs'
                            : 'Erro ao carregar logs. Tente novamente.'}
                    </AlertDescription>
                </Alert>
            )}

            {/* Table */}
            <AuditLogTable logs={logs} loading={loading} />

            {/* Stats */}
            {!loading && !error && (
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                        Total de registros: <strong>{logs.length}</strong>
                    </span>
                </div>
            )}
        </div>
    );
}
