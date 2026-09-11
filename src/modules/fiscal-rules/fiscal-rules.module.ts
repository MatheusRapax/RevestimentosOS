import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CfopResolverService } from './services/cfop-resolver.service';
import { TaxCalculatorService } from './services/tax-calculator.service';

/**
 * Motor de regras fiscais (Fase 1 + 0.4 do plano): resolução de CFOP e
 * cálculo de ICMS/ICMS-ST/FCP/DIFAL/PIS/COFINS/IPI a partir das tabelas
 * RegraIcms/RegraPisCofins/RegraIpi. Consumido pelo FiscalModule.
 */
@Module({
  imports: [PrismaModule],
  providers: [CfopResolverService, TaxCalculatorService],
  exports: [CfopResolverService, TaxCalculatorService],
})
export class FiscalRulesModule {}
