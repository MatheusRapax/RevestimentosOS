import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/core/prisma/prisma.service';
import { StockService } from './../src/modules/stock/stock.service';
import { StockReservationsService } from './../src/modules/stock-reservations/stock-reservations.service';
import { addDays } from 'date-fns';

describe('StockReservations (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let stockService: StockService;
    let reservationsService: StockReservationsService;
    let clinicId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = app.get(PrismaService);
        stockService = app.get(StockService);
        reservationsService = app.get(StockReservationsService);

        const clinic = await prisma.clinic.findFirst();
        if (!clinic) throw new Error('Clinic not found. Seed DB first.');
        clinicId = clinic.id;
    });

    afterAll(async () => {
        await app.close();
    });

    it('should calculate available stock correctly', async () => {
        // 1. Create Product
        const product = await stockService.createProduct(clinicId, {
            name: `E2E Product ${Date.now()}`,
            sku: `E2E-${Date.now()}`,
            unit: 'm2',
            minStock: 10,
        });

        // 2. Add Stock (100 units)
        const lot = await stockService.addStock(clinicId, {
            productId: product.id,
            quantity: 100,
            lotNumber: `L-${Date.now()}`,
            expirationDate: addDays(new Date(), 365).toISOString(),
        });

        // 3. Create Reservation (30 units)
        await reservationsService.create(clinicId, {
            lotId: lot.id,
            quantity: 30,
        });

        // 4. Check Stock
        const productData = await stockService.findOne(product.id, clinicId);

        expect(productData.totalStock).toBe(100);
        expect(productData.totalReserved).toBe(30);
        expect(productData.availableStock).toBe(70);
    });
});
