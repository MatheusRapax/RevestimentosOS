
import { Body, Controller, Get, Param, Post, Put, UseGuards, Query } from '@nestjs/common';
import { FiscalService } from '../services/fiscal.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt.guard';
import { PermissionsGuard } from '../../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../core/rbac/permissions';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { UpdateFiscalSettingsDto } from '../dto/update-fiscal-settings.dto';
import { Public } from '../../../core/auth/decorators/public.decorator';

@Controller('fiscal')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FiscalController {
    constructor(private readonly fiscalService: FiscalService) { }

    @Post('emit/:orderId')
    @Permissions(PERMISSIONS.FISCAL_EMIT)
    async emitirNota(
        @Param('orderId') orderId: string,
        @CurrentUser() user: any,
    ) {
        return this.fiscalService.emitirNota(orderId, user.clinicId);
    }

    @Get('settings')
    @Permissions(PERMISSIONS.FISCAL_CONFIG)
    async getSettings(
        @CurrentUser() user: any,
        @Query('clinicId') clinicId?: string,
    ) {
        const targetClinicId = (user.isSuperAdmin && clinicId) ? clinicId : user.clinicId;
        return this.fiscalService.getSettings(targetClinicId);
    }

    @Put('settings')
    @Permissions(PERMISSIONS.FISCAL_CONFIG)
    async updateSettings(
        @Body() dto: UpdateFiscalSettingsDto,
        @CurrentUser() user: any,
        @Query('clinicId') clinicId?: string,
    ) {
        const targetClinicId = (user.isSuperAdmin && clinicId) ? clinicId : user.clinicId;
        return this.fiscalService.updateSettings(targetClinicId, dto);
    }

    @Public()
    @Post('webhook')
    async handleWebhook(@Body() payload: any) {
        return this.fiscalService.handleWebhook(payload);
    }
}
