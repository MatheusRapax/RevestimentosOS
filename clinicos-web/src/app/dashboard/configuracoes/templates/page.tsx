'use client';

import { useState } from 'react';
import { QuoteTemplateViewer } from '@/components/quotes/quote-template-viewer';
import { maskCNPJ, maskPhone, unmask } from '@/lib/masks';
import { fetchCnpjInfo } from '@/lib/brasil-api';

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
    Palette,
    Eye,
    Loader2,
    Settings,
    FileText,
    Image as ImageIcon,
    Search
} from 'lucide-react';
import { toast } from 'sonner';

export default function TemplatesPage() {
    const { templates, isLoading, createTemplate, updateTemplate, deleteTemplate, setDefault } = useQuoteTemplates();
    const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState<CreateQuoteTemplateData>({ name: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);

    const handleCnpjBlur = async (cnpj: string) => {
        if (!cnpj || cnpj.replace(/\D/g, '').length !== 14) return;
        setIsFetchingCnpj(true);
        try {
            const data = await fetchCnpjInfo(cnpj);
            if (data) {
                setFormData(prev => ({
                    ...prev,
                    companyName: data.razao_social || prev.companyName,
                    companyAddress: data.logradouro ? `${data.logradouro}, ${data.numero}${data.complemento ? ` - ${data.complemento}` : ''}${data.bairro ? ` (${data.bairro})` : ''}, ${data.municipio} - ${data.uf}` : prev.companyAddress,
                    companyPhone: data.ddd_telefone_1 ? maskPhone(data.ddd_telefone_1) : prev.companyPhone,
                }));
            }
        } finally {
            setIsFetchingCnpj(false);
        }
    };

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
            companyPhone: maskPhone(template.companyPhone || ''),
            companyEmail: template.companyEmail || '',
            companyAddress: template.companyAddress || '',
            companyCnpj: maskCNPJ(template.companyCnpj || ''),
            bankName: template.bankName || '',
            bankAgency: template.bankAgency || '',
            bankAccount: template.bankAccount || '',
            bankAccountHolder: template.bankAccountHolder || '',
            bankCnpj: maskCNPJ(template.bankCnpj || ''),
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
            const payload = {
                ...formData,
                companyCnpj: unmask(formData.companyCnpj || ''),
                companyPhone: unmask(formData.companyPhone || ''),
                bankCnpj: unmask(formData.bankCnpj || ''),
            };

            if (editingTemplate) {
                await updateTemplate(editingTemplate.id, payload);
                toast.success('Template atualizado!');
            } else {
                await createTemplate(payload);
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
                                    <div className="relative">
                                        <Input
                                            value={formData.companyCnpj || ''}
                                            onChange={(e) => updateField('companyCnpj', maskCNPJ(e.target.value))}
                                            onBlur={() => handleCnpjBlur(formData.companyCnpj || '')}
                                            placeholder="00.000.000/0001-00"
                                            maxLength={18}
                                            className="pr-10"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => handleCnpjBlur(formData.companyCnpj || '')}
                                            disabled={isFetchingCnpj || (formData.companyCnpj || '').replace(/\D/g, '').length !== 14}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-primary transition-colors disabled:opacity-50"
                                            title="Buscar CNPJ"
                                        >
                                            {isFetchingCnpj ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input
                                        value={formData.companyPhone || ''}
                                        onChange={(e) => updateField('companyPhone', maskPhone(e.target.value))}
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
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
                                    <Label>Logo da Empresa</Label>
                                    <div className="flex gap-2 items-center">
                                         <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                
                                                try {
                                                    const uploadData = new FormData();
                                                    uploadData.append('file', file);
                                                    
                                                    toast.loading('Fazendo upload da foto...', { id: 'upload-toast' });
                                                    
                                                    // Assuming a generic upload route exists like the admin one
                                                    // Or base64 for simplicity in templates if there is no public storage route
                                                    const reader = new FileReader();
                                                    reader.readAsDataURL(file);
                                                    reader.onload = () => {
                                                        updateField('companyLogo', reader.result as string);
                                                        toast.success('Upload concluído!', { id: 'upload-toast' });
                                                    };
                                                    reader.onerror = () => {
                                                        toast.error('Erro ao ler arquivo', { id: 'upload-toast' });
                                                    }
                                                } catch (err) {
                                                    toast.error('Erro no upload', { id: 'upload-toast' });
                                                }
                                            }}
                                            className="flex-1"
                                        />
                                        {formData.companyLogo && (
                                            <div className="h-10 w-16 border rounded bg-slate-50 flex items-center justify-center p-1">
                                                <img src={formData.companyLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                                            </div>
                                        )}
                                    </div>
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
                                        onChange={(e) => updateField('bankCnpj', maskCNPJ(e.target.value))}
                                        placeholder="00.000.000/0001-00"
                                        maxLength={18}
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
                            
                            <div className="grid grid-cols-2 gap-8 pt-4">
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-sm border-b pb-2">Rodapé do PDF</h4>
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
                                        <Label>Mostrar Termos</Label>
                                        <Switch
                                            checked={formData.showTerms ?? true}
                                            onCheckedChange={(v) => updateField('showTerms', v)}
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-sm border-b pb-2">Colunas da Tabela</h4>
                                    <div className="flex items-center justify-between">
                                        <Label>Mostrar Quantidade (Qtd)</Label>
                                        <Switch
                                            checked={formData.showQuantity ?? true}
                                            onCheckedChange={(v) => updateField('showQuantity', v)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Mostrar Área (m²)</Label>
                                        <Switch
                                            checked={formData.showUnitArea ?? true}
                                            onCheckedChange={(v) => updateField('showUnitArea', v)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <Label>Mostrar Preço Unitário</Label>
                                        <Switch
                                            checked={formData.showUnitPrice ?? true}
                                            onCheckedChange={(v) => updateField('showUnitPrice', v)}
                                        />
                                    </div>
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
