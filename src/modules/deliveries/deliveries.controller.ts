import { Controller, Get, Post, Body, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto, UpdateDeliveryDto } from './dto/create-delivery.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';
import { DeliveryStatus } from '@prisma/client';

@Controller('deliveries')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class DeliveriesController {
    constructor(private readonly deliveriesService: DeliveriesService) { }

    @Post()
    @Permissions(PERMISSIONS.DELIVERY_CREATE)
    create(@Request() req: any, @Body() createDto: CreateDeliveryDto) {
        return this.deliveriesService.create(req.clinicId, createDto);
    }

    @Get()
    @Permissions(PERMISSIONS.DELIVERY_READ)
    findAll(@Request() req: any, @Query('status') status?: DeliveryStatus) {
        return this.deliveriesService.findAll(req.clinicId, status);
    }

    @Get(':id')
    @Permissions(PERMISSIONS.DELIVERY_READ)
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.deliveriesService.findOne(id, req.clinicId);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.DELIVERY_UPDATE)
    update(
        @Request() req: any,
        @Param('id') id: string,
        @Body() updateDto: UpdateDeliveryDto
    ) {
        return this.deliveriesService.update(id, req.clinicId, updateDto);
    }
}
