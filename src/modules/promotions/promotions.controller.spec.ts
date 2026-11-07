import { Test, TestingModule } from '@nestjs/testing';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt.guard';
import { TenantGuard } from '../../core/tenant/guards/tenant.guard';
import { PermissionsGuard } from '../../core/rbac/guards/permissions.guard';
import { ModuleGuard } from '../../core/auth/guards/module.guard';

// Os guards são testados à parte; aqui só importa montar o controller.
const liberar = { canActivate: () => true };

describe('PromotionsController', () => {
  let controller: PromotionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionsController],
      providers: [{ provide: PromotionsService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(liberar)
      .overrideGuard(TenantGuard)
      .useValue(liberar)
      .overrideGuard(PermissionsGuard)
      .useValue(liberar)
      .overrideGuard(ModuleGuard)
      .useValue(liberar)
      .compile();

    controller = module.get<PromotionsController>(PromotionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
