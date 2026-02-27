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
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('promotions')
export class PromotionsController {
    constructor(private readonly promotionsService: PromotionsService) { }

    @Permissions(PERMISSIONS.PROMOTION_CREATE)
    @Post()
    create(@Request() req: any, @Body() createPromotionDto: CreatePromotionDto) {
        return this.promotionsService.create(req.user.clinicId, createPromotionDto);
    }

    @Permissions(PERMISSIONS.PROMOTION_READ)
    @Get('active')
    findActive(@Request() req: any) {
        return this.promotionsService.findActive(req.user.clinicId);
    }

    @Permissions(PERMISSIONS.PROMOTION_READ)
    @Get()
    findAll(@Request() req: any) {
        return this.promotionsService.findAll(req.user.clinicId);
    }

    @Permissions(PERMISSIONS.PROMOTION_READ)
    @Get(':id')
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.promotionsService.findOne(req.user.clinicId, id);
    }

    @Permissions(PERMISSIONS.PROMOTION_UPDATE)
    @Patch(':id')
    update(
        @Request() req: any,
        @Param('id') id: string,
        @Body() updatePromotionDto: UpdatePromotionDto,
    ) {
        return this.promotionsService.update(req.user.clinicId, id, updatePromotionDto);
    }

    @Permissions(PERMISSIONS.PROMOTION_DELETE)
    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.promotionsService.remove(req.user.clinicId, id);
    }
}
