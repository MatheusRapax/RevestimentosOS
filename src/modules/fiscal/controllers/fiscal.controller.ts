import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  Logger,
  Query,
  Req,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { FiscalService } from '../services/fiscal.service';
import { FiscalReconciliationService } from '../services/fiscal-reconciliation.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../core/rbac/permissions';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { UpdateFiscalSettingsDto } from '../dto/update-fiscal-settings.dto';
import { UpsertFiscalProfileDto } from '../dto/upsert-fiscal-profile.dto';
import { CancelDocumentDto } from '../dto/cancel-document.dto';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

@Controller('fiscal')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class FiscalController {
  private readonly logger = new Logger(FiscalController.name);
  private avisouSegredoPadrao = false;

  constructor(
    private readonly fiscalService: FiscalService,
    private readonly reconciliation: FiscalReconciliationService,
  ) {}

  @Post('emit/:orderId')
  @Permissions(PERMISSIONS.FISCAL_EMIT)
  async emitirNota(@Param('orderId') orderId: string, @Req() req: any) {
    return this.fiscalService.emitirNota(orderId, req.clinicId);
  }

  @Post('validate/:orderId')
  @Permissions(PERMISSIONS.FISCAL_EMIT)
  async validateOrder(@Param('orderId') orderId: string, @Req() req: any) {
    return this.fiscalService.validateOrder(orderId, req.clinicId);
  }

  @Get('documents/:id/xml')
  @Permissions(PERMISSIONS.FISCAL_VIEW)
  async downloadXml(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const file = await this.fiscalService.downloadFiscalFile(
      id,
      req.clinicId,
      'xml',
    );
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `inline; filename="${file.filename}"`,
    });
    res.send(file.data);
  }

  @Get('documents/:id/danfe')
  @Permissions(PERMISSIONS.FISCAL_VIEW)
  async downloadDanfe(
    @Param('id') id: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const file = await this.fiscalService.downloadFiscalFile(
      id,
      req.clinicId,
      'danfe',
    );
    res.set({
      'Content-Type': file.contentType,
      'Content-Disposition': `inline; filename="${file.filename}"`,
    });
    res.send(file.data);
  }

  /** Pede à SEFAZ o cancelamento de uma nota autorizada (resultado chega por webhook). */
  @Post('documents/:id/cancel')
  @Permissions(PERMISSIONS.FISCAL_CANCEL)
  async cancelarNota(
    @Param('id') id: string,
    @Body() dto: CancelDocumentDto,
    @Req() req: any,
  ) {
    return this.fiscalService.cancelarNota(id, req.clinicId, dto.justificativa);
  }

  /** Nova tentativa de uma nota aguardando a SEFAZ ou com falha de processamento. */
  @Post('documents/:id/retry')
  @Permissions(PERMISSIONS.FISCAL_EMIT)
  async tentarNovamente(@Param('id') id: string, @Req() req: any) {
    return this.fiscalService.tentarNovamente(id, req.clinicId);
  }

  /** Confere agora, no serviço fiscal, as notas desta loja (o mesmo que o job periódico faz). */
  @Post('reconcile')
  @Permissions(PERMISSIONS.FISCAL_CONFIG)
  async reconciliar(@Req() req: any) {
    return this.reconciliation.reconciliarClinica(req.clinicId);
  }

  @Get('settings')
  @Permissions(PERMISSIONS.FISCAL_CONFIG)
  async getSettings(
    @Req() req: any,
    @CurrentUser() user: any,
    @Query('clinicId') clinicId?: string,
  ) {
    const targetClinicId =
      user.isSuperAdmin && clinicId ? clinicId : req.clinicId;
    return this.fiscalService.getSettings(targetClinicId);
  }

  @Put('settings')
  @Permissions(PERMISSIONS.FISCAL_CONFIG)
  async updateSettings(
    @Body() dto: UpdateFiscalSettingsDto,
    @Req() req: any,
    @CurrentUser() user: any,
    @Query('clinicId') clinicId?: string,
  ) {
    const targetClinicId =
      user.isSuperAdmin && clinicId ? clinicId : req.clinicId;
    return this.fiscalService.updateSettings(targetClinicId, dto);
  }

  @Get('profile')
  @Permissions(PERMISSIONS.FISCAL_CONFIG)
  async getFiscalProfile(
    @Req() req: any,
    @CurrentUser() user: any,
    @Query('clinicId') clinicId?: string,
  ) {
    const targetClinicId =
      user.isSuperAdmin && clinicId ? clinicId : req.clinicId;
    return this.fiscalService.getFiscalProfile(targetClinicId);
  }

  @Put('profile')
  @Permissions(PERMISSIONS.FISCAL_CONFIG)
  async upsertFiscalProfile(
    @Body() dto: UpsertFiscalProfileDto,
    @Req() req: any,
    @CurrentUser() user: any,
    @Query('clinicId') clinicId?: string,
  ) {
    const targetClinicId =
      user.isSuperAdmin && clinicId ? clinicId : req.clinicId;
    return this.fiscalService.upsertFiscalProfile(targetClinicId, dto);
  }

  /** Reflete o Perfil do Emitente no cadastro (tenant) do serviço fiscal. Não toca no ambiente. */
  @Post('sync-tenant')
  @Permissions(PERMISSIONS.FISCAL_CONFIG)
  async syncTenant(
    @Req() req: any,
    @CurrentUser() user: any,
    @Query('clinicId') clinicId?: string,
  ) {
    const targetClinicId =
      user.isSuperAdmin && clinicId ? clinicId : req.clinicId;
    return this.fiscalService.syncTenantFromProfile(targetClinicId);
  }

  /** Status do certificado e da SEFAZ (não emite nada). */
  @Get('status')
  @Permissions(PERMISSIONS.FISCAL_CONFIG)
  async sefazStatus(
    @Req() req: any,
    @CurrentUser() user: any,
    @Query('clinicId') clinicId?: string,
  ) {
    const targetClinicId =
      user.isSuperAdmin && clinicId ? clinicId : req.clinicId;
    return this.fiscalService.getSefazStatus(targetClinicId);
  }

  @Post('setup')
  @Permissions(PERMISSIONS.FISCAL_CONFIG)
  @UseInterceptors(FileInterceptor('certificate'))
  async setupNexosFiscal(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @Req() req: any,
    @CurrentUser() user: any,
    @Query('clinicId') clinicId?: string,
  ) {
    const targetClinicId =
      user.isSuperAdmin && clinicId ? clinicId : req.clinicId;

    if (!file) {
      throw new BadRequestException('Certificado (.pfx) é obrigatório.');
    }

    return this.fiscalService.setupNexosFiscal(
      targetClinicId,
      body.name,
      body.document,
      file.buffer,
      body.password,
      file.originalname,
      {
        ie: body.ie,
        uf: body.uf,
        cityCode: body.cityCode,
        crt: body.crt,
      },
    );
  }

  /**
   * Segredo HMAC do webhook. Em produção é obrigatório e não pode ser o valor de exemplo; fora dela
   * (dev/teste) cai num valor fixo conhecido, com aviso, para não quebrar o ambiente local.
   */
  private resolverSegredoWebhook(): string | null {
    const EXEMPLOS = [
      'uma-senha-secreta-para-hmac',
      'troque-por-um-segredo-aleatorio-forte',
    ];
    const definido = (process.env.FISCAL_WEBHOOK_SECRET || '').trim();
    const valido = definido && !EXEMPLOS.includes(definido);
    if (valido) return definido;
    if (process.env.NODE_ENV === 'production') return null;
    if (!this.avisouSegredoPadrao) {
      this.avisouSegredoPadrao = true;
      this.logger.warn(
        'FISCAL_WEBHOOK_SECRET não definido (ou de exemplo): usando segredo fixo só porque não é produção.',
      );
    }
    return definido || EXEMPLOS[0];
  }

  @Public()
  @Post('webhook')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const secret = this.resolverSegredoWebhook();
    if (!secret) {
      // Falha fechada: sem segredo próprio, qualquer um assinaria um webhook falso.
      this.logger.error(
        'FISCAL_WEBHOOK_SECRET ausente ou com valor de exemplo em produção: webhook recusado.',
      );
      return res
        .status(HttpStatus.SERVICE_UNAVAILABLE)
        .send('Webhook fiscal não configurado');
    }
    const signatureFromHeader = req.headers['x-webhook-signature'];

    // Validate signature
    if (!signatureFromHeader) {
      return res.status(HttpStatus.UNAUTHORIZED).send('Missing signature');
    }

    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing raw body');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    // Comparação em tempo constante (evita descobrir a assinatura por tempo de resposta)
    const esperado = Buffer.from(expectedSignature);
    const recebido = Buffer.from(String(signatureFromHeader));
    if (
      esperado.length !== recebido.length ||
      !crypto.timingSafeEqual(esperado, recebido)
    ) {
      return res.status(HttpStatus.UNAUTHORIZED).send('Invalid signature');
    }

    // signature is valid, handle webhook
    const rawPayload = req.body;
    const eventFromHeader = req.headers['x-webhook-event'] as string;

    // Normalize payload to always have { event, data }
    const payload = rawPayload.data
      ? rawPayload
      : { event: eventFromHeader || rawPayload.event, data: rawPayload };

    try {
      await this.fiscalService.handleWebhook(payload);
      return res.status(HttpStatus.OK).send('Webhook processed');
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(e.message);
    }
  }
}
