'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Truck,
    Calendar,
    MapPin,
    Search,
    Plus,
    Clock,
    CheckCircle,
    XCircle,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Order {
    id: string;
    number: number;
    customer: {
        name: string;
        address: string | null;
        city: string | null;
    };
    totalCents: number;
}

interface Delivery {
    id: string;
    orderId: string;
    order: Order;
    status: 'PENDING' | 'SCHEDULED' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED' | 'CANCELED';
    scheduledDate: string | null;
    driverName: string | null;
    vehiclePlate: string | null;
    notes: string | null;
    createdAt: string;
}

export default function EntregasPage() {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Create Form State
    const [selectedOrderId, setSelectedOrderId] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [driverName, setDriverName] = useState('');
    const [vehiclePlate, setVehiclePlate] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [deliveriesRes, ordersRes] = await Promise.all([
                api.get('/deliveries'),
                api.get('/orders?status=PRONTO_PARA_ENTREGA')
            ]);
            setDeliveries(deliveriesRes.data);

            // Filter orders that don't have deliveries yet
            // This logic ideally should be in backend, but doing here for simplicity
            const existingDeliveryOrderIds = deliveriesRes.data.map((d: Delivery) => d.orderId);
            const availableOrders = ordersRes.data.filter((o: Order) => !existingDeliveryOrderIds.includes(o.id));
            setOrders(availableOrders);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDelivery = async () => {
        try {
            await api.post('/deliveries', {
                orderId: selectedOrderId,
                scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
                driverName,
                vehiclePlate,
                notes
            });
            setIsCreateOpen(false);
            resetForm();
            fetchData();
            toast.success('Entrega agendada com sucesso!');
        } catch (error: any) {
            console.error('Error creating delivery:', error);
            const msg = error?.response?.data?.message || 'Erro ao agendar entrega';
            toast.error(msg);
        }
    };

    const statusLabels: Record<string, string> = {
        IN_TRANSIT: 'Em Trânsito',
        DELIVERED: 'Entregue',
        CANCELED: 'Cancelado',
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        // Warn user that completing delivery will auto-finalize the order
        if (newStatus === 'DELIVERED') {
            const confirm = window.confirm(
                'Ao concluir a entrega, o pedido será automaticamente finalizado (status → Entregue). Deseja continuar?'
            );
            if (!confirm) return;
        }

        try {
            await api.patch(`/deliveries/${id}`, { status: newStatus });
            fetchData();
            toast.success(`Status atualizado para ${statusLabels[newStatus] || newStatus}`);
        } catch (error: any) {
            console.error('Error updating status:', error);
            const msg = error?.response?.data?.message || 'Erro ao atualizar status';
            toast.error(msg);
        }
    };

    const resetForm = () => {
        setSelectedOrderId('');
        setScheduledDate('');
        setDriverName('');
        setVehiclePlate('');
        setNotes('');
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: 'bg-gray-100 text-gray-800',
            SCHEDULED: 'bg-blue-100 text-blue-800',
            IN_TRANSIT: 'bg-purple-100 text-purple-800',
            DELIVERED: 'bg-green-100 text-green-800',
            FAILED: 'bg-red-100 text-red-800',
            CANCELED: 'bg-red-100 text-red-800',
        };

        const labels: Record<string, string> = {
            PENDING: 'Pendente',
            SCHEDULED: 'Agendado',
            IN_TRANSIT: 'Em Trânsito',
            DELIVERED: 'Entregue',
            FAILED: 'Falhou',
            CANCELED: 'Cancelado',
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.PENDING}`}>
                {labels[status] || status}
            </span>
        );
    };

    const filteredDeliveries = deliveries.filter(delivery => {
        const matchesSearch =
            delivery.order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(delivery.order.number).includes(searchTerm);

        const matchesStatus = statusFilter === 'ALL' || delivery.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Entregas</h1>
                    <p className="text-gray-600 mt-1">
                        Gerencie o agendamento e status de entregas
                    </p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Agendar Entrega
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Agendar Nova Entrega</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Pedido Confirmado</Label>
                                <Select value={selectedOrderId} onValueChange={setSelectedOrderId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um pedido" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {orders.map(order => (
                                            <SelectItem key={order.id} value={order.id}>
                                                #{order.number} - {order.customer.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Data Agendada</Label>
                                <Input
                                    type="datetime-local"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Motorista</Label>
                                    <Input
                                        placeholder="Nome do motorista"
                                        value={driverName}
                                        onChange={(e) => setDriverName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Placa Veículo</Label>
                                    <Input
                                        placeholder="ABC-1234"
                                        value={vehiclePlate}
                                        onChange={(e) => setVehiclePlate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Observações</Label>
                                <Input
                                    placeholder="Instruções de entrega..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleCreateDelivery} className="w-full">
                                Agendar
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="p-4">
                <div className="flex gap-4 mb-6">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar por cliente ou nº pedido..."
                            className="pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos os status</SelectItem>
                            <SelectItem value="PENDING">Pendente</SelectItem>
                            <SelectItem value="SCHEDULED">Agendado</SelectItem>
                            <SelectItem value="IN_TRANSIT">Em Trânsito</SelectItem>
                            <SelectItem value="DELIVERED">Entregue</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-4">
                    {filteredDeliveries.map((delivery) => (
                        <div key={delivery.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-lg">
                                            Pedido #{delivery.order.number}
                                        </span>
                                        {getStatusBadge(delivery.status)}
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <MapPin className="h-4 w-4" />
                                        <span>
                                            {delivery.order.customer.address}, {delivery.order.customer.city}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            {delivery.scheduledDate
                                                ? format(new Date(delivery.scheduledDate), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
                                                : 'Data não agendada'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <div className="text-sm text-gray-500 text-right">
                                        {delivery.driverName && (
                                            <div>Motorista: {delivery.driverName}</div>
                                        )}
                                        {delivery.vehiclePlate && (
                                            <div>Placa: {delivery.vehiclePlate}</div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 mt-auto">
                                        {delivery.status === 'SCHEDULED' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-purple-600 border-purple-200 hover:bg-purple-50"
                                                onClick={() => handleUpdateStatus(delivery.id, 'IN_TRANSIT')}
                                            >
                                                <Truck className="h-4 w-4 mr-2" />
                                                Iniciar Entrega
                                            </Button>
                                        )}
                                        {delivery.status === 'IN_TRANSIT' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-green-600 border-green-200 hover:bg-green-50"
                                                onClick={() => handleUpdateStatus(delivery.id, 'DELIVERED')}
                                            >
                                                <CheckCircle className="h-4 w-4 mr-2" />
                                                Concluir
                                            </Button>
                                        )}
                                        {['PENDING', 'SCHEDULED'].includes(delivery.status) && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600 border-red-200 hover:bg-red-50"
                                                onClick={() => handleUpdateStatus(delivery.id, 'CANCELED')}
                                            >
                                                <XCircle className="h-4 w-4 mr-2" />
                                                Cancelar
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredDeliveries.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <Truck className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>Nenhuma entrega encontrada com os filtros atuais</p>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
}
