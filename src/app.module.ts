import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './core/auth/auth.module';
import { TenantModule } from './core/tenant/tenant.module';
import { RbacModule } from './core/rbac/rbac.module';
import { AuditModule } from './core/audit/audit.module';
import { ClinicsModule } from './modules/clinics/clinics.module';
import { PatientsModule } from './modules/patients/patients.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { EncountersModule } from './modules/encounters/encounters.module';
import { EncounterItemsModule } from './modules/encounter-items/encounter-items.module';
import { StockModule } from './modules/stock/stock.module';
import { ProfessionalsModule } from './modules/professionals/professionals.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NoticesModule } from './modules/notices/notices.module';
import { SpecialtiesModule } from './modules/specialties/specialties.module';
import { RolesModule } from './modules/roles/roles.module';
import { ProceduresModule } from './modules/procedures/procedures.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
// Sales Module - Revestimentos
import { CustomersModule } from './modules/customers/customers.module';
import { ArchitectsModule } from './modules/architects/architects.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';

@Module({
    imports: [
        PrismaModule,
        TenantModule,
        RbacModule,
        AuditModule,
        HealthModule,
        AuthModule,
        ClinicsModule,
        PatientsModule,
        SchedulingModule,
        EncountersModule,
        EncounterItemsModule,
        StockModule,
        ProfessionalsModule,
        DashboardModule,
        NoticesModule,
        SpecialtiesModule,
        RolesModule,
        ProceduresModule,
        FinanceModule,
        ExpensesModule,
        // Sales Module - Revestimentos
        CustomersModule,
        ArchitectsModule,
        QuotesModule,
        DeliveriesModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule { }

