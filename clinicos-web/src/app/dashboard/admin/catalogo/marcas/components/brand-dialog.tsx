import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";

interface Brand {
    id: string;
    name: string;
    defaultMarkup?: number;
    isActive: boolean;
}

interface BrandDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    brand: Brand | null;
    onSuccess: () => void;
}

export function BrandDialog({ open, onOpenChange, brand, onSuccess }: BrandDialogProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        defaultMarkup: "",
    });

    useEffect(() => {
        if (brand) {
            setFormData({
                name: brand.name,
                defaultMarkup: brand.defaultMarkup?.toString() || "",
            });
        } else {
            setFormData({
                name: "",
                defaultMarkup: "",
            });
        }
    }, [brand, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                name: formData.name,
                defaultMarkup: formData.defaultMarkup ? parseFloat(formData.defaultMarkup) : null,
            };

            if (brand) {
                await api.patch(`/catalogue/brands/${brand.id}`, payload);
                toast.success("Marca atualizada com sucesso!");
            } else {
                await api.post("/catalogue/brands", payload);
                toast.success("Marca criada com sucesso!");
            }
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Erro ao salvar marca");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{brand ? "Editar Marca" : "Nova Marca"}</DialogTitle>
                    <DialogDescription>
                        Defina o nome e o markup padrão para esta marca de produtos.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome da Marca</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: Portinari, Quartzolit..."
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
                            Define a margem de lucro padrão para produtos desta marca. Pode ser sobrescrita no produto (se definido).
                        </p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : brand ? "Atualizar" : "Criar"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
