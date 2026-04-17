import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Query,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ProductImportService,
  ImportStrategy,
} from './services/product-import.service';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { ImportProductsDto } from './dto/import-products.dto';

@Controller('stock/products/import')
@UseGuards(JwtAuthGuard)
export class ProductImportController {
  constructor(
    private readonly importService: ProductImportService,
    private readonly stockService: StockService,
  ) {}

  @Post('parse')
  @UseInterceptors(FileInterceptor('file'))
  async parseFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('strategy') strategy: ImportStrategy,
    @Query('clinicId') queryClinicId: string,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('File is required');

    const clinicId = queryClinicId || req.user?.clinicId;
    if (!clinicId) {
      throw new BadRequestException('clinicId é obrigatório para visualização da importação');
    }

    const items = this.importService.processFile(file.buffer, strategy);
    
    // Identificar itens novos vs atualizações
    const skus = items.map((i) => i.sku).filter((sku) => sku && sku.trim() !== '');
    const existingSkusSet = await this.stockService.findExistingProductSkus(clinicId, skus);

    const enrichedItems = items.map((item) => ({
      ...item,
      isNew: !existingSkusSet.has(item.sku),
    }));

    return { items: enrichedItems, count: enrichedItems.length };
  }

  @Post('execute')
  async executeImport(@Body() dto: ImportProductsDto, @Req() req: any) {
    try {
      // req.user provided by JwtAuthGuard
      // Super admins don't have clinicId in JWT, so use DTO's clinicId
      const clinicId = dto.clinicId || req.user.clinicId;

      if (!clinicId) {
        throw new BadRequestException('clinicId é obrigatório para importação');
      }

      // Use the existing logic in StockService
      const saved = await this.stockService.importParsedProducts(
        clinicId,
        dto.items,
        dto.supplierId,
        dto.strategy,
      );

      return { success: true, count: saved.count };
    } catch (error) {
      console.error('❌ Import Execution Error:', error);
      throw new BadRequestException(
        error.message || 'Falha ao processar importação',
      );
    }
  }
}
