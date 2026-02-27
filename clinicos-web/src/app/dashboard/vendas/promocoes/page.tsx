'use client';

import { useState } from 'react';
import { usePromotions } from '@/hooks/usePromotions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Tag, Calendar, MoreVertical, Edit2, Trash2, Percent } from 'lucide-react';
import Link from 'next/link';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PromocoesPage() {
    const { promotions, isLoading, togglePromotionStatus, deletePromotion } = usePromotions();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredPromotions = promotions?.filter((promo) =>
        promo.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Percent className="w-6 h-6 text-blue-500" />
                        Campanhas Promocionais
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Gerencie as promoções ativas no catálogo de produtos.
                    </p>
                </div>
                <Link href="/dashboard/vendas/promocoes/nova">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Campanha
                    </Button>
                </Link>
            </div>

            <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                <Search className="w-5 h-5 text-gray-400 ml-2" />
                <Input
                    type="text"
                    placeholder="Pesquisar promoções por nome..."
                    className="border-0 focus-visible:ring-0 bg-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {isLoading ? (
                <div className="text-center py-10">Carregando campanhas...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPromotions?.map((promo) => {
                        const now = new Date();
                        const start = new Date(promo.startDate);
                        const end = new Date(promo.endDate);
                        const isOngoing = start <= now && end >= now;

                        return (
                            <div
                                key={promo.id}
                                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                                {promo.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {promo.discountPercent}% OFF
                                                </span>
                                                {promo.isActive ? (
                                                    isOngoing ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                            Em andamento
                                                        </span>
                                                    ) : start > now ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                            Agendada
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                                            Encerrada
                                                        </span>
                                                    )
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                        Pausada
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="-mr-2">
                                                    <MoreVertical className="w-4 h-4 text-gray-500" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => {
                                                    if (confirm('Tem certeza que deseja excluir esta campanha?')) {
                                                        deletePromotion(promo.id);
                                                    }
                                                }} className="text-red-500">
                                                    <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">
                                        {promo.description || 'Sem descrição.'}
                                    </p>

                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Calendar className="w-4 h-4" />
                                        <span>
                                            {format(start, "dd 'de' MMM", { locale: ptBR })} - {format(end, "dd 'de' MMM, yyyy", { locale: ptBR })}
                                        </span>
                                    </div>
                                </div>

                                <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
                                    <div className="text-sm text-gray-500">
                                        <span className="font-medium text-gray-900 dark:text-white">{promo.products?.length || 0}</span> produtos
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">Ativa</span>
                                        <Switch
                                            checked={promo.isActive}
                                            onCheckedChange={(checked) => togglePromotionStatus({ id: promo.id, isActive: checked })}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {filteredPromotions?.length === 0 && (
                        <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            <Percent className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhuma promoção encontrada</h3>
                            <p className="text-gray-500 mt-1">Crie sua primeira campanha para impulsionar as vendas.</p>
                            <Link href="/dashboard/vendas/promocoes/nova">
                                <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Criar Campanha
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
