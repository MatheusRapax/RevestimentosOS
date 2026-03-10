import { ModuleGuard } from '@/components/auth/module-guard';

export default function ProcedimentosLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ModuleGuard module="ADMIN" permissions="procedure.read">{children}</ModuleGuard>;
}
