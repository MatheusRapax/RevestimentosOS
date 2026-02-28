import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StoreSettingsService } from './store-settings.service';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { ModuleGuard } from '../../core/auth/guards/module.guard';
import { RequireModules } from '../../core/auth/decorators/module.decorator';

interface AuthRequest extends Request {
  clinicId: string;
}

@Controller('settings')
@UseGuards(JwtAuthGuard, TenantGuard, ModuleGuard)
@RequireModules('ADMIN') // Assuming only admins should edit store-wide settings
export class StoreSettingsController {
  constructor(private readonly storeSettingsService: StoreSettingsService) {}

  @Get()
  async getSettings(@Request() req: AuthRequest) {
    return this.storeSettingsService.getSettings(req.clinicId);
  }

  @Patch()
  async updateSettings(
    @Request() req: AuthRequest,
    @Body() updateStoreSettingsDto: UpdateStoreSettingsDto,
  ) {
    return this.storeSettingsService.updateSettings(
      req.clinicId,
      updateStoreSettingsDto,
    );
  }
}
