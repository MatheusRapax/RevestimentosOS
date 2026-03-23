import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuditAction, CommissionTargetType } from '@prisma/client';
import { CreateCommissionRuleDto } from './dto/create-commission-rule.dto';
import { UpdateCommissionRuleDto } from './dto/update-commission-rule.dto';

@Injectable()
export class CommissionsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(clinicId: string) {
    return this.prisma.commissionRule.findMany({
      where: { clinicId },
      include: {
        tiers: {
          orderBy: { minGoalAmount: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(clinicId: string, id: string) {
    const rule = await this.prisma.commissionRule.findFirst({
      where: { id, clinicId },
      include: {
        tiers: {
          orderBy: { minGoalAmount: 'asc' },
        },
      },
    });

    if (!rule) {
      throw new NotFoundException('Commission Rule not found');
    }

    return rule;
  }

  async create(
    clinicId: string,
    currentUserId: string,
    dto: CreateCommissionRuleDto,
  ) {
    // If a rule is marked as global, ensure no other rule is global for this target type
    if (dto.isGlobal) {
      await this.ensureSingleGlobalRule(clinicId, dto.targetType);
    }

    const { tiers, ...ruleData } = dto;

    const rule = await this.prisma.commissionRule.create({
      data: {
        ...ruleData,
        clinicId,
        tiers: tiers
          ? {
              create: tiers.map((tier) => ({
                minGoalAmount: tier.minGoalAmount,
                commissionRate: tier.commissionRate,
              })),
            }
          : undefined,
      },
      include: { tiers: true },
    });

    await this.auditService.log({
      clinicId,
      userId: currentUserId,
      action: AuditAction.CREATE,
      entity: 'CommissionRule',
      entityId: rule.id,
      message: `Criou regra de comissão: ${rule.name}`,
    });

    return rule;
  }

  async update(
    clinicId: string,
    id: string,
    currentUserId: string,
    dto: UpdateCommissionRuleDto,
  ) {
    const rule = await this.findOne(clinicId, id);

    // Check if we are changing it to be the global rule
    if (dto.isGlobal && !rule.isGlobal) {
      const targetType = dto.targetType || rule.targetType;
      await this.ensureSingleGlobalRule(clinicId, targetType);
    }

    const { tiers, ...ruleData } = dto;

    const updated = await this.prisma.commissionRule.update({
      where: { id },
      data: {
        ...ruleData,
        // If tiers are provided, completely replace existing ones
        ...(tiers && {
          tiers: {
            deleteMany: {},
            create: tiers.map((tier) => ({
              minGoalAmount: tier.minGoalAmount,
              commissionRate: tier.commissionRate,
            })),
          },
        }),
      },
      include: { tiers: true },
    });

    await this.auditService.log({
      clinicId,
      userId: currentUserId,
      action: AuditAction.UPDATE,
      entity: 'CommissionRule',
      entityId: rule.id,
      message: `Atualizou regra de comissão: ${rule.name}`,
    });

    return updated;
  }

  async remove(clinicId: string, id: string, currentUserId: string) {
    const rule = await this.findOne(clinicId, id);

    // Optionally check if rule is assigned to users/architects before deleting
    const inUseByUsers = await this.prisma.user.findFirst({
      where: { commissionRuleId: id },
    });
    
    const inUseByArchitects = await this.prisma.architect.findFirst({
      where: { commissionRuleId: id },
    });

    if (inUseByUsers || inUseByArchitects) {
      throw new ConflictException(
        'Esta regra está vinculada a um ou mais usuários/arquitetos e não pode ser excluída.',
      );
    }

    await this.prisma.commissionRule.delete({
      where: { id },
    });

    await this.auditService.log({
      clinicId,
      userId: currentUserId,
      action: AuditAction.DELETE,
      entity: 'CommissionRule',
      entityId: rule.id,
      message: `Removeu regra de comissão: ${rule.name}`,
    });

    return { success: true };
  }

  private async ensureSingleGlobalRule(
    clinicId: string,
    targetType: CommissionTargetType,
  ) {
    await this.prisma.commissionRule.updateMany({
      where: {
        clinicId,
        targetType,
        isGlobal: true,
      },
      data: {
        isGlobal: false,
      },
    });
  }

  async resolveRule(
    clinicId: string,
    targetType: CommissionTargetType,
    specificRuleId?: string,
  ) {
    if (specificRuleId) {
      const rule = await this.prisma.commissionRule.findFirst({
        where: { id: specificRuleId, clinicId, targetType, isActive: true },
        include: { tiers: { orderBy: { minGoalAmount: 'asc' } } },
      });
      if (rule) return rule;
    }

    // Fallback to global
    return this.prisma.commissionRule.findFirst({
      where: { clinicId, targetType, isGlobal: true, isActive: true },
      include: { tiers: { orderBy: { minGoalAmount: 'asc' } } },
    });
  }
}
