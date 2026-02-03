'use client';

import { ModuleGuard } from '@/components/auth/module-guard';

export default function Layout({ children }: { children: React.ReactNode }) {
    return <ModuleGuard module="DELIVERIES">{children}</ModuleGuard>;
}
