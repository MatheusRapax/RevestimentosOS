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
import { StockService } from './stock.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { RemoveStockDto } from './dto/remove-stock.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { ListStockMovementsDto } from './dto/list-stock-movements.dto';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions';

@Controller('stock')
@UseGuards(JwtAuthGuard, TenantGuard)
export class StockController {
    constructor(private readonly stockService: StockService) { }

    // ========== BASIC CRUD (for frontend) ==========

    @Get()
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_READ)
    findAll(@Request() req: any) {
        return this.stockService.listProducts(req.clinicId, {});
    }

    @Post()
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_CREATE)
    create(@Body() createDto: any, @Request() req: any) {
        return this.stockService.createProduct(req.clinicId, createDto);
    }

    @Patch(':id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_UPDATE)
    update(@Param('id') id: string, @Body() updateDto: any, @Request() req: any) {
        return this.stockService.updateProduct(id, req.clinicId, updateDto);
    }

    @Delete(':id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_UPDATE)
    remove(@Param('id') id: string, @Request() req: any) {
        return this.stockService.softDeleteProduct(id, req.clinicId);
    }

    // ========== PRODUCTS ==========

    @Post('products')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_CREATE)
    createProduct(@Body() createProductDto: CreateProductDto, @Request() req: any) {
        return this.stockService.createProduct(req.clinicId, createProductDto);
    }

    @Get('products')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_READ)
    listProducts(@Query() query: ListProductsDto, @Request() req: any) {
        return this.stockService.listProducts(req.clinicId, query);
    }

    @Get('products/:id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_READ)
    getProduct(@Param('id') id: string, @Request() req: any) {
        return this.stockService.findOne(id, req.clinicId);
    }

    @Patch('products/:id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_UPDATE)
    updateProduct(
        @Param('id') id: string,
        @Body() updateProductDto: UpdateProductDto,
        @Request() req: any,
    ) {
        return this.stockService.updateProduct(id, req.clinicId, updateProductDto);
    }

    @Delete('products/:id')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_UPDATE)
    deleteProduct(@Param('id') id: string, @Request() req: any) {
        return this.stockService.softDeleteProduct(id, req.clinicId);
    }

    // ========== STOCK OPERATIONS ==========

    @Post('stock/in')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_CREATE)
    addStock(@Body() addStockDto: AddStockDto, @Request() req: any) {
        return this.stockService.addStock(req.clinicId, addStockDto);
    }

    @Post('stock/out')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_UPDATE)
    removeStock(@Body() removeStockDto: RemoveStockDto, @Request() req: any) {
        return this.stockService.removeStock(req.clinicId, removeStockDto);
    }

    @Post('adjust')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_UPDATE)
    adjustStock(@Body() adjustDto: AdjustStockDto, @Request() req: any) {
        return this.stockService.adjustStock(req.clinicId, adjustDto);
    }

    @Get('movements')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_READ)
    listMovements(@Query() query: ListStockMovementsDto, @Request() req: any) {
        return this.stockService.listMovements(req.clinicId, query);
    }

    @Get('stock/product/:productId')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_READ)
    getProductStock(@Param('productId') productId: string, @Request() req: any) {
        return this.stockService.getProductStock(productId, req.clinicId);
    }

    // ========== ALERTS ==========

    @Get('stock/alerts')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_READ)
    async getAlerts(@Request() req: any) {
        const [lowStock, expiring, shadeCaliberAlerts] = await Promise.all([
            this.stockService.getLowStockAlerts(req.clinicId),
            this.stockService.getExpiringLots(req.clinicId, 30),
            this.stockService.getShadeCaliberAlerts(req.clinicId),
        ]);

        return {
            lowStock,
            expiring,
            shadeCaliberAlerts,
        };
    }

    // ========== BULK OPERATIONS ==========

    @Post('products/import')
    @UseGuards(PermissionsGuard)
    @Permissions(PERMISSIONS.STOCK_CREATE)
    async bulkImportProducts(@Body() body: { products: any[] }, @Request() req: any) {
        return this.stockService.bulkImportProducts(req.clinicId, body.products);
    }
}
