import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";

interface Category {
    id: string;
    name: string;
    defaultMarkup?: number;
    isActive: boolean;
}

interface CategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    category: Category | null;
    onSuccess: () => void;
}

export function CategoryDialog({ open, onOpenChange, category, onSuccess }: CategoryDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        defaultMarkup: "",
    });

    useEffect(() => {
        if (category) {
            setFormData({
                name: category.name,
                defaultMarkup: category.defaultMarkup?.toString() || "",
            });
        } else {
            setFormData({
                name: "",
                defaultMarkup: "",
            });
        }
    }, [category, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                name: formData.name,
                defaultMarkup: formData.defaultMarkup ? parseFloat(formData.defaultMarkup) : null,
            };

            if (category) {
                await api.patch(`/catalogue/categories/${category.id}`, payload);
                toast.success("Categoria atualizada com sucesso!");
            } else {
                await api.post("/catalogue/categories", payload);
                toast.success("Categoria criada com sucesso!");
            }
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Erro ao salvar categoria");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{category ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
                    <DialogDescription>
                        Defina o nome e o markup padrão para esta categoria de produtos.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome da Categoria</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Pisos, Argamassas..."
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="markup">Markup Padrão (%)</Label>
                        <Input
                            id="markup"
                            type="number"
                            step="0.1"
                            value={formData.defaultMarkup}
                            onChange={(e) => setFormData({ ...formData, defaultMarkup: e.target.value })}
                            placeholder="Ex: 30.0"
                        />
                        <p className="text-xs text-muted-foreground">
                            Define a margem de lucro padrão para produtos desta categoria. Pode ser sobrescrita no produto ou na marca.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : category ? "Atualizar" : "Criar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
