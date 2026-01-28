import { useState } from 'react';
import { MoreHorizontal, CheckCircle, XCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Professional {
    id: string;
    name: string;
    email: string;
    active: boolean;
}

interface ProfessionalActionsMenuProps {
    professional: Professional;
    isSelf: boolean;
    onActivate: (userId: string) => Promise<void>;
    onDeactivate: (userId: string) => Promise<void>;
}

export function ProfessionalActionsMenu({
    professional,
    isSelf,
    onActivate,
    onDeactivate,
}: ProfessionalActionsMenuProps) {
    const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleActivate = async () => {
        setLoading(true);
        try {
            await onActivate(professional.id);
        } catch (error) {
            // Error already handled in hook
        } finally {
            setLoading(false);
        }
    };

    const handleDeactivate = async () => {
        setLoading(true);
        try {
            await onDeactivate(professional.id);
            setShowDeactivateDialog(false);
        } catch (error) {
            // Error already handled in hook
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {!professional.active && (
                        <DropdownMenuItem onClick={handleActivate} disabled={isSelf || loading}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Ativar
                        </DropdownMenuItem>
                    )}
                    {professional.active && (
                        <DropdownMenuItem
                            onClick={() => setShowDeactivateDialog(true)}
                            disabled={isSelf || loading}
                        >
                            <XCircle className="mr-2 h-4 w-4" />
                            Desativar
                        </DropdownMenuItem>
                    )}
                    {isSelf && (
                        <DropdownMenuItem disabled>
                            <Info className="mr-2 h-4 w-4" />
                            Você não pode alterar seu próprio status
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Desativar Profissional</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja desativar <strong>{professional.name}</strong>? O profissional
                            não poderá mais acessar a clínica até ser reativado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeactivate} disabled={loading}>
                            {loading ? 'Desativando...' : 'Desativar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
