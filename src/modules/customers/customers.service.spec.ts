import { CustomersService } from './customers.service';
import { NotFoundException } from '@nestjs/common';

describe('CustomersService', () => {
    let service: CustomersService;
    let mockPrismaService: any;

    const mockCustomer = {
        id: 'customer-1',
        clinicId: 'clinic-1',
        name: 'João Silva',
        type: 'PF',
        document: '123.456.789-00',
        email: 'joao@email.com',
        phone: '11999999999',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        mockPrismaService = {
            customer: {
                create: jest.fn(),
                findMany: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
            },
            quote: {
                count: jest.fn(),
            },
            order: {
                count: jest.fn(),
                findFirst: jest.fn(),
            },
        };

        service = new CustomersService(mockPrismaService);
    });

    describe('create', () => {
        it('should create a customer successfully', async () => {
            mockPrismaService.customer.create.mockResolvedValue({
                ...mockCustomer,
                architect: null,
            });

            const createDto = {
                name: 'João Silva',
                type: 'PF' as const,
                document: '123.456.789-00',
                email: 'joao@email.com',
            };

            const result = await service.create('clinic-1', createDto);

            expect(result.name).toBe('João Silva');
            expect(mockPrismaService.customer.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        name: 'João Silva',
                        clinicId: 'clinic-1',
                    }),
                }),
            );
        });

        it('should create a PJ customer with stateRegistration', async () => {
            const pjCustomer = {
                ...mockCustomer,
                type: 'PJ',
                document: '12.345.678/0001-90',
                stateRegistration: '123.456.789.000',
            };
            mockPrismaService.customer.create.mockResolvedValue({
                ...pjCustomer,
                architect: null,
            });

            const createDto = {
                name: 'Empresa XYZ Ltda',
                type: 'PJ' as const,
                document: '12.345.678/0001-90',
                stateRegistration: '123.456.789.000',
            };

            const result = await service.create('clinic-1', createDto);

            expect(result.type).toBe('PJ');
        });
    });

    describe('findAll', () => {
        it('should return all customers for a clinic', async () => {
            mockPrismaService.customer.findMany.mockResolvedValue([
                { ...mockCustomer, architect: null },
            ]);

            const result = await service.findAll('clinic-1', {});

            expect(result).toHaveLength(1);
            expect(mockPrismaService.customer.findMany).toHaveBeenCalled();
        });

        it('should filter by name (case insensitive)', async () => {
            mockPrismaService.customer.findMany.mockResolvedValue([
                { ...mockCustomer, architect: null },
            ]);

            await service.findAll('clinic-1', { name: 'joão' });

            expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        name: { contains: 'joão', mode: 'insensitive' },
                    }),
                }),
            );
        });

        it('should filter by customer type', async () => {
            mockPrismaService.customer.findMany.mockResolvedValue([]);

            await service.findAll('clinic-1', { type: 'PJ' as any });

            expect(mockPrismaService.customer.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        type: 'PJ',
                    }),
                }),
            );
        });
    });

    describe('findOne', () => {
        it('should return a customer by id', async () => {
            mockPrismaService.customer.findFirst.mockResolvedValue({
                ...mockCustomer,
                architect: null,
            });

            const result = await service.findOne('customer-1', 'clinic-1');

            expect(result.id).toBe('customer-1');
        });

        it('should throw NotFoundException for non-existent customer', async () => {
            mockPrismaService.customer.findFirst.mockResolvedValue(null);

            await expect(
                service.findOne('non-existent', 'clinic-1'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('softDelete', () => {
        it('should soft delete a customer', async () => {
            mockPrismaService.customer.findFirst.mockResolvedValue({
                ...mockCustomer,
                architect: null,
            });
            mockPrismaService.customer.update.mockResolvedValue({
                ...mockCustomer,
                isActive: false,
            });

            const result = await service.softDelete('customer-1', 'clinic-1');

            expect(result.isActive).toBe(false);
            expect(mockPrismaService.customer.update).toHaveBeenCalledWith({
                where: { id: 'customer-1' },
                data: { isActive: false },
            });
        });
    });

    describe('getCustomerSummary', () => {
        it('should return customer sales summary', async () => {
            mockPrismaService.customer.findFirst.mockResolvedValue({
                ...mockCustomer,
                architect: null,
            });
            mockPrismaService.quote.count.mockResolvedValue(5);
            mockPrismaService.order.count.mockResolvedValueOnce(3);
            mockPrismaService.order.count.mockResolvedValueOnce(1);
            mockPrismaService.order.findFirst.mockResolvedValue({
                createdAt: new Date(),
                totalCents: 150000,
            });

            const result = await service.getCustomerSummary('customer-1', 'clinic-1');

            expect(result.totalQuotes).toBe(5);
            expect(result.totalOrders).toBe(3);
            expect(result.pendingOrders).toBe(1);
            expect(result.lastOrder).not.toBeNull();
        });
    });
});
