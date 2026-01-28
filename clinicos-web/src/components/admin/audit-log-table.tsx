import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { AuditActionBadge } from './audit-action-badge';

interface AuditLog {
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    message: string | null;
    createdAt: string;
    user?: {
        id: string;
        name: string;
        email: string;
    };
}

interface AuditLogTableProps {
    logs: AuditLog[];
    loading: boolean;
}

function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const messageLabels: Record<string, string> = {
    // Professionals
    'Professional activated': 'Profissional ativado',
    'Professional deactivated': 'Profissional desativado',
    // Appointments
    'appointment.created': 'Agendamento criado',
    'appointment.updated': 'Agendamento atualizado',
    'appointment.cancelled': 'Agendamento cancelado',
    'appointment.checked_in': 'Check-in realizado',
    // Encounters
    'encounter.started': 'Atendimento iniciado',
    'encounter.updated': 'Atendimento atualizado',
    'encounter.closed': 'Atendimento finalizado',
    // Stock
    'stock.product.created': 'Produto criado',
    'stock.product.updated': 'Produto atualizado',
    'stock.movement.created': 'Movimentação de estoque',
};

function formatMessage(message: string | null): string {
    if (!message) return '-';

    // Handle dynamic messages like "stock.product.deleted: ProductName"
    if (message.startsWith('stock.product.deleted:')) {
        const productName = message.split(':')[1]?.trim();
        return `Produto excluído: ${productName || 'N/A'}`;
    }

    return messageLabels[message] || message;
}

export function AuditLogTable({ logs, loading }: AuditLogTableProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Carregando logs...</div>
            </div>
        );
    }

    if (logs.length === 0) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Nenhum log encontrado</div>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Ação</TableHead>
                        <TableHead>Entidade</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Mensagem</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {logs.map((log) => (
                        <TableRow key={log.id}>
                            <TableCell className="whitespace-nowrap">
                                {formatDate(log.createdAt)}
                            </TableCell>
                            <TableCell>
                                <AuditActionBadge action={log.action} />
                            </TableCell>
                            <TableCell>{log.entity}</TableCell>
                            <TableCell>{log.user?.name || 'Sistema'}</TableCell>
                            <TableCell className="max-w-xs truncate">
                                {formatMessage(log.message)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
