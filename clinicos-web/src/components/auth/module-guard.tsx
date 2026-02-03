'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ModuleGuardProps {
    module: string;
    children: React.ReactNode;
}

export function ModuleGuard({ module, children }: ModuleGuardProps) {
    const { user, activeClinic: activeClinicId, isLoading } = useAuth();
    const router = useRouter();

    const activeClinic = user?.clinics.find(c => c.id === activeClinicId);

    useEffect(() => {
        if (!isLoading && activeClinicId) {
            if (activeClinic) {
                const hasModule = activeClinic.modules?.includes(module);
                if (!hasModule) {
                    router.push('/dashboard');
                }
            }
        }
    }, [activeClinic, activeClinicId, isLoading, module, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!activeClinicId || !activeClinic) return null;

    const hasModule = activeClinic.modules?.includes(module);

    if (!hasModule) {
        return null; // Don't render anything while redirecting
    }

    return <>{children}</>;
}
