import { QuotesService } from './quotes.service';

/**
 * Unit tests for QuotesService
 * Focus: m² → boxes conversion logic (critical business rule)
 */
describe('QuotesService', () => {
    let service: QuotesService;
    let mockPrismaService: any;

    beforeEach(() => {
        mockPrismaService = {
            product: {
                findFirst: jest.fn(),
            },
            quote: {
                findFirst: jest.fn(),
                findMany: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
            order: {
                findFirst: jest.fn(),
                create: jest.fn(),
            },
            $transaction: jest.fn((callback) => callback(mockPrismaService)),
        };

        const mockStockService = {
            findOne: jest.fn(),
        } as any;

        const mockStockReservationsService = {
            create: jest.fn(),
            findByQuote: jest.fn(),
        } as any;

        service = new QuotesService(mockPrismaService, mockStockService, mockStockReservationsService);
    });

    // ============================================
    // m² → Boxes Conversion Tests (Critical Logic)
    // ============================================
    describe('calculateBoxesFromArea', () => {
        it('should calculate exact number of boxes when area divides evenly', () => {
            // 10m² with 2.5m² per box = 4 boxes exactly
            const result = service.calculateBoxesFromArea(10, 2.5);
            expect(result).toBe(4);
        });

        it('should round UP when area does not divide evenly (boxes are whole units)', () => {
            // 10m² with 3m² per box = 3.33 → must round to 4 boxes
            const result = service.calculateBoxesFromArea(10, 3);
            expect(result).toBe(4);
        });

        it('should round UP for very small remainder', () => {
            // 10.1m² with 2.5m² per box = 4.04 → must round to 5 boxes
            const result = service.calculateBoxesFromArea(10.1, 2.5);
            expect(result).toBe(5);
        });

        it('should return 1 box for area smaller than box coverage', () => {
            // 1m² with 2.5m² per box = 0.4 → must round to 1 box
            const result = service.calculateBoxesFromArea(1, 2.5);
            expect(result).toBe(1);
        });

        it('should throw error for zero box coverage', () => {
            expect(() => service.calculateBoxesFromArea(10, 0)).toThrow(
                'Cobertura da caixa deve ser maior que zero',
            );
        });

        it('should throw error for negative box coverage', () => {
            expect(() => service.calculateBoxesFromArea(10, -2)).toThrow(
                'Cobertura da caixa deve ser maior que zero',
            );
        });

        it('should handle large areas correctly', () => {
            // 1000m² with 2.5m² per box = 400 boxes exactly
            const result = service.calculateBoxesFromArea(1000, 2.5);
            expect(result).toBe(400);
        });

        it('should handle decimal box coverage (common in tiles)', () => {
            // 15m² with 1.44m² per box (common porcelain tile) = 10.42 → 11 boxes
            const result = service.calculateBoxesFromArea(15, 1.44);
            expect(result).toBe(11);
        });
    });

    // ============================================
    // processQuoteItem Tests
    // ============================================
    describe('processQuoteItem', () => {
        const mockProduct = {
            id: 'product-1',
            name: 'Porcelanato Cinza 60x60',
            clinicId: 'clinic-1',
            boxCoverage: 1.44, // m² por caixa
        };

        it('should calculate boxes correctly from inputArea', async () => {
            mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);

            const item = {
                productId: 'product-1',
                inputArea: 10, // 10m² desejado
                unitPriceCents: 5000, // R$ 50,00 por caixa
            };

            const result = await service.processQuoteItem('clinic-1', item);

            // 10m² / 1.44m² per box = 6.94 → 7 boxes
            expect(result.quantityBoxes).toBe(7);
            // 7 boxes × 1.44m² = 10.08m² (área resultante real)
            expect(result.resultingArea).toBeCloseTo(10.08, 2);
            // 7 boxes × R$ 50 = R$ 350,00
            expect(result.totalCents).toBe(35000);
        });

        it('should use quantityBoxes directly when inputArea is not provided', async () => {
            mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);

            const item = {
                productId: 'product-1',
                quantityBoxes: 5,
                unitPriceCents: 5000,
            };

            const result = await service.processQuoteItem('clinic-1', item);

            expect(result.quantityBoxes).toBe(5);
            expect(result.resultingArea).toBeCloseTo(7.2, 2); // 5 × 1.44m²
            expect(result.totalCents).toBe(25000); // 5 × R$ 50
        });

        it('should apply percentage discount correctly', async () => {
            mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);

            const item = {
                productId: 'product-1',
                quantityBoxes: 10,
                unitPriceCents: 5000,
                discountPercent: 10, // 10% de desconto
            };

            const result = await service.processQuoteItem('clinic-1', item);

            // Subtotal: 10 × R$ 50 = R$ 500
            // Desconto: R$ 500 × 10% = R$ 50
            // Total: R$ 500 - R$ 50 = R$ 450
            expect(result.discountCents).toBe(5000);
            expect(result.totalCents).toBe(45000);
        });

        it('should apply fixed discount correctly', async () => {
            mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);

            const item = {
                productId: 'product-1',
                quantityBoxes: 10,
                unitPriceCents: 5000,
                discountCents: 3000, // R$ 30,00 de desconto fixo
            };

            const result = await service.processQuoteItem('clinic-1', item);

            expect(result.discountCents).toBe(3000);
            expect(result.totalCents).toBe(47000); // R$ 500 - R$ 30 = R$ 470
        });

        it('should throw error for product without boxCoverage when using inputArea', async () => {
            const productWithoutCoverage = {
                ...mockProduct,
                boxCoverage: null,
            };
            mockPrismaService.product.findFirst.mockResolvedValue(productWithoutCoverage);

            const item = {
                productId: 'product-1',
                inputArea: 10,
                unitPriceCents: 5000,
            };

            await expect(service.processQuoteItem('clinic-1', item)).rejects.toThrow(
                'não possui cobertura por caixa configurada',
            );
        });

        it('should throw error when neither inputArea nor quantityBoxes is provided', async () => {
            mockPrismaService.product.findFirst.mockResolvedValue(mockProduct);

            const item = {
                productId: 'product-1',
                unitPriceCents: 5000,
            };

            await expect(service.processQuoteItem('clinic-1', item)).rejects.toThrow(
                'Informe inputArea (m²) ou quantityBoxes',
            );
        });

        it('should throw NotFoundException for non-existent product', async () => {
            mockPrismaService.product.findFirst.mockResolvedValue(null);

            const item = {
                productId: 'non-existent',
                inputArea: 10,
                unitPriceCents: 5000,
            };

            await expect(service.processQuoteItem('clinic-1', item)).rejects.toThrow(
                'não encontrado',
            );
        });
    });

    // ============================================
    // Real-world Scenarios
    // ============================================
    describe('Real-world Scenarios', () => {
        it('should handle typical flooring project: 50m² living room', async () => {
            const porcelanatoProduct = {
                id: 'product-1',
                name: 'Porcelanato Polido 80x80',
                clinicId: 'clinic-1',
                boxCoverage: 1.92, // 3 peças de 0.64m² cada
            };
            mockPrismaService.product.findFirst.mockResolvedValue(porcelanatoProduct);

            const item = {
                productId: 'product-1',
                inputArea: 50, // 50m² de sala
                unitPriceCents: 12900, // R$ 129,00 por caixa
            };

            const result = await service.processQuoteItem('clinic-1', item);

            // 50m² / 1.92m² per box = 26.04 → 27 boxes (rounded up!)
            expect(result.quantityBoxes).toBe(27);
            // 27 boxes × 1.92m² = 51.84m²
            expect(result.resultingArea).toBeCloseTo(51.84, 2);
            // 27 boxes × R$ 129,00 = R$ 3.483,00
            expect(result.totalCents).toBe(348300);
        });

        it('should handle small area: 3.5m² bathroom', async () => {
            const ceramicaProduct = {
                id: 'product-2',
                name: 'Cerâmica 30x60',
                clinicId: 'clinic-1',
                boxCoverage: 2.04,
            };
            mockPrismaService.product.findFirst.mockResolvedValue(ceramicaProduct);

            const item = {
                productId: 'product-2',
                inputArea: 3.5,
                unitPriceCents: 4500,
            };

            const result = await service.processQuoteItem('clinic-1', item);

            // 3.5m² / 2.04m² = 1.72 → 2 boxes
            expect(result.quantityBoxes).toBe(2);
            expect(result.totalCents).toBe(9000); // 2 × R$ 45
        });
    });
});
