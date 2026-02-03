export default function AdminPage() {
    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard Geral</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-slate-500">Total de Lojas</h3>
                    </div>
                    <div className="text-2xl font-bold">--</div>
                    <p className="text-xs text-slate-500 mt-1">+1 essa semana</p>
                </div>

                <div className="rounded-xl border bg-white p-6 shadow-sm">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium text-slate-500">Usuários Totais</h3>
                    </div>
                    <div className="text-2xl font-bold">--</div>
                    <p className="text-xs text-slate-500 mt-1">+5 essa semana</p>
                </div>
            </div>
        </div>
    );
}
