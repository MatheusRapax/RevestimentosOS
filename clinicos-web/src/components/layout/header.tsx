'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Header() {
    const { user, activeClinic, logout } = useAuth();
    const router = useRouter();

    const clinic = user?.clinics.find(c => c.id === activeClinic);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    return (
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
            <div>
                <h2 className="text-xl font-semibold text-gray-900">Dashboard</h2>
            </div>

            <div className="flex items-center gap-6">
                {clinic && (
                    <div className="text-sm">
                        <span className="text-gray-500">Loja:</span>
                        <span className="ml-2 font-medium text-gray-900">{clinic.name}</span>
                    </div>
                )}

                <div className="text-sm text-right">
                    <div className="font-medium text-gray-900">{user?.name}</div>
                    <div className="text-gray-500">{user?.email}</div>
                </div>

                <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                </Button>
            </div>
        </header>
    );
}
