import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { BrandsService } from '../services/brands.service';
import { CreateBrandDto, UpdateBrandDto } from '../dto/brand.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt.guard';

@Controller('catalogue/brands')
@UseGuards(JwtAuthGuard)
export class BrandsController {
    constructor(private readonly brandsService: BrandsService) { }

    @Post()
    create(@Request() req: any, @Body() createBrandDto: CreateBrandDto) {
        return this.brandsService.create(req.user.clinicId, createBrandDto);
    }

    @Get()
    findAll(@Request() req: any) {
        return this.brandsService.findAll(req.user.clinicId);
    }

    @Get(':id')
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.brandsService.findOne(id, req.user.clinicId);
    }

    @Patch(':id')
    update(@Request() req: any, @Param('id') id: string, @Body() updateBrandDto: UpdateBrandDto) {
        return this.brandsService.update(id, req.user.clinicId, updateBrandDto);
    }

    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.brandsService.remove(id, req.user.clinicId);
    }
}
