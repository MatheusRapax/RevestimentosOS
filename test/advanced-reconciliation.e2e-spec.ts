import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/core/prisma/prisma.service';
import { StockEntryService } from './../src/modules/stock/stock-entry.service';
import { StockService } from './../src/modules/stock/stock.service';
import { EntryType, EntryStatus, PurchaseOrderStatus } from '@prisma/client';

describe('Advanced Reconciliation (e2e)', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let stockEntryService: StockEntryService;
    let stockService: StockService;
    let clinicId: string;
    let adminUserId: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();

        prisma = app.get(PrismaService);
        stockEntryService = app.get(StockEntryService);
        stockService = app.get(StockService);

        const clinic = await prisma.clinic.findFirst();
        if (!clinic) throw new Error('Clinic not found. Seed DB first.');
        clinicId = clinic.id;

        let user = await prisma.user.findFirst({
            where: { clinicUsers: { some: { clinicId, role: { name: 'ADMIN' } } } }
        });
        
        if (!user) {
            // Se não achou ADMIN, pega o primeiro usuário e a primeira role e força a ser ADMIN
            user = await prisma.user.findFirst({
                where: { clinicUsers: { some: { clinicId } } }
            });
            if (user) {
                const clinicUser = await prisma.clinicUser.findFirst({
                    where: { userId: user.id, clinicId }
                });
                if (clinicUser) {
                    let adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
                    if (!adminRole) {
                        adminRole = await prisma.role.create({ data: { name: 'ADMIN' } });
                    }
                    await prisma.clinicUser.update({
                        where: { id: clinicUser.id },
                        data: { roleId: adminRole.id }
                    });
                }
            }
        }
        
        if (!user) throw new Error('User not found. Seed DB first.');
        adminUserId = user.id;
    });

    afterAll(async () => {
        await app.close();
    });

    it('should block positive divergence and allow override, updating PO status correctly', async () => {
        // 1. Setup Master Data (Supplier & Product)
        const supplier = await prisma.supplier.create({
            data: {
                clinicId,
                name: `Fornecedor QA ${Date.now()}`,
                cnpj: `000000${Date.now()}`.slice(0, 14),
            }
        });

        const product = await stockService.createProduct(clinicId, {
            name: `Produto QA ${Date.now()}`,
            sku: `QA-${Date.now()}`,
            unit: 'un',
            minStock: 10,
        });

        // 2. Create Purchase Order (PENDING) with 100 units
        const po = await prisma.purchaseOrder.create({
            data: {
                clinicId,
                number: Math.floor(Math.random() * 100000),
                supplierId: supplier.id,
                supplierName: supplier.name,
                status: PurchaseOrderStatus.CONFIRMED,
                items: {
                    create: [{
                        productId: product.id,
                        productCode: product.sku || 'N/A',
                        productName: product.name,
                        quantityOrdered: 100,
                        unitPriceCents: 5000,
                        totalCents: 5000 * 100, // totalCents is required
                        supplierId: supplier.id // Opcional, do novo fluxo
                    }]
                }
            },
            include: { items: true }
        });
        const poItem = (po as any).items[0];

        // 3. Create Stock Entry Draft with 110 units (Positive Divergence)
        const entryDraft = await stockEntryService.createDraft(clinicId, {
            type: EntryType.INVOICE,
            supplierId: supplier.id,
            supplierName: supplier.name,
            invoiceNumber: `NF-${Date.now()}`,
            emissionDate: new Date().toISOString(),
            arrivalDate: new Date().toISOString(),
        });

        await stockEntryService.addItem(clinicId, entryDraft.id, {
            productId: product.id,
            quantity: 110, // Excesso!
            unitCost: 50.00, // Preço igual ao do PO (5000 cents)
            purchaseOrderId: po.id,
            purchaseOrderItemId: poItem.id
        });

        // 4. Try to confirm without forceConfirm (Should Throw)
        let errorThrown = null;
        try {
            await stockEntryService.confirmEntry(clinicId, entryDraft.id, adminUserId, {
                forceConfirm: false
            });
        } catch (err: any) {
            errorThrown = err;
        }

        // Assert Divergence Block
        expect(errorThrown).toBeDefined();
        expect(errorThrown.response?.code).toBe('PO_DIVERGENCE');
        expect(errorThrown.response?.divergences.length).toBeGreaterThan(0);
        expect(errorThrown.response?.divergences[0]).toContain('Excesso de 10');

        // 5. Try to confirm with forceConfirm (Admin Override)
        await stockEntryService.confirmEntry(clinicId, entryDraft.id, adminUserId, {
            forceConfirm: true,
            justification: 'Aprovação de QA via Testes E2E'
        });

        // 6. Verify entry status
        const confirmedEntry = await prisma.stockEntry.findUnique({ where: { id: entryDraft.id } });
        expect(confirmedEntry?.status).toBe(EntryStatus.CONFIRMED);
        expect(confirmedEntry?.hasPriceDivergence).toBe(true); // Engloba Qtd Divergence
        expect(confirmedEntry?.notes).toContain('Aprovação de QA');

        // 7. Verify PO Status and Quantities
        const updatedPo = await prisma.purchaseOrder.findUnique({
            where: { id: po.id },
            include: { items: true }
        });
        expect(updatedPo?.status).toBe('RECEIVED');
        expect(updatedPo?.items[0].quantityReceived).toBe(110);
    });
});
