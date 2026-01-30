
import 'dotenv/config';
import { PrismaClient, QuoteStatus, ReservationType } from '@prisma/client';
import { QuotesService } from '../src/modules/quotes/quotes.service';
import { StockService } from '../src/modules/stock/stock.service';
import { StockReservationsService } from '../src/modules/stock-reservations/stock-reservations.service';
import { AuditService } from '../src/core/audit/audit.service';
import { PrismaService } from '../src/core/prisma/prisma.service';

// Mock NestJS dependency injection
async function main() {
    console.log('Starting Quote Editing Verification...');

    const prisma = new PrismaClient();
    const prismaService = prisma as unknown as PrismaService;

    // Instantiate Services
    const auditService = new AuditService(prismaService);
    const stockService = new StockService(prismaService, auditService);
    const stockReservationsService = new StockReservationsService(prismaService);
    const quotesService = new QuotesService(prismaService, stockService, stockReservationsService);

    // 1. Setup Data
    const clinicId = 'test-editing-' + Date.now();
    const userId = 'test-user-' + Date.now();

    console.log(`Creating test data for clinic: ${clinicId}`);

    // Create Clinic
    await prisma.clinic.create({
        data: {
            id: clinicId,
            name: 'Test Editing Clinic',
            slug: 'test-edit-' + Date.now()
        }
    });

    // Create User (Seller)
    const user = await prisma.user.create({
        data: {
            id: userId,
            email: `test-edit-${Date.now()}@test.com`,
            name: 'Test Seller',
            password: 'hash',
        }
    });

    // Create Customer
    const customer = await prisma.customer.create({
        data: {
            clinicId,
            name: 'Editing Customer',
            phone: '999',
            email: 'customer-edit@test.com',
            document: '123'
        }
    });

    // Create Product
    const product = await prisma.product.create({
        data: {
            clinicId,
            name: 'Porcelanato Editing',
            sku: `SKU-EDIT-${Date.now()}`,
            priceCents: 10000,
            boxCoverage: 2.0,
            isActive: true
        }
    });

    // Add Stock (100 boxes)
    const lotNumber = 'LOTE-EDIT-01';
    await stockService.addStock(clinicId, {
        productId: product.id,
        quantity: 100,
        lotNumber,
        expirationDate: new Date('2030-01-01').toISOString(),
        invoiceNumber: 'INV-001',
        supplier: 'Test Supplier'
    });

    const lot = await prisma.stockLot.findFirst({ where: { lotNumber } });
    if (!lot) throw new Error('Lot not found');

    // 2. Create Quote with 1 Item (10 boxes)
    console.log('Creating Quote (10 boxes)...');
    let quote = await quotesService.create(clinicId, user.id, {
        customerId: customer.id,
        items: [{
            productId: product.id,
            quantityBoxes: 10,
            unitPriceCents: 10000,
            preferredLotId: lot.id
        }]
    });

    let itemId = quote.items[0].id;

    // 3. Reserve Stock
    console.log('Reserving Stock...');
    await quotesService.reserveStock(quote.id, clinicId);

    // Check Reservation
    let reservations = await prisma.stockReservation.findMany({ where: { quoteItemId: itemId, status: 'ACTIVE' } });
    console.log(`Reserved: ${reservations[0].quantity} (Expected: 10)`);
    if (reservations[0].quantity !== 10) throw new Error('Initial reservation mismatch');

    // 4. Update Item: DECREASE (10 -> 5)
    console.log('--- TEST 1: Decrease Quantity (10 -> 5) ---');
    await quotesService.updateItem(quote.id, itemId, clinicId, {
        quantityBoxes: 5
    });

    reservations = await prisma.stockReservation.findMany({ where: { quoteItemId: itemId, status: 'ACTIVE' } });
    console.log(`Reserved after decrease: ${reservations[0].quantity} (Expected: 5)`);

    if (reservations.length !== 1 || reservations[0].quantity !== 5) {
        throw new Error(`Decrease failed. Expected 5 reserved, got ${reservations[0]?.quantity}`);
    }

    // 5. Update Item: INCREASE (5 -> 20)
    console.log('--- TEST 2: Increase Quantity (5 -> 20) ---');
    await quotesService.updateItem(quote.id, itemId, clinicId, {
        quantityBoxes: 20
    });

    reservations = await prisma.stockReservation.findMany({ where: { quoteItemId: itemId, status: 'ACTIVE' } });
    console.log(`Reserved after increase: ${reservations[0].quantity} (Expected: 5 - no auto increase)`);

    if (reservations.length !== 1 || reservations[0].quantity !== 5) {
        throw new Error(`Increase check failed. Expected reservation to stay at 5, got ${reservations[0]?.quantity}`);
    }

    // 6. Add New Item
    console.log('--- TEST 3: Add Item ---');
    quote = await quotesService.addItem(quote.id, clinicId, {
        productId: product.id,
        quantityBoxes: 3,
        unitPriceCents: 10000
    });
    const newItemId = quote.items.find(i => i.id !== itemId)?.id;
    if (!newItemId) throw new Error('New item not found');

    const newRes = await prisma.stockReservation.findMany({ where: { quoteItemId: newItemId, status: 'ACTIVE' } });
    console.log(`New Item Reservations: ${newRes.length} (Expected: 0)`);
    if (newRes.length !== 0) throw new Error('Added item should not auto-reserve');

    // 7. Remove Item
    console.log('--- TEST 4: Remove Original Item ---');
    await quotesService.removeItem(quote.id, itemId, clinicId);

    reservations = await prisma.stockReservation.findMany({ where: { quoteItemId: itemId } }); // Check all
    const activeRes = reservations.filter(r => r.status === 'ACTIVE');
    const cancelledRes = reservations.filter(r => r.status === 'CANCELLED');

    console.log(`Active after remove: ${activeRes.length} (Expected: 0)`);
    console.log(`Cancelled after remove: ${cancelledRes.length} (Expected >= 1)`);

    if (activeRes.length > 0) throw new Error('Removing item failed to cancel reservations');

    console.log('Verification Success ✅');

    // Cleanup
    await prisma.stockReservation.deleteMany({ where: { clinicId } });
    await prisma.quoteItem.deleteMany({ where: { quote: { clinicId } } });
    await prisma.quote.deleteMany({ where: { clinicId } });
    await prisma.stockMovement.deleteMany({ where: { clinicId } });
    await prisma.stockLot.deleteMany({ where: { clinicId } });
    await prisma.product.deleteMany({ where: { clinicId } });
    await prisma.customer.deleteMany({ where: { clinicId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.clinic.delete({ where: { id: clinicId } });
}

main()
    .catch((e) => {
        console.error('Verification Failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        const prisma = new PrismaClient();
        await prisma.$disconnect();
    });
