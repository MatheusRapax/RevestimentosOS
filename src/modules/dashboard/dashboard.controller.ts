import {
    Controller,
    Get,
    Put,
    Body,
    UseGuards,
    Request,
    Query,
} from '@nestjs/common';
import { DashboardService, WIDGET_TYPES } from './dashboard.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';

interface AuthRequest {
    user: { id: string; email: string };
    clinicId: string;
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DashboardController {
    constructor(private dashboardService: DashboardService) { }

    // Get available widget types
    @Get('widget-types')
    getWidgetTypes() {
        return WIDGET_TYPES;
    }

    // Get user's dashboard config
    @Get('config')
    async getConfig(@Request() req: AuthRequest) {
        return this.dashboardService.getConfig(req.user.id, req.clinicId);
    }

    // Save user's dashboard config
    @Put('config')
    async saveConfig(
        @Request() req: AuthRequest,
        @Body() body: { widgets: string[] },
    ) {
        return this.dashboardService.saveConfig(
            req.user.id,
            req.clinicId,
            body.widgets,
        );
    }

    // Widget data endpoints
    @Get('widgets/birthdays')
    async getBirthdays(@Request() req: AuthRequest) {
        return this.dashboardService.getBirthdays(req.clinicId);
    }

    @Get('widgets/today-appointments')
    async getTodayAppointments(@Request() req: AuthRequest) {
        return this.dashboardService.getTodayAppointments(req.clinicId);
    }

    @Get('widgets/stock-alerts')
    async getStockAlerts(@Request() req: AuthRequest) {
        return this.dashboardService.getStockAlerts(req.clinicId);
    }

    @Get('widgets/notices')
    async getNotices(@Request() req: AuthRequest) {
        return this.dashboardService.getNotices(req.clinicId);
    }

    @Get('widgets/open-encounters')
    async getOpenEncounters(@Request() req: AuthRequest) {
        return this.dashboardService.getOpenEncounters(req.clinicId);
    }

    @Get('widgets/upcoming-expirations')
    async getUpcomingExpirations(@Request() req: AuthRequest) {
        return this.dashboardService.getUpcomingExpirations(req.clinicId);
    }

    // ====================================================================
    // FINANCIAL REPORTS ENDPOINTS
    // ====================================================================
    @Get('finance/sellers')
    async getSellersPerformance(
        @Request() req: AuthRequest,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.dashboardService.getSellersPerformance(req.clinicId, startDate, endDate);
    }

    @Get('finance/architects')
    async getArchitectsPerformance(
        @Request() req: AuthRequest,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return this.dashboardService.getArchitectsPerformance(req.clinicId, startDate, endDate);
    }
}
