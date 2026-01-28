import { Badge } from '@/components/ui/badge';

interface ProfessionalStatusBadgeProps {
    active: boolean;
}

export function ProfessionalStatusBadge({ active }: ProfessionalStatusBadgeProps) {
    return (
        <Badge variant={active ? 'default' : 'secondary'} className={active ? 'bg-green-600' : ''}>
            {active ? 'Ativo' : 'Inativo'}
        </Badge>
    );
}
