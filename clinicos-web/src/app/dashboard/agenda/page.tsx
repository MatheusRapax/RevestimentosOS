'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Settings, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DayData {
    date: string;
    appointmentCount: number;
    hasBlocks: boolean;
}

interface AppointmentSummary {
    date: string;
    count: number;
}

interface WorkingHours {
    dayOfWeek: number;
    isOpen: boolean;
    startTime: string | null;
    endTime: string | null;
}

export default function AgendaPage() {
    const router = useRouter();
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() };
    });
    const [appointmentCounts, setAppointmentCounts] = useState<Record<string, number>>({});
    const [blocks, setBlocks] = useState<Record<string, boolean>>({});
    const [closedDays, setClosedDays] = useState<Set<number>>(new Set()); // dayOfWeek (0-6)
    const [isLoading, setIsLoading] = useState(true);

    // Generate calendar days for current month
    const calendarDays = useMemo(() => {
        const { year, month } = currentMonth;
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay(); // 0 = Sunday
        const daysInMonth = lastDay.getDate();

        const days: { date: Date; isCurrentMonth: boolean }[] = [];

        // Previous month padding
        for (let i = startPadding - 1; i >= 0; i--) {
            const date = new Date(year, month, -i);
            days.push({ date, isCurrentMonth: false });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            days.push({ date, isCurrentMonth: true });
        }

        // Next month padding to complete last week
        const remaining = 7 - (days.length % 7);
        if (remaining < 7) {
            for (let i = 1; i <= remaining; i++) {
                const date = new Date(year, month + 1, i);
                days.push({ date, isCurrentMonth: false });
            }
        }

        return days;
    }, [currentMonth]);

    // Format date as YYYY-MM-DD
    const formatDate = (date: Date) => {
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    };

    // Fetch appointments count for the month
    const fetchMonthData = async () => {
        try {
            setIsLoading(true);
            const { year, month } = currentMonth;
            const startDate = formatDate(new Date(year, month, 1));
            const endDate = formatDate(new Date(year, month + 1, 0));

            const [appointmentsRes, blocksRes, workingHoursRes] = await Promise.all([
                api.get('/appointments', { params: { startDate, endDate } }),
                api.get('/appointments/blocks', { params: { startDate, endDate } }),
                api.get('/appointments/working-hours'),
            ]);

            // Count appointments per day
            const counts: Record<string, number> = {};
            appointmentsRes.data.forEach((apt: any) => {
                const date = apt.startAt.split('T')[0];
                counts[date] = (counts[date] || 0) + 1;
            });
            setAppointmentCounts(counts);

            // Track blocked days
            const blockedDays: Record<string, boolean> = {};
            blocksRes.data.forEach((block: any) => {
                if (!block.startTime && !block.endTime) {
                    blockedDays[block.date] = true;
                }
            });
            setBlocks(blockedDays);

            // Track closed days by dayOfWeek
            const closed = new Set<number>();
            workingHoursRes.data.forEach((wh: WorkingHours) => {
                if (!wh.isOpen) {
                    closed.add(wh.dayOfWeek);
                }
            });
            setClosedDays(closed);
        } catch (err) {
            console.error('Error fetching month data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMonthData();
    }, [currentMonth]);

    // Navigation
    const goToPrevMonth = () => {
        setCurrentMonth((prev) => {
            const newMonth = prev.month - 1;
            return newMonth < 0
                ? { year: prev.year - 1, month: 11 }
                : { year: prev.year, month: newMonth };
        });
    };

    const goToNextMonth = () => {
        setCurrentMonth((prev) => {
            const newMonth = prev.month + 1;
            return newMonth > 11
                ? { year: prev.year + 1, month: 0 }
                : { year: prev.year, month: newMonth };
        });
    };

    const goToToday = () => {
        const now = new Date();
        setCurrentMonth({ year: now.getFullYear(), month: now.getMonth() });
    };

    // Click on a day
    const handleDayClick = (date: Date) => {
        const dateStr = formatDate(date);
        router.push(`/dashboard/agenda/${dateStr}`);
    };

    // Format month name
    const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
    });

    const isToday = (date: Date) => {
        const today = new Date();
        return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
        );
    };

    // Weekend check (optional - for visual distinction)
    const isWeekend = (date: Date) => {
        const day = date.getDay();
        return day === 0 || day === 6;
    };

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
                    <p className="text-gray-500 capitalize">{monthName}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={goToPrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={goToToday}>
                        Hoje
                    </Button>
                    <Button variant="outline" size="icon" onClick={goToNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => router.push('/dashboard/agenda/configuracoes')}
                        title="Configurações"
                    >
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <Card className="p-4">
                {/* Week headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekDays.map((day, i) => (
                        <div
                            key={day}
                            className={`text-center text-sm font-medium py-2 ${i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-600'
                                }`}
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map(({ date, isCurrentMonth }, index) => {
                        const dateStr = formatDate(date);
                        const count = appointmentCounts[dateStr] || 0;
                        const isBlocked = blocks[dateStr];
                        const isClosed = closedDays.has(date.getDay()); // Check if this dayOfWeek is closed
                        const todayClass = isToday(date);
                        const weekendClass = isWeekend(date);

                        return (
                            <div
                                key={index}
                                onClick={() => isCurrentMonth && handleDayClick(date)}
                                className={`
                                    relative min-h-[80px] p-2 rounded-lg border transition-all
                                    ${isCurrentMonth ? 'cursor-pointer hover:border-blue-300 hover:bg-blue-50/50' : 'cursor-default'}
                                    ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                                    ${todayClass ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                                    ${isBlocked ? 'bg-gray-200' : ''}
                                    ${isClosed && isCurrentMonth && !isBlocked && !todayClass ? 'bg-gray-100' : ''}
                                    ${weekendClass && isCurrentMonth && !isBlocked && !isClosed ? 'bg-gray-50/50' : ''}
                                `}
                            >
                                {/* Day number */}
                                <span
                                    className={`
                                        text-sm font-medium
                                        ${todayClass ? 'bg-blue-600 text-white px-2 py-0.5 rounded-full' : ''}
                                        ${!isCurrentMonth ? 'text-gray-400' : ''}
                                    `}
                                >
                                    {date.getDate()}
                                </span>

                                {/* Block indicator */}
                                {isBlocked && (
                                    <div className="absolute top-2 right-2">
                                        <Lock className="h-3 w-3 text-gray-500" />
                                    </div>
                                )}

                                {/* Appointments indicator */}
                                {count > 0 && isCurrentMonth && (
                                    <div className="mt-2">
                                        <div className="flex flex-wrap gap-1">
                                            {count <= 3 ? (
                                                Array.from({ length: count }).map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-2 h-2 rounded-full bg-blue-500"
                                                    />
                                                ))
                                            ) : (
                                                <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                                    {count} agendamentos
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span>Agendamento</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-500 bg-blue-50 rounded"></div>
                    <span>Hoje</span>
                </div>
                <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-gray-500" />
                    <span>Bloqueado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                    <span>Fechado</span>
                </div>
            </div>
        </div>
    );
}
