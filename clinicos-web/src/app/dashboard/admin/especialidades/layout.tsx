import { ModuleGuard } from '@/components/auth/module-guard';

export default function EspecialidadesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ModuleGuard module="ADMIN" permissions="specialty.read">{children}</ModuleGuard>;
}
