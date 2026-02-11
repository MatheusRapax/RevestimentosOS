'use client';

import { useState } from 'react';
import { QuoteTemplateViewer } from '@/components/quotes/quote-template-viewer';

import { useQuoteTemplates, QuoteTemplate, CreateQuoteTemplateData } from '@/hooks/useQuoteTemplates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Plus,
    Pencil,
    Trash2,
    Star,
    Building2,
    CreditCard,
    FileText,
    Palette,
    Eye,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';

export default function TemplatesPage() {
    const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, setDefault } = useQuoteTemplates();
    const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState<CreateQuoteTemplateData>({ name: '' });
    const [isSaving, setIsSaving] = useState(false);

    const handleOpenCreate = () => {
        setFormData({
            name: 'Novo Template',
            validityDays: 10,
            defaultDeliveryDays: '7dd',
            primaryColor: '#000000',
            accentColor: '#4CAF50',
            showSignatureLines: true,
            showBankDetails: true,
            showTerms: true,
        });
        setIsCreating(true);
    };

    const handleOpenEdit = (template: QuoteTemplate) => {
        setFormData({
            name: template.name,
            companyName: template.companyName || '',
            companyLogo: template.companyLogo || '',
            companyPhone: template.companyPhone || '',
            companyEmail: template.companyEmail || '',
            companyAddress: template.companyAddress || '',
            companyCnpj: template.companyCnpj || '',
            bankName: template.bankName || '',
            bankAgency: template.bankAgency || '',
            bankAccount: template.bankAccount || '',
            bankAccountHolder: template.bankAccountHolder || '',
            bankCnpj: template.bankCnpj || '',
            pixKey: template.pixKey || '',
            termsAndConditions: template.termsAndConditions || '',
            validityDays: template.validityDays,
            validityText: template.validityText || '',
            defaultDeliveryDays: template.defaultDeliveryDays || '',
            primaryColor: template.primaryColor,
            accentColor: template.accentColor,
            showSignatureLines: template.showSignatureLines,
            showBankDetails: template.showBankDetails,
            showTerms: template.showTerms,
            footerText: template.footerText || '',
        });
        setEditingTemplate(template);
    };

    const handleClose = () => {
        setIsCreating(false);
        setEditingTemplate(null);
        setFormData({ name: '' });
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.error('Nome é obrigatório');
            return;
        }
        setIsSaving(true);
        try {
            if (editingTemplate) {
                await updateTemplate(editingTemplate.id, formData);
                toast.success('Template atualizado!');
            } else {
                await createTemplate(formData);
                toast.success('Template criado!');
            }
            handleClose();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao salvar template');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este template?')) return;
        try {
            await deleteTemplate(id);
            toast.success('Template excluído!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao excluir template');
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            await setDefault(id);
            toast.success('Template definido como padrão!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao definir template padrão');
        }
    };

    const updateField = (field: keyof CreateQuoteTemplateData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Templates de Orçamento</h1>
                    <p className="text-muted-foreground">
                        Configure os modelos de orçamento com logo, dados bancários e termos.
                    </p>
                </div>
                <Button onClick={handleOpenCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Template
                </Button>
            </div>

            {templates.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">Nenhum template criado</p>
                        <p className="text-muted-foreground mb-4">
                            Crie um template para personalizar seus orçamentos.
                        </p>
                        <Button onClick={handleOpenCreate}>
                            <Plus className="h-4 w-4 mr-2" />
                            Criar Primeiro Template
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => (
                        <Card key={template.id} className={template.isDefault ? 'border-primary' : ''}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{template.name}</CardTitle>
                                    {template.isDefault && (
                                        <Badge className="bg-primary">
                                            <Star className="h-3 w-3 mr-1" />
                                            Padrão
                                        </Badge>
                                    )}
                                </div>
                                <CardDescription>
                                    {template.companyName || 'Empresa não configurada'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                                    <p>📞 {template.companyPhone || 'Sem telefone'}</p>
                                    <p>🏦 {template.bankName || 'Banco não configurado'}</p>
                                    <p>📅 Validade: {template.validityDays} dias</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleOpenEdit(template)}
                                    >
                                        <Pencil className="h-4 w-4 mr-1" />
                                        Editar
                                    </Button>
                                    {!template.isDefault && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleSetDefault(template.id)}
                                        >
                                            <Star className="h-4 w-4" />
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(template.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={isCreating || !!editingTemplate} onOpenChange={handleClose}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingTemplate ? 'Editar Template' : 'Novo Template'}
                        </DialogTitle>
                    </DialogHeader>

                    <Tabs defaultValue="company" className="w-full">
                        <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="company">
                                <Building2 className="h-4 w-4 mr-2" />
                                Empresa
                            </TabsTrigger>
                            <TabsTrigger value="bank">
                                <CreditCard className="h-4 w-4 mr-2" />
                                Banco
                            </TabsTrigger>
                            <TabsTrigger value="terms">
                                <FileText className="h-4 w-4 mr-2" />
                                Termos
                            </TabsTrigger>
                            <TabsTrigger value="appearance">
                                <Palette className="h-4 w-4 mr-2" />
                                Aparência
                            </TabsTrigger>
                            <TabsTrigger value="preview">
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="company" className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome do Template *</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => updateField('name', e.target.value)}
                                        placeholder="Ex: Padrão, Promocional"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nome da Empresa</Label>
                                    <Input
                                        value={formData.companyName || ''}
                                        onChange={(e) => updateField('companyName', e.target.value)}
                                        placeholder="Mosaic Acabamentos Ltda."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>CNPJ</Label>
                                    <Input
                                        value={formData.companyCnpj || ''}
                                        onChange={(e) => updateField('companyCnpj', e.target.value)}
                                        placeholder="00.000.000/0001-00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input
                                        value={formData.companyPhone || ''}
                                        onChange={(e) => updateField('companyPhone', e.target.value)}
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>E-mail</Label>
                                    <Input
                                        value={formData.companyEmail || ''}
                                        onChange={(e) => updateField('companyEmail', e.target.value)}
                                        placeholder="contato@empresa.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>URL da Logo</Label>
                                    <Input
                                        value={formData.companyLogo || ''}
                                        onChange={(e) => updateField('companyLogo', e.target.value)}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>Endereço</Label>
                                    <Input
                                        value={formData.companyAddress || ''}
                                        onChange={(e) => updateField('companyAddress', e.target.value)}
                                        placeholder="Rua, Número - Bairro, Cidade - UF"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="bank" className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Banco</Label>
                                    <Input
                                        value={formData.bankName || ''}
                                        onChange={(e) => updateField('bankName', e.target.value)}
                                        placeholder="Bradesco"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Agência</Label>
                                    <Input
                                        value={formData.bankAgency || ''}
                                        onChange={(e) => updateField('bankAgency', e.target.value)}
                                        placeholder="1234-5"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Conta Corrente</Label>
                                    <Input
                                        value={formData.bankAccount || ''}
                                        onChange={(e) => updateField('bankAccount', e.target.value)}
                                        placeholder="12345-6"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Titular</Label>
                                    <Input
                                        value={formData.bankAccountHolder || ''}
                                        onChange={(e) => updateField('bankAccountHolder', e.target.value)}
                                        placeholder="Empresa Ltda."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>CNPJ do Titular</Label>
                                    <Input
                                        value={formData.bankCnpj || ''}
                                        onChange={(e) => updateField('bankCnpj', e.target.value)}
                                        placeholder="00.000.000/0001-00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Chave PIX</Label>
                                    <Input
                                        value={formData.pixKey || ''}
                                        onChange={(e) => updateField('pixKey', e.target.value)}
                                        placeholder="email@pix.com ou CNPJ"
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="terms" className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Validade (dias)</Label>
                                    <Input
                                        type="number"
                                        value={formData.validityDays || 10}
                                        onChange={(e) => updateField('validityDays', parseInt(e.target.value) || 10)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Prazo de Entrega Padrão</Label>
                                    <Input
                                        value={formData.defaultDeliveryDays || ''}
                                        onChange={(e) => updateField('defaultDeliveryDays', e.target.value)}
                                        placeholder="7dd, 15 dias úteis..."
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Texto de Validade</Label>
                                <Textarea
                                    value={formData.validityText || ''}
                                    onChange={(e) => updateField('validityText', e.target.value)}
                                    placeholder="Este orçamento possui validade de X dias úteis..."
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Termos e Condições</Label>
                                <Textarea
                                    value={formData.termsAndConditions || ''}
                                    onChange={(e) => updateField('termsAndConditions', e.target.value)}
                                    placeholder="1 - A aplicação dos produtos vendidos é de responsabilidade dos clientes;&#10;2 - A loja não é responsável por danos durante a instalação;&#10;..."
                                    rows={8}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Texto do Rodapé</Label>
                                <Textarea
                                    value={formData.footerText || ''}
                                    onChange={(e) => updateField('footerText', e.target.value)}
                                    placeholder="Informações adicionais..."
                                    rows={2}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="appearance" className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Cor Primária</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={formData.primaryColor || '#000000'}
                                            onChange={(e) => updateField('primaryColor', e.target.value)}
                                            className="w-16 h-10 p-1"
                                        />
                                        <Input
                                            value={formData.primaryColor || '#000000'}
                                            onChange={(e) => updateField('primaryColor', e.target.value)}
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Cor de Destaque</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={formData.accentColor || '#4CAF50'}
                                            onChange={(e) => updateField('accentColor', e.target.value)}
                                            className="w-16 h-10 p-1"
                                        />
                                        <Input
                                            value={formData.accentColor || '#4CAF50'}
                                            onChange={(e) => updateField('accentColor', e.target.value)}
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4 pt-4">
                                <div className="flex items-center justify-between">
                                    <Label>Mostrar Linhas de Assinatura</Label>
                                    <Switch
                                        checked={formData.showSignatureLines ?? true}
                                        onCheckedChange={(v) => updateField('showSignatureLines', v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Mostrar Dados Bancários</Label>
                                    <Switch
                                        checked={formData.showBankDetails ?? true}
                                        onCheckedChange={(v) => updateField('showBankDetails', v)}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label>Mostrar Termos e Condições</Label>
                                    <Switch
                                        checked={formData.showTerms ?? true}
                                        onCheckedChange={(v) => updateField('showTerms', v)}
                                    />
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="preview" className="pt-4">
                            <div className="border rounded-lg bg-white shadow-sm overflow-hidden" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                <div className="transform scale-90 origin-top">
                                    <QuoteTemplateViewer template={formData} />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground text-center mt-2">
                                Preview simulado. O PDF final pode ter pequenas variações.
                            </p>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter>
                        <Button variant="outline" onClick={handleClose}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingTemplate ? 'Salvar Alterações' : 'Criar Template'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
