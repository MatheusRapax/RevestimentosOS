import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  Body,
  Query,
  BadRequestException,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ProductImportService,
  ImportStrategy,
} from './services/product-import.service';
import { AiImportService } from './services/ai-import.service';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { ImportProductsDto } from './dto/import-products.dto';

@Controller('stock/products/import')
@UseGuards(JwtAuthGuard)
export class ProductImportController {
  constructor(
    private readonly importService: ProductImportService,
    private readonly aiImportService: AiImportService,
    private readonly stockService: StockService,
  ) {}

  @Get('template')
  downloadTemplate(@Res() res: Response) {
    const buffer = this.importService.generateTemplateBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Template_Importacao_Produtos.xlsx"');
    res.send(buffer);
  }

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
    const existingSkusMap = await this.stockService.findExistingProductsData(clinicId, skus);

    const enrichedItems = items.map((item) => ({
      ...item,
      isNew: !existingSkusMap.has(item.sku),
      oldCostCents: existingSkusMap.get(item.sku)?.costCents,
    }));

    return { items: enrichedItems, count: enrichedItems.length };
  }

  @Post('extract-sheets')
  @UseInterceptors(FileInterceptor('file'))
  async extractSheets(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File is required');
    const sheets = this.aiImportService.extractSheetNames(file.buffer);
    return { sheets };
  }

  @Post('ai-map')
  @UseInterceptors(FileInterceptor('file'))
  async aiMapFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('supplierId') supplierId: string,
    @Query('clinicId') queryClinicId: string,
    @Query('targetSheetName') targetSheetName: string | undefined,
    @Body('forceMapping') forceMappingStr: string | undefined,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!supplierId) throw new BadRequestException('supplierId is required for AI mapping');

    const clinicId = queryClinicId || req.user?.clinicId;
    if (!clinicId) throw new BadRequestException('clinicId is required');

    // 1. Flatten the Excel
    const sheetsData = await this.aiImportService.flattenExcelToJSON(file.buffer, targetSheetName);
    if (sheetsData.length === 0) throw new BadRequestException('No valid product sheets found');

    // For simplicity, we process the first valid sheet (which is the targetSheetName if provided)
    const targetSheet = sheetsData[0];
    const headerIdx = this.aiImportService.detectHeaders(targetSheet.rows);
    const { headers, sampleData } = this.aiImportService.buildAISample(targetSheet.rows, headerIdx);

    const headersHash = this.aiImportService.generateHeadersHash(headers);
    let mapping: any = null;
    let ambiguities: string[] = [];

    // 2. Check Force Mapping
    if (forceMappingStr) {
      try {
        mapping = JSON.parse(forceMappingStr);
      } catch (e) {
        throw new BadRequestException('Invalid forceMapping JSON');
      }
      // Since mapping is forced, we assume no ambiguities and we can overwrite cache if needed
      await this.aiImportService.saveCachedMapping(supplierId, clinicId, headersHash, mapping, 1.0);
    } else {
      // 3. Try Cache (TEMPORARILY DISABLED TO FORCE NEW PROMPT)
      // mapping = await this.aiImportService.getCachedMapping(supplierId, clinicId, headersHash);
      mapping = null;

      // 4. Fallback to AI
      if (!mapping) {
        const aiResult = await this.aiImportService.callOpenAIMapping({ headers, sampleData });
        mapping = aiResult.mapping;
        ambiguities = aiResult.ambiguities || [];

        // Save AI "best guess" mapping, even with ambiguities (so user can see preview if they skip resolution)
        if (mapping) {
          await this.aiImportService.saveCachedMapping(supplierId, clinicId, headersHash, mapping, 1.0);
        }
      }
    }

    // 5. Apply Mapping Local
    const rowsOnly = targetSheet.rows.slice(headerIdx + 1);
    const mappedItems = this.aiImportService.applyMapping(rowsOnly, mapping, headers);

    // 6. Apply Business Logic to generate final Preview Items
    const finalItems = this.aiImportService.generateImportResult(mappedItems, []);

    // 7. Enrich with "isNew" flag, "anomalies" and "oldCostCents" for UI preview
    const skus = finalItems.map((i) => i.sku).filter((sku) => sku && sku.trim() !== '');
    const existingProductsMap = await this.stockService.findExistingProductsData(clinicId, skus);

    const hasAmbiguities = ambiguities && ambiguities.length > 0;
    const confidence = hasAmbiguities ? 'MEDIUM' : 'HIGH';
    
    const skuIndicesMap = new Map<string, number[]>();
    finalItems.forEach((item, index) => {
      if (item.sku) {
        if (!skuIndicesMap.has(item.sku)) {
          skuIndicesMap.set(item.sku, []);
        }
        skuIndicesMap.get(item.sku)!.push(index);
      }
    });

    const enrichedItems = finalItems.map((item, index) => {
      let isNew = true;
      let oldCostCents: number | undefined = undefined;
      const existingData = existingProductsMap.get(item.sku);
      if (existingData) {
        isNew = false;
        oldCostCents = existingData.costCents;
      }

      const anomalies = [];
      
      // Check duplicates
      if (item.sku) {
        const indices = skuIndicesMap.get(item.sku);
        if (indices && indices.length > 1) {
          anomalies.push({
             type: 'DUPLICATE_SKU',
             relatedIndices: indices.filter(i => i !== index)
          });
        }
      }
      
      // Price anomaly check (> 50%)
      if (!isNew && oldCostCents !== undefined && oldCostCents > 0) {
        const diff = Math.abs(item.costCents - oldCostCents);
        const percentChange = (diff / oldCostCents) * 100;
        if (percentChange > 50) {
          anomalies.push({ type: 'PRICE_VARIATION' });
        }
      }

      return {
        ...item,
        isNew,
        oldCostCents,
        confidence: (item as any).confidence || confidence,
        anomalies,
      };
    });

    return {
      mapping,
      ambiguities,
      headers,
      sampleData,
      items: enrichedItems,
      count: enrichedItems.length
    };
  }

  @Post('ai-classify')
  async aiClassifyItems(
    @Body() body: { items: any[] },
    @Req() req: any,
  ) {
    if (!body.items || !Array.isArray(body.items)) {
      throw new BadRequestException('items array is required');
    }

    // Na versão final, isso chamaria a OpenAI para itens ambíguos.
    // Como a POC atual usa inferência estática baseada em m2PerBox > 0
    // este endpoint servirá como ponte para classificação linha-a-linha no futuro.
    const classified = await this.aiImportService.callOpenAIClassify(body.items);
    
    return { classified };
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
      // Use explicit brandName if provided, otherwise fallback to strategy if it's not STANDARD
      const brandToSave = dto.brandName || (dto.strategy !== 'STANDARD' ? dto.strategy : undefined);

      const saved = await this.stockService.importParsedProducts(
        clinicId,
        dto.items,
        dto.supplierId,
        brandToSave,
        req.user?.id,
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
