import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Request,
} from '@nestjs/common';
import { QuoteTemplatesService } from './quote-templates.service';
import { CreateQuoteTemplateDto, UpdateQuoteTemplateDto } from './dto/quote-template.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

@Controller('quotes/templates')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class QuoteTemplatesController {
    constructor(private readonly templatesService: QuoteTemplatesService) { }

    @Get()
    @Permissions(PERMISSIONS.QUOTE_READ)
    findAll(@Request() req: any) {
        return this.templatesService.findAll(req.clinicId);
    }

    @Get('default')
    @Permissions(PERMISSIONS.QUOTE_READ)
    findDefault(@Request() req: any) {
        return this.templatesService.findDefault(req.clinicId);
    }

    @Get(':id')
    @Permissions(PERMISSIONS.QUOTE_READ)
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.templatesService.findOne(id, req.clinicId);
    }

    @Post()
    @Permissions(PERMISSIONS.CLINIC_SETTINGS_MANAGE)
    create(@Request() req: any, @Body() dto: CreateQuoteTemplateDto) {
        return this.templatesService.create(req.clinicId, dto);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.CLINIC_SETTINGS_MANAGE)
    update(
        @Request() req: any,
        @Param('id') id: string,
        @Body() dto: UpdateQuoteTemplateDto,
    ) {
        return this.templatesService.update(id, req.clinicId, dto);
    }

    @Post(':id/set-default')
    @Permissions(PERMISSIONS.CLINIC_SETTINGS_MANAGE)
    setDefault(@Request() req: any, @Param('id') id: string) {
        return this.templatesService.setDefault(id, req.clinicId);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.CLINIC_SETTINGS_MANAGE)
    remove(@Request() req: any, @Param('id') id: string) {
        return this.templatesService.remove(id, req.clinicId);
    }
}
