'use client';

import { useState } from 'react';
import { useAdminAudit, AuditLog } from '@/hooks/use-admin-audit';
import { useAdminTenants } from '@/hooks/use-admin-tenants';
import { useAdminUsers } from '@/hooks/use-admin-users'; // Assuming this hook allows fetching all users for filter or suggest
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Search, RefreshCw, FilterX, Eye } from 'lucide-react';
import { AuditDetailsDialog } from './audit-details-dialog';

export default function AdminAuditPage() {
    const [filters, setFilters] = useState({
        clinicId: 'all',
        action: 'all',
        search: '', // Filter by user/entity desc? (Need backend support or client filter)
    });
    const [page, setPage] = useState(0);
    const limit = 50;
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);

    const handleViewDetails = (log: AuditLog) => {
        setSelectedLog(log);
        setDetailsOpen(true);
    };

    const { data, isLoading, refetch, isRefetching } = useAdminAudit({
        clinicId: filters.clinicId === 'all' ? undefined : filters.clinicId,
        action: filters.action === 'all' ? undefined : filters.action,
        limit,
        offset: page * limit,
    });

    const { tenants } = useAdminTenants();

    const actions = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'LOGIN', 'EXPORT'];

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(0); // Reset to first page
    };

    const clearFilters = () => {
        setFilters({ clinicId: 'all', action: 'all', search: '' });
        setPage(0);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Auditoria do Sistema</h2>
                    <p className="text-muted-foreground mt-1">Logs de atividade de todos os tenants e usuários.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-medium">Filtros</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Loja / Tenant</label>
                        <Select
                            value={filters.clinicId}
                            onValueChange={(val) => handleFilterChange('clinicId', val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Todas as lojas" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as lojas</SelectItem>
                                {tenants?.map((tenant) => (
                                    <SelectItem key={tenant.id} value={tenant.id}>
                                        {tenant.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Ação</label>
                        <Select
                            value={filters.action}
                            onValueChange={(val) => handleFilterChange('action', val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Todas as ações" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as ações</SelectItem>
                                {actions.map((act) => (
                                    <SelectItem key={act} value={act}>
                                        {act}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-end">
                        <Button variant="ghost" onClick={clearFilters} className="text-muted-foreground">
                            <FilterX className="h-4 w-4 mr-2" />
                            Limpar Filtros
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Ação</TableHead>
                            <TableHead>Entidade</TableHead>
                            <TableHead>Loja</TableHead>
                            <TableHead>Detalhes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                                </TableCell>
                            </TableRow>
                        ) : data?.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                                    Nenhum registro encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data?.data.map((log: AuditLog) => (
                                <TableRow key={log.id}>
                                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                                        {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss")}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-sm">{log.user?.name || 'Desconhecido'}</span>
                                            <span className="text-xs text-muted-foreground">{log.user?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`
                                            ${log.action === 'DELETE' ? 'border-red-200 text-red-700 bg-red-50' : ''}
                                            ${log.action === 'CREATE' ? 'border-green-200 text-green-700 bg-green-50' : ''}
                                            ${log.action === 'UPDATE' ? 'border-blue-200 text-blue-700 bg-blue-50' : ''}
                                        `}>
                                            {log.action}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm font-medium">
                                        {log.entity}
                                    </TableCell>
                                    <TableCell>
                                        {log.clinic ? (
                                            <Badge variant="secondary" className="font-normal">
                                                {log.clinic.name}
                                            </Badge>
                                        ) : (
                                            <span className="text-xs text-slate-400">Global</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600 max-w-xs truncate" title={log.message || ''}>
                                        {log.message || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {log.details ? (
                                            <Button variant="ghost" size="sm" onClick={() => handleViewDetails(log)}>
                                                <Eye className="h-3 w-3 mr-1" />
                                                Ver
                                            </Button>
                                        ) : (
                                            <span className="text-xs text-slate-400">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex items-center justify-end space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0 || isLoading}
                >
                    Anterior
                </Button>
                <div className="text-sm text-muted-foreground">
                    Página {page + 1}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!data || data.data.length < limit || isLoading}
                >
                    Próxima
                </Button>
            </div>

            <AuditDetailsDialog
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                data={selectedLog?.details}
            />
        </div >
    );
}
