import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface InstallmentsListProps {
    installments: any[];
}

export function InstallmentsList({ installments }: InstallmentsListProps) {
    if (!installments || installments.length === 0) {
        return (
            <div className="text-sm text-muted-foreground p-4 text-center border rounded-md bg-muted/10">
                Nenhuma duplicata / parcela encontrada nesta nota.
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Parcela / Número</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Valor (R$)</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {installments.map((inst, index) => {
                        const dVenc = inst.dueDate ? new Date(inst.dueDate) : null;
                        // account for timezone issues simply by formatting date string if it's strictly YYYY-MM-DD
                        const formattedDate = inst.dueDate ? inst.dueDate.split('-').reverse().join('/') : '-';

                        return (
                            <TableRow key={index}>
                                <TableCell className="font-medium">{inst.number || `00${index + 1}`}</TableCell>
                                <TableCell>{formattedDate}</TableCell>
                                <TableCell className="text-right">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.value || 0)}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
