import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { SaleType } from '@prisma/client';

// Helpers to generate unique data
const generateUniqueId = () => Date.now().toString();

describe('Sales & Delivery Flow (E2E)', () => {
    let app: INestApplication;
    let authToken: string;
    let clinicId: string;

    // Data IDs to track across steps
    let customerId: string;
    let productId: string;
    let quoteId: string;
    let orderId: string;
    let deliveryId: string;

    beforeAll(async () => {
        jest.setTimeout(60000); // 1 minute timeout for setup and tests

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        // 1. Authenticate (Login as Admin existing in Seed or Create one)
        try {
            const loginRes = await request(app.getHttpServer())
                .post('/auth/login')
                .send({ email: 'admin@revestimentos.com', password: '123456' });

            if (loginRes.status === 201 || loginRes.status === 200) {
                authToken = loginRes.body.access_token;
            }
        } catch (e) {
            console.warn('Login failed, tests might fail', e);
        }

        // Get Clinic ID
        if (authToken) {
            const userRes = await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${authToken}`);

            if (userRes.body && userRes.body.clinics && userRes.body.clinics.length > 0) {
                clinicId = userRes.body.clinics[0].clinicId || userRes.body.clinics[0].id;
            }
        }
    }, 60000);

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    }, 60000);

    const headers = () => ({
        'Authorization': `Bearer ${authToken}`,
        'X-Clinic-Id': clinicId
    });

    it('Step 0: Check Environment', () => {
        expect(authToken).toBeDefined();
        expect(clinicId).toBeDefined();
    });

    it('Step 1: Ensure Test Product Exists', async () => {
        const prisma = app.get(PrismaService);

        const product = await prisma.product.create({
            data: {
                clinicId,
                name: `Porcelanato Teste E2E ${generateUniqueId()}`,
                sku: `TEST-${generateUniqueId()}`,
                saleType: SaleType.AREA,
                unit: 'm2',
                priceCents: 10000,
                boxCoverage: 1.44,
                piecesPerBox: 2,
                minStock: 100,
                isActive: true
            }
        });

        productId = product.id;
        expect(productId).toBeDefined();
    });

    it('Step 2: Create Customer', async () => {
        const res = await request(app.getHttpServer())
            .post('/customers')
            .set(headers())
            .send({
                name: 'Cliente E2E Teste',
                phone: '11999999999',
                type: 'PF'
            });

        expect(res.status).toBe(201);
        customerId = res.body.id;
    });

    it('Step 3: Create Quote with Calculations', async () => {
        // 10m2 request -> ceil(10 / 1.44) = 7 boxes * 1.44 = 10.08 m2
        const res = await request(app.getHttpServer())
            .post('/quotes')
            .set(headers())
            .send({
                customerId,
                items: [
                    {
                        productId,
                        inputArea: 10,
                        unitPriceCents: 10000
                    }
                ]
            });

        expect(res.status).toBe(201);
        quoteId = res.body.id;

        const item = res.body.items[0];
        expect(item.quantityBoxes).toBe(7);
        expect(item.totalCents).toBeGreaterThanOrEqual(100800);
    });

    it('Step 4: Generate PDF', async () => {
        const res = await request(app.getHttpServer())
            .get(`/quotes/${quoteId}/pdf`)
            .set(headers())
            .expect(200);

        expect(res.header['content-type']).toBe('application/pdf');
    });

    it('Step 5: Convert to Order', async () => {
        const res = await request(app.getHttpServer())
            .post(`/quotes/${quoteId}/convert`)
            .set(headers())
            .send();

        expect(res.status).toBe(201);
        orderId = res.body.id;
        expect(res.body.status).toBe('CONFIRMED');
    });

    it('Step 6: Schedule Delivery', async () => {
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 2);

        const res = await request(app.getHttpServer())
            .post('/deliveries')
            .set(headers())
            .send({
                orderId,
                scheduledDate: deliveryDate.toISOString(),
                driverName: 'Motorista Teste',
                vehiclePlate: 'TEST-1234',
                notes: 'Cuidado frágil'
            });

        expect(res.status).toBe(201);
        deliveryId = res.body.id;
        expect(res.body.status).toBe('SCHEDULED');
    });

    it('Step 7: List Deliveries', async () => {
        const res = await request(app.getHttpServer())
            .get('/deliveries')
            .set(headers())
            .expect(200);

        const delivery = res.body.find((d: any) => d.id === deliveryId);
        expect(delivery).toBeDefined();
        expect(delivery.order.number).toBeDefined();
    });
});
