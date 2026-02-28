import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { UpdateStoreSettingsDto } from './dto/update-store-settings.dto';

@Injectable()
export class StoreSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(clinicId: string) {
    let settings = await this.prisma.storeSettings.findUnique({
      where: { clinicId },
    });

    if (!settings) {
      settings = await this.prisma.storeSettings.create({
        data: { clinicId },
      });
    }

    return settings;
  }

  async updateSettings(clinicId: string, data: UpdateStoreSettingsDto) {
    const settings = await this.getSettings(clinicId);

    return this.prisma.storeSettings.update({
      where: { id: settings.id },
      data,
    });
  }
}
