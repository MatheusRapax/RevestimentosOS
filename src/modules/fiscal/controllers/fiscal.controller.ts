import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
  Query,
  Req,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { FiscalService } from '../services/fiscal.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../../core/rbac/guards/permissions.guard';
import { Permissions } from '../../../core/rbac/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../core/rbac/permissions';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { UpdateFiscalSettingsDto } from '../dto/update-fiscal-settings.dto';
import { Public } from '../../../core/auth/decorators/public.decorator';
import { Request, Response } from 'express';
import * as crypto from 'crypto';

@Controller('fiscal')
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class FiscalController {
  constructor(private readonly fiscalService: FiscalService) {}

  @Post('emit/:orderId')
  @Permissions(PERMISSIONS.FISCAL_EMIT)
  async emitirNota(
    @Param('orderId') orderId: string,
    @Req() req: any,
  ) {
    return this.fiscalService.emitirNota(orderId, req.clinicId);
  }

  @Get('settings')
  @Permissions(PERMISSIONS.FISCAL_CONFIG)
  async getSettings(
    @CurrentUser() user: any,
    @Query('clinicId') clinicId?: string,
  ) {
    const targetClinicId =
      user.isSuperAdmin && clinicId ? clinicId : user.clinicId;
    return this.fiscalService.getSettings(targetClinicId);
  }

  @Put('settings')
  @Permissions(PERMISSIONS.FISCAL_CONFIG)
  async updateSettings(
    @Body() dto: UpdateFiscalSettingsDto,
    @CurrentUser() user: any,
    @Query('clinicId') clinicId?: string,
  ) {
    const targetClinicId =
      user.isSuperAdmin && clinicId ? clinicId : user.clinicId;
    return this.fiscalService.updateSettings(targetClinicId, dto);
  }

  @Post('setup')
  @Permissions(PERMISSIONS.FISCAL_CONFIG)
  @UseInterceptors(FileInterceptor('certificate'))
  async setupNexosFiscal(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
    @CurrentUser() user: any,
    @Query('clinicId') clinicId?: string,
  ) {
    const targetClinicId = user.isSuperAdmin && clinicId ? clinicId : user.clinicId;
    
    if (!file) {
      throw new BadRequestException('Certificado (.pfx) é obrigatório.');
    }
    
    return this.fiscalService.setupNexosFiscal(
      targetClinicId,
      body.name,
      body.document,
      file.buffer,
      body.password,
      file.originalname
    );
  }

  @Public()
  @Post('webhook')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const secret = process.env.FISCAL_WEBHOOK_SECRET || 'uma-senha-secreta-para-hmac';
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

    if (expectedSignature !== signatureFromHeader) {
      return res.status(HttpStatus.UNAUTHORIZED).send('Invalid signature');
    }

    // signature is valid, handle webhook
    const rawPayload = req.body;
    const eventFromHeader = req.headers['x-webhook-event'] as string;
    
    // Normalize payload to always have { event, data }
    const payload = (rawPayload.data) 
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
