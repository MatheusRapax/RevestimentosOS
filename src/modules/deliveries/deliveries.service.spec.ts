import { Test, TestingModule } from '@nestjs/testing';
import { DeliveriesService } from './deliveries.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrismaService: any = {
  order: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  delivery: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  // a criação roda numa transação: o "tx" é o próprio mock
  $transaction: jest.fn(),
};

describe('DeliveriesService', () => {
  let service: DeliveriesService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OrdersService, useValue: { updateStatus: jest.fn() } },
      ],
    }).compile();

    service = module.get<DeliveriesService>(DeliveriesService);
    prisma = module.get(PrismaService);
    prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a delivery successfully', async () => {
      const orderId = 'order-1';
      const clinicId = 'clinic-1';

      // regra de negócio: só agenda entrega de pedido em separação ou pronto para entrega
      prisma.order.findFirst.mockResolvedValue({
        id: orderId,
        clinicId,
        delivery: null,
        status: 'EM_SEPARACAO',
      });
      prisma.delivery.create.mockResolvedValue({
        id: 'delivery-1',
        orderId,
        status: 'SCHEDULED',
      });

      await service.create(clinicId, {
        orderId,
        scheduledDate: '2026-02-01T10:00:00Z',
      });

      expect(prisma.order.findFirst).toHaveBeenCalledWith({
        where: { id: orderId, clinicId },
        include: { delivery: true },
      });
      expect(prisma.delivery.create).toHaveBeenCalled();
      // ao agendar, o pedido segue em separação
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: { status: 'EM_SEPARACAO' },
      });
    });

    it('should refuse to schedule a delivery for an order that is not ready', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: 'order-1',
        delivery: null,
        status: 'AGUARDANDO_PAGAMENTO',
      });
      await expect(
        service.create('clinic-1', { orderId: 'order-1' }),
      ).rejects.toThrow(/Só é possível agendar entrega/);
      expect(prisma.delivery.create).not.toHaveBeenCalled();
    });

    it('should throw error if order does not exist', async () => {
      prisma.order.findFirst.mockResolvedValue(null);
      await expect(
        service.create('clinic-1', { orderId: 'invalid' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if order already has delivery', async () => {
      prisma.order.findFirst.mockResolvedValue({
        id: 'order-1',
        delivery: { id: 'd1' },
      });
      await expect(
        service.create('clinic-1', { orderId: 'order-1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
