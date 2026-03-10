import { ModuleGuard } from '@/components/auth/module-guard';

export default function ProfessionalsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ModuleGuard module="ADMIN" permissions="PROFESSIONAL_READ">{children}</ModuleGuard>;
}
