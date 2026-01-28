import { ArchitectsService } from './architects.service';
import { NotFoundException } from '@nestjs/common';

describe('ArchitectsService', () => {
    let service: ArchitectsService;
    let mockPrismaService: any;

    const mockArchitect = {
        id: 'architect-1',
        clinicId: 'clinic-1',
        name: 'Arq. Maria Santos',
        email: 'maria@arquitetura.com',
        phone: '11988888888',
        commissionRate: 3.5, // 3.5%
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        mockPrismaService = {
            architect: {
                create: jest.fn(),
                findMany: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
            },
            quote: {
                findMany: jest.fn(),
            },
        };

        service = new ArchitectsService(mockPrismaService);
    });

    describe('create', () => {
        it('should create an architect with commission rate', async () => {
            mockPrismaService.architect.create.mockResolvedValue(mockArchitect);

            const createDto = {
                name: 'Arq. Maria Santos',
                email: 'maria@arquitetura.com',
                commissionRate: 3.5,
            };

            const result = await service.create('clinic-1', createDto);

            expect(result.name).toBe('Arq. Maria Santos');
            expect(result.commissionRate).toBe(3.5);
            expect(mockPrismaService.architect.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    clinicId: 'clinic-1',
                    commissionRate: 3.5,
                }),
            });
        });
    });

    describe('findAll', () => {
        it('should return all active architects', async () => {
            mockPrismaService.architect.findMany.mockResolvedValue([mockArchitect]);

            const result = await service.findAll('clinic-1', true);

            expect(result).toHaveLength(1);
            expect(mockPrismaService.architect.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        isActive: true,
                    }),
                }),
            );
        });
    });

    describe('findOne', () => {
        it('should return an architect by id', async () => {
            mockPrismaService.architect.findFirst.mockResolvedValue(mockArchitect);

            const result = await service.findOne('architect-1', 'clinic-1');

            expect(result.id).toBe('architect-1');
        });

        it('should throw NotFoundException for non-existent architect', async () => {
            mockPrismaService.architect.findFirst.mockResolvedValue(null);

            await expect(
                service.findOne('non-existent', 'clinic-1'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('getCommissionReport', () => {
        it('should calculate commission correctly', async () => {
            mockPrismaService.architect.findFirst.mockResolvedValue(mockArchitect);
            mockPrismaService.quote.findMany.mockResolvedValue([
                {
                    id: 'quote-1',
                    number: 1,
                    customer: { name: 'Cliente A' },
                    order: { status: 'DELIVERED', totalCents: 100000 }, // R$ 1.000,00
                },
                {
                    id: 'quote-2',
                    number: 2,
                    customer: { name: 'Cliente B' },
                    order: { status: 'DELIVERED', totalCents: 200000 }, // R$ 2.000,00
                },
            ]);

            const result = await service.getCommissionReport(
                'architect-1',
                'clinic-1',
            );

            // Total: R$ 3.000,00 × 3.5% = R$ 105,00
            expect(result.totalSalesCents).toBe(300000);
            expect(result.totalCommissionCents).toBe(10500);
            expect(result.totalQuotes).toBe(2);
        });

        it('should return zero commission when no sales', async () => {
            mockPrismaService.architect.findFirst.mockResolvedValue(mockArchitect);
            mockPrismaService.quote.findMany.mockResolvedValue([]);

            const result = await service.getCommissionReport(
                'architect-1',
                'clinic-1',
            );

            expect(result.totalSalesCents).toBe(0);
            expect(result.totalCommissionCents).toBe(0);
        });

        it('should filter by date range when provided', async () => {
            mockPrismaService.architect.findFirst.mockResolvedValue(mockArchitect);
            mockPrismaService.quote.findMany.mockResolvedValue([]);

            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-12-31');

            await service.getCommissionReport(
                'architect-1',
                'clinic-1',
                startDate,
                endDate,
            );

            expect(mockPrismaService.quote.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        createdAt: {
                            gte: startDate,
                            lte: endDate,
                        },
                    }),
                }),
            );
        });
    });

    describe('softDelete', () => {
        it('should soft delete an architect', async () => {
            mockPrismaService.architect.findFirst.mockResolvedValue(mockArchitect);
            mockPrismaService.architect.update.mockResolvedValue({
                ...mockArchitect,
                isActive: false,
            });

            const result = await service.softDelete('architect-1', 'clinic-1');

            expect(result.isActive).toBe(false);
        });
    });
});
