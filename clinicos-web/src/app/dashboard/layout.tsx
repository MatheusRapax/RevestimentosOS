'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, activeClinic, isLoading, setActiveClinic } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-lg">Carregando...</div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    // Show clinic selector if user has multiple clinics and none selected
    if (user.clinics && user.clinics.length > 1 && !activeClinic) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <div className="w-full max-w-md space-y-4 rounded-lg bg-white p-8 shadow-lg">
                    <h2 className="text-2xl font-bold text-gray-900">Selecione uma clínica</h2>
                    <p className="text-gray-600">Escolha a clínica para acessar o sistema</p>
                    <div className="space-y-2">
                        {user.clinics.map((clinic) => (
                            <button
                                key={clinic.id}
                                onClick={() => {
                                    console.log('Clinic selected:', clinic);
                                    setActiveClinic(clinic.id);
                                    console.log('Reloading page...');
                                    // Force reload to ensure state is updated
                                    window.location.reload();
                                }}
                                className="w-full rounded-md border border-gray-300 p-4 text-left hover:bg-gray-50 hover:border-blue-500 transition"
                            >
                                <div className="font-medium text-gray-900">{clinic.name}</div>
                                <div className="text-sm text-gray-500">{clinic.slug}</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // If user has only one clinic and no active clinic, set it automatically
    if (user.clinics && user.clinics.length === 1 && !activeClinic) {
        setActiveClinic(user.clinics[0].id);
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-lg">Configurando clínica...</div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
