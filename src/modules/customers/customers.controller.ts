import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ListCustomerDto } from './dto/list-customer.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

@Controller('customers')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class CustomersController {
    constructor(private readonly customersService: CustomersService) { }

    @Post()
    @Permissions(PERMISSIONS.CUSTOMER_CREATE)
    create(@Request() req: any, @Body() createCustomerDto: CreateCustomerDto) {
        return this.customersService.create(req.clinicId, createCustomerDto);
    }

    @Get()
    @Permissions(PERMISSIONS.CUSTOMER_READ)
    findAll(@Request() req: any, @Query() filters: ListCustomerDto) {
        return this.customersService.findAll(req.clinicId, filters);
    }

    @Get(':id')
    @Permissions(PERMISSIONS.CUSTOMER_READ)
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.customersService.findOne(id, req.clinicId);
    }

    @Get(':id/summary')
    @Permissions(PERMISSIONS.CUSTOMER_READ)
    getSummary(@Request() req: any, @Param('id') id: string) {
        return this.customersService.getCustomerSummary(id, req.clinicId);
    }

    @Patch(':id')
    @Permissions(PERMISSIONS.CUSTOMER_UPDATE)
    update(
        @Request() req: any,
        @Param('id') id: string,
        @Body() updateCustomerDto: UpdateCustomerDto,
    ) {
        return this.customersService.update(id, req.clinicId, updateCustomerDto);
    }

    @Delete(':id')
    @Permissions(PERMISSIONS.CUSTOMER_DELETE)
    remove(@Request() req: any, @Param('id') id: string) {
        return this.customersService.softDelete(id, req.clinicId);
    }
}
