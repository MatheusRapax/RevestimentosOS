
import { randomUUID } from 'crypto';

const API_URL = 'http://localhost:3000';
const EMAIL = 'admin@revestimentos.com';
const PASSWORD = '123456';

async function main() {
    console.log('🚀 Starting Verification: Reservation Logic V2');

    // 1. Login
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });

    if (!loginRes.ok) {
        throw new Error(`Login failed: ${loginRes.status}`);
    }

    const { access_token, user, clinics } = await loginRes.json();
    console.log('User logged in:', user.email);

    // Correctly get clinicId from top-level clinics array
    const clinicId = clinics?.[0]?.id;

    if (!clinicId) {
        console.error('Clinics Response:', JSON.stringify(clinics, null, 2));
        throw new Error('No clinicId found in response');
    }

    console.log('Using ClinicId:', clinicId);

    const token = access_token;
    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Clinic-Id': clinicId
    };

    console.log('✅ Generic Login Success');

    // 2. Get a Product with Stock
    const productsRes = await fetch(`${API_URL}/stock/products?search=Carrara`, { headers });
    const products = await productsRes.json();
    const product = products[0];

    if (!product) throw new Error('Product not found (Carrara)');

    console.log(`📦 Using Product: ${product.name} (Stock: ${product.totalStock})`);

    // 3. Get a Customer
    const customersRes = await fetch(`${API_URL}/customers`, { headers });
    const customers = await customersRes.json();
    const customer = customers[0];

    if (!customer) throw new Error('Customer not found');

    // 4. Create Quote 1 (General Reservation)
    const quote1Payload = {
        customerId: customer.id,
        items: [
            {
                productId: product.id,
                quantityBoxes: 5,
                unitPriceCents: product.priceCents || 10000,
            }
        ]
    };

    const quote1Res = await fetch(`${API_URL}/quotes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(quote1Payload)
    });
    const quote1 = await quote1Res.json();
    console.log(`📝 Quote 1 Created: #${quote1.number}`);

    // 5. Reserve Stock for Quote 1
    console.log('🔄 Reserving Stock for Quote 1...');
    const reserve1Res = await fetch(`${API_URL}/quotes/${quote1.id}/reserve`, {
        method: 'POST', headers
    });
    const reserve1Data = await reserve1Res.json();
    console.log('Reserve 1 Result:', JSON.stringify(reserve1Data, null, 2));

    // 6. Reserve Stock for Quote 1 AGAIN (Idempotency Check)
    console.log('🔄 Reserving Stock for Quote 1 AGAIN...');
    const reserve2Res = await fetch(`${API_URL}/quotes/${quote1.id}/reserve`, {
        method: 'POST', headers
    });
    const reserve2Data = await reserve2Res.json();
    console.log('Reserve 2 Result:', JSON.stringify(reserve2Data, null, 2));

    if (reserve2Data.results && reserve2Data.results[0].reserved > 0 && reserve2Data.results[0].newlyReserved === 0) {
        console.log('✅ Idempotency Verified: No new stock reserved.');
    } else {
        console.error('❌ Idempotency FAILED: Stock was reserved again or unexpected response!');
    }

    // 7. Create Quote 2 with PREFERRED LOT
    const lot = product.lots.find((l: any) => l.quantity > 10);
    if (!lot) throw new Error('No valid lot found for testing');

    console.log(`🎯 Testing Preferred Lot: ${lot.lotNumber}`);

    const quote2Payload = {
        customerId: customer.id,
        items: [
            {
                productId: product.id,
                quantityBoxes: 3,
                unitPriceCents: product.priceCents || 10000,
                preferredLotId: lot.id // Use preferred lot
            }
        ]
    };

    const quote2Res = await fetch(`${API_URL}/quotes`, {
        method: 'POST',
        headers,
        body: JSON.stringify(quote2Payload)
    });
    const quote2 = await quote2Res.json();
    console.log(`📝 Quote 2 Created: #${quote2.number} (Pref Lot: ${lot.lotNumber})`);

    // 8. Reserve Quote 2
    console.log('🔄 Reserving Stock for Quote 2...');
    const reserve3Res = await fetch(`${API_URL}/quotes/${quote2.id}/reserve`, {
        method: 'POST', headers
    });
    const reserve3Data = await reserve3Res.json();
    console.log('Reserve 3 Result:', JSON.stringify(reserve3Data, null, 2));

    // 9. Verify Availability Endpoint
    const availRes = await fetch(`${API_URL}/quotes/${quote2.id}/availability`, { headers });
    const availData = await availRes.json();
    console.log('Availability Check:', JSON.stringify(availData, null, 2));

    console.log('✅ Verification Completed');
}

main().catch(console.error);
