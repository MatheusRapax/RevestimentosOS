import { Module } from '@nestjs/common';
import { CategoriesService } from './services/categories.service';
import { BrandsService } from './services/brands.service';
import { PricingService } from './services/pricing.service';
import { CategoriesController } from './controllers/categories.controller';
import { BrandsController } from './controllers/brands.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CategoriesController, BrandsController],
    providers: [CategoriesService, BrandsService, PricingService],
    exports: [PricingService, CategoriesService, BrandsService],
})
export class CatalogueModule { }
