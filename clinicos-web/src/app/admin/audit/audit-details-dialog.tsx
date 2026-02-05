import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface AuditDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: any;
}

export function AuditDetailsDialog({ open, onOpenChange, data }: AuditDetailsDialogProps) {
    if (!data) return null;

    const formattedJson = JSON.stringify(data, null, 2);

    const handleCopy = () => {
        navigator.clipboard.writeText(formattedJson);
        toast.success('JSON copiado!');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Detalhes da Auditoria</DialogTitle>
                    <DialogDescription>
                        Payload completo da requisição/ação.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative rounded-md border bg-slate-50 p-4 font-mono text-sm">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 h-6 w-6"
                        onClick={handleCopy}
                    >
                        <Copy className="h-3 w-3" />
                    </Button>
                    <ScrollArea className="h-[300px]">
                        <pre className="whitespace-pre-wrap break-all">{formattedJson}</pre>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
