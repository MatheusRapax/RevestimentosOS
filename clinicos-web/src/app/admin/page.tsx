'use client';

import { useAdminStats } from '@/hooks/use-admin-stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, ShieldCheck, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AdminDashboardPage() {
    const { data: stats, isLoading } = useAdminStats();

    if (isLoading) {
        return <div className="p-8 space-y-4">
            <Skeleton className="h-12 w-64" />
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
            </div>
        </div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Dashboard Global</h2>
                <p className="text-muted-foreground">Visão geral do sistema multi-tenant.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Lojas Ativas</CardTitle>
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.clinics.active} / {stats?.clinics.total}</div>
                        <p className="text-xs text-muted-foreground">
                            {(stats?.clinics.active || 0) / (stats?.clinics.total || 1) * 100}% de ocupação
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.users.active}</div>
                        <p className="text-xs text-muted-foreground">
                            Total cadastrado: {stats?.users.total}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.users.superAdmins}</div>
                        <p className="text-xs text-muted-foreground">
                            Gestores do sistema
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Atividade Recente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {stats?.recentLogs.map((log) => (
                                <div key={log.id} className="flex items-center">
                                    <Activity className="h-9 w-9 text-slate-500 bg-slate-100 p-2 rounded-full mr-4" />
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            {log.user?.name || log.user?.email || 'Sistema'}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {log.action} em {log.entity} - {log.clinic?.name || 'Global'}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium text-xs text-muted-foreground">
                                        {format(new Date(log.createdAt), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                                    </div>
                                </div>
                            ))}
                            {(!stats?.recentLogs || stats.recentLogs.length === 0) && (
                                <div className="text-center text-muted-foreground">Nenhuma atividade recente.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
