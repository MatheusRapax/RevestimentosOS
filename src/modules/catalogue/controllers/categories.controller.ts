import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt.guard';

@Controller('catalogue/categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Post()
    create(@Request() req: any, @Body() createCategoryDto: CreateCategoryDto) {
        return this.categoriesService.create(req.user.clinicId, createCategoryDto);
    }

    @Get()
    findAll(@Request() req: any) {
        return this.categoriesService.findAll(req.user.clinicId);
    }

    @Get(':id')
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.categoriesService.findOne(id, req.user.clinicId);
    }

    @Patch(':id')
    update(@Request() req: any, @Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
        return this.categoriesService.update(id, req.user.clinicId, updateCategoryDto);
    }

    @Delete(':id')
    remove(@Request() req: any, @Param('id') id: string) {
        return this.categoriesService.remove(id, req.user.clinicId);
    }
}
