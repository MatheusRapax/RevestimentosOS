
import { PrismaClient, QuoteStatus, OrderStatus, ReservationType, StockMovementType } from '@prisma/client';
import { QuotesService } from '../src/modules/quotes/quotes.service';
import { OrdersService } from '../src/modules/orders/orders.service';
import { StockService } from '../src/modules/stock/stock.service';
import { StockReservationsService } from '../src/modules/stock-reservations/stock-reservations.service';
import { AuditService } from '../src/core/audit/audit.service';
import { PrismaService } from '../src/core/prisma/prisma.service';

// Mock NestJS dependency injection by manually instantiating services
async function main() {
    console.log('Starting Reservation Flow Verification...');

    const prisma = new PrismaClient();
    // Wrap PrismaClient to look like PrismaService (which extends it)
    const prismaService = prisma as unknown as PrismaService;

    const auditService = new AuditService(prismaService);
    const stockService = new StockService(prismaService, auditService);
    const stockReservationsService = new StockReservationsService(prismaService);
    const quotesService = new QuotesService(prismaService, stockService, stockReservationsService);
    const ordersService = new OrdersService(prismaService); // We might need this for clean up or extra checks

    // 1. Setup Data
    const clinicId = 'test-clinic-' + Date.now();
    const userId = 'test-seller-' + Date.now();

    console.log(`Creating test data for clinic: ${clinicId}`);

    // Create User (Seller)
    const user = await prisma.user.create({
        data: {
            id: userId,
            email: `test-${Date.now()}@test.com`,
            name: 'Test Seller',
            password: 'hash',
        }
    });

    // Create Clinic
    // We create clinic separately to avoid complex nested creates that might fail validation
    await prisma.clinic.create({
        data: {
            id: clinicId,
            name: 'Test Retail Clinic',
            slug: 'test-retail-' + Date.now()
        }
    });

    // Create Customer
    const customer = await prisma.customer.create({
        data: {
            clinicId,
            name: 'Test Customer',
            phone: '999',
            email: 'customer@test.com',
            document: '12345678900'
        }
    });

    // Create Product
    const product = await prisma.product.create({
        data: {
            clinicId,
            name: 'Porcelanato Teste flow',
            sku: `SKU-${Date.now()}`,
            priceCents: 10000,
            boxCoverage: 2.0, // 2m² per box
            isActive: true
        }
    });

    // Add Stock (100 boxes)
    const lotNumber = 'LOTE-TEST-001';
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

    console.log('Stock added. Available:', 100);

    // 2. Create Quote
    console.log('Creating Quote...');
    const quote = await quotesService.create(clinicId, user.id, {
        customerId: customer.id,
        items: [{
            productId: product.id,
            quantityBoxes: 10,
            unitPriceCents: 10000,
            preferredLotId: lot.id
        }]
    });

    // 3. Reserve Stock
    console.log('Reserving Stock for Quote...');
    await quotesService.reserveStock(quote.id, clinicId);

    // Verify Reservation
    const reservationsBeforeOrder = await prisma.stockReservation.findMany({
        where: { quoteId: quote.id }
    });

    if (reservationsBeforeOrder.length === 0) throw new Error('No reservations created');
    if (reservationsBeforeOrder[0].status !== 'ACTIVE') throw new Error('Reservation not ACTIVE');
    if (reservationsBeforeOrder[0].type !== ReservationType.ORCAMENTO) throw new Error('Reservation type mismatch (expected ORCAMENTO)');

    console.log('Reservation verified (Quote stage). Quantity:', reservationsBeforeOrder[0].quantity);

    // 4. Approve and Convert to Order
    console.log('Approving Quote...');
    await quotesService.sendQuote(quote.id, clinicId);
    await quotesService.approveQuote(quote.id, clinicId);

    console.log('Converting to Order...');
    const order = await quotesService.convertToOrder(quote.id, clinicId, user.id);

    // Verify Reservation Transfer
    const reservationsAfterOrder = await prisma.stockReservation.findMany({
        where: { quoteId: quote.id } // Still linked to quote
    });

    if (reservationsAfterOrder[0].orderId !== order.id) throw new Error('Reservation not linked to Order');
    if (reservationsAfterOrder[0].type !== ReservationType.PEDIDO) throw new Error('Reservation type not updated to PEDIDO');
    if (reservationsAfterOrder[0].status !== 'ACTIVE') throw new Error('Reservation should still be ACTIVE');

    console.log('Reservation transferred to Order successfully.');

    // 5. Remove Stock (Checkout)
    console.log('Removing Stock (Stock Exit)...');

    // We are removing 10 items for this order
    await stockService.removeStock(clinicId, {
        productId: product.id,
        quantity: 10,
        orderId: order.id,
        reason: 'Client Pickup'
    });

    // Verify Reservation Consumption
    const reservationsAfterExit = await prisma.stockReservation.findMany({
        where: { quoteId: quote.id }
    });

    if (reservationsAfterExit[0].status !== 'CONSUMED') throw new Error(`Reservation status is ${reservationsAfterExit[0].status}, expected CONSUMED`);
    if (reservationsAfterExit[0].quantity !== 0) throw new Error(`Reservation quantity is ${reservationsAfterExit[0].quantity}, expected 0`);

    console.log('Reservation CONSUMED successfully.');

    // Verify Total Stock
    const finalProductParams = await stockService.findOne(product.id, clinicId);
    // Total stock should be 90 (100 - 10)
    // Available stock should be 90
    // Reserved should be 0

    if (finalProductParams.totalStock !== 90) throw new Error(`Total Stock mismatch: ${finalProductParams.totalStock}`);
    if (finalProductParams.availableStock !== 90) throw new Error(`Available Stock mismatch: ${finalProductParams.availableStock} (Reserved: ${finalProductParams.totalReserved})`);

    console.log('Final Stock States verified. Flow Complete ✅');

    // Cleanup
    await prisma.stockMovement.deleteMany({ where: { clinicId } });
    await prisma.stockReservation.deleteMany({ where: { clinicId } });
    await prisma.orderItem.deleteMany({ where: { order: { clinicId } } }); // Cascade usually handles this but being safe
    await prisma.order.deleteMany({ where: { clinicId } });
    await prisma.quoteItem.deleteMany({ where: { quote: { clinicId } } });
    await prisma.quote.deleteMany({ where: { clinicId } });
    await prisma.stockLot.deleteMany({ where: { clinicId } });
    await prisma.product.deleteMany({ where: { clinicId } });
    await prisma.customer.deleteMany({ where: { clinicId } });
    await prisma.clinicUser.deleteMany({ where: { clinicId } }); // If created via relation
    // Clinic and User are harder to delete due to constraints, ignoring for dev DB verification script

    console.log('Cleanup mostly done.');
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
