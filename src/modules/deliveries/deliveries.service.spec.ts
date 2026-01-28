import { Test, TestingModule } from '@nestjs/testing';
import { DeliveriesService } from './deliveries.service';
import { PrismaService } from '../../core/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrismaService = {
    order: {
        findFirst: jest.fn(),
    },
    delivery: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
    },
};

describe('DeliveriesService', () => {
    let service: DeliveriesService;
    let prisma: typeof mockPrismaService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DeliveriesService,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        service = module.get<DeliveriesService>(DeliveriesService);
        prisma = module.get(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a delivery successfully', async () => {
            const orderId = 'order-1';
            const clinicId = 'clinic-1';

            prisma.order.findFirst.mockResolvedValue({ id: orderId, clinicId, delivery: null });
            prisma.delivery.create.mockResolvedValue({ id: 'delivery-1', orderId, status: 'SCHEDULED' });

            await service.create(clinicId, { orderId, scheduledDate: '2026-02-01T10:00:00Z' });

            expect(prisma.order.findFirst).toHaveBeenCalledWith({
                where: { id: orderId, clinicId },
                include: { delivery: true },
            });
            expect(prisma.delivery.create).toHaveBeenCalled();
        });

        it('should throw error if order does not exist', async () => {
            prisma.order.findFirst.mockResolvedValue(null);
            await expect(service.create('clinic-1', { orderId: 'invalid' }))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw error if order already has delivery', async () => {
            prisma.order.findFirst.mockResolvedValue({ id: 'order-1', delivery: { id: 'd1' } });
            await expect(service.create('clinic-1', { orderId: 'order-1' }))
                .rejects.toThrow(BadRequestException);
        });
    });
});
