import { Badge } from '@/components/ui/badge';

interface AuditActionBadgeProps {
    action: string;
}

const actionColors: Record<string, string> = {
    CREATE: 'bg-green-600',
    UPDATE: 'bg-blue-600',
    DELETE: 'bg-red-600',
    VIEW: 'bg-gray-600',
    LOGIN: 'bg-purple-600',
    EXPORT: 'bg-orange-600',
};

const actionLabels: Record<string, string> = {
    CREATE: 'Criação',
    UPDATE: 'Atualização',
    DELETE: 'Exclusão',
    VIEW: 'Visualização',
    LOGIN: 'Login',
    EXPORT: 'Exportação',
};

export function AuditActionBadge({ action }: AuditActionBadgeProps) {
    return (
        <Badge className={actionColors[action] || 'bg-gray-600'}>
            {actionLabels[action] || action}
        </Badge>
    );
}
