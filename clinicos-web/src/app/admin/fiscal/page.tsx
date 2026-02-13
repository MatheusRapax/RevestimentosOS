'use client';

import { useState } from 'react';
import { useAdminTenants } from '@/hooks/use-admin-tenants';
import { FiscalSettingsForm } from '@/components/fiscal/fiscal-settings-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export default function AdminFiscalPage() {
    const { tenants, isLoading } = useAdminTenants();
    const [selectedTenantId, setSelectedTenantId] = useState<string>('');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Super Admin - Fiscal</h2>
                <p className="text-muted-foreground">
                    Gerencie as configurações fiscais de qualquer loja (Tenant).
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Selecionar Loja</CardTitle>
                    <CardDescription>
                        Escolha qual loja você deseja configurar.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Loader2 className="h-4 w-4 animate-spin" /> Carregando lojas...
                        </div>
                    ) : (
                        <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                            <SelectTrigger className="w-[300px]">
                                <SelectValue placeholder="Selecione uma loja..." />
                            </SelectTrigger>
                            <SelectContent>
                                {tenants?.map((tenant) => (
                                    <SelectItem key={tenant.id} value={tenant.id}>
                                        {tenant.name} ({tenant.slug})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                </CardContent>
            </Card>

            {selectedTenantId ? (
                <div key={selectedTenantId}>
                    <FiscalSettingsForm clinicId={selectedTenantId} />
                </div>
            ) : (
                <div className="text-center py-12 text-gray-500 border-2 border-dashed rounded-lg bg-gray-50">
                    Selecione uma loja acima para visualizar as configurações.
                </div>
            )}
        </div>
    );
}
