import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';

interface AuthRequest extends Request {
    clinicId: string;
}

@Controller('suppliers')
@UseGuards(JwtAuthGuard, TenantGuard)
export class SuppliersController {
    constructor(private readonly suppliersService: SuppliersService) { }

    @Get()
    async findAll(
        @Request() req: AuthRequest,
        @Query('isActive') isActive?: string,
    ) {
        const filters: { isActive?: boolean } = {};
        if (isActive !== undefined) {
            filters.isActive = isActive === 'true';
        }
        return this.suppliersService.findAll(req.clinicId, filters);
    }

    @Get(':id')
    async findOne(@Request() req: AuthRequest, @Param('id') id: string) {
        return this.suppliersService.findOne(req.clinicId, id);
    }

    @Post()
    async create(
        @Request() req: AuthRequest,
        @Body() body: {
            name: string;
            cnpj?: string;
            email?: string;
            phone?: string;
            address?: string;
            city?: string;
            state?: string;
            notes?: string;
        },
    ) {
        return this.suppliersService.create(req.clinicId, body);
    }

    @Patch(':id')
    async update(
        @Request() req: AuthRequest,
        @Param('id') id: string,
        @Body() body: {
            name?: string;
            cnpj?: string;
            email?: string;
            phone?: string;
            address?: string;
            city?: string;
            state?: string;
            notes?: string;
            isActive?: boolean;
        },
    ) {
        return this.suppliersService.update(req.clinicId, id, body);
    }

    @Delete(':id')
    async delete(@Request() req: AuthRequest, @Param('id') id: string) {
        return this.suppliersService.delete(req.clinicId, id);
    }
}
