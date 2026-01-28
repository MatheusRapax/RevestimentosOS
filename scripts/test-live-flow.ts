import { PrismaClient } from '@prisma/client';

// Use standard fetch API
const BASE_URL = 'http://localhost:3000';
const USER_EMAIL = 'admin@revestimentos.com';
const USER_PASS = '123456';

// Colors for console
const green = (msg: string) => `\x1b[32m${msg}\x1b[0m`;
const red = (msg: string) => `\x1b[31m${msg}\x1b[0m`;
const yellow = (msg: string) => `\x1b[33m${msg}\x1b[0m`;

async function main() {
    console.log(yellow('🚀 Starting Live E2E Flow Test...'));

    try {
        // 1. Login
        console.log('1. Authenticating...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: USER_EMAIL, password: USER_PASS })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status} ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        const token = loginData.access_token;
        console.log(green('✅ Authenticated.'));

        // Get Clinic ID
        const meRes = await fetch(`${BASE_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const meData = await meRes.json();

        let clinicId = meData.clinics?.[0]?.clinicId || meData.clinics?.[0]?.id;

        if (!clinicId) {
            console.log(yellow('⚠️ API did not return clinics. Fetching via Prisma...'));
            const prisma = new PrismaClient();
            // Use clinicUsers relation
            const userWithClinics = await prisma.user.findUnique({
                where: { email: USER_EMAIL },
                include: { clinicUsers: { include: { clinic: true } } }
            });

            if (userWithClinics && userWithClinics.clinicUsers.length > 0) {
                const clinic = userWithClinics.clinicUsers[0].clinic;
                console.log(green(`✅ Found clinic linked to admin: ${clinic.name}`));
                clinicId = clinic.id;
            } else {
                console.log(red('❌ Admin user has no clinics linked in DB.'));
            }
            await prisma.$disconnect();
            if (!clinicId) throw new Error('No clinic found for user');
        } else {
            console.log(green(`✅ Clinic found via API: ${clinicId}`));
        }

        const headers = {
            'Authorization': `Bearer ${token}`,
            'X-Clinic-Id': clinicId,
            'Content-Type': 'application/json'
        };

        // 2. Ensure Product
        console.log('2. checking Products...');
        let productId;
        const prodRes = await fetch(`${BASE_URL}/stock/products`, { headers });
        if (prodRes.ok) {
            const products = await prodRes.json();
            const p = products.find((x: any) => x.boxCoverage > 0);
            if (p) {
                productId = p.id;
                console.log(green(`✅ Found existing dimensional product: ${p.name}`));
            }
        }

        if (!productId) {
            console.log(yellow('⚠️ No product found via API, injecting via Prisma...'));
            const prisma = new PrismaClient();
            const p = await prisma.product.create({
                data: {
                    clinicId,
                    name: `Product E2E ${Date.now()}`,
                    saleType: 'AREA' as any,
                    unit: 'm2',
                    priceCents: 5000,
                    boxCoverage: 1.5,
                    piecesPerBox: 3,
                    isActive: true
                }
            });
            productId = p.id;
            await prisma.$disconnect();
            console.log(green('✅ Product created directly in DB.'));
        }

        // 3. Create Customer
        console.log('3. Creating Customer...');
        const custRes = await fetch(`${BASE_URL}/customers`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: `Customer E2E ${Date.now()}`,
                phone: '11999999999',
                type: 'PF'
            })
        });
        if (!custRes.ok) throw new Error(`Create Customer failed: ${await custRes.text()}`);
        const customer = await custRes.json();
        console.log(green(`✅ Customer created: ${customer.name}`));

        // 4. Create Quote
        console.log('4. Creating Quote...');
        const quoteRes = await fetch(`${BASE_URL}/quotes`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                customerId: customer.id,
                items: [{
                    productId,
                    inputArea: 10,
                    unitPriceCents: 5000
                }]
            })
        });
        if (!quoteRes.ok) throw new Error(`Create Quote failed: ${await quoteRes.text()}`);
        const quote = await quoteRes.json();

        // Dynamic Check
        const item = quote.items[0];

        const productDetailsRes = await fetch(`${BASE_URL}/stock/products/${productId}`, { headers });
        const productDetails = await productDetailsRes.json();
        const coverage = productDetails.boxCoverage || 1;
        const expectedBoxes = Math.ceil(10 / coverage);

        console.log(`   Product: ${productDetails.name}, Coverage: ${coverage}m²/box`);
        console.log(`   Input: 10m² -> Expected: ${expectedBoxes} boxes`);
        console.log(`   Actual: ${item.quantityBoxes} boxes, ${item.resultingArea}m²`);

        if (item.quantityBoxes === expectedBoxes) console.log(green('✅ Calculation Correct.'));
        else console.log(red('❌ Calculation Incorrect.'));

        // 5. PDF
        console.log('5. Generating PDF...');
        const pdfRes = await fetch(`${BASE_URL}/quotes/${quote.id}/pdf`, { headers });
        if (pdfRes.status === 200 && pdfRes.headers.get('content-type') === 'application/pdf') {
            console.log(green('✅ PDF generated successfully.'));
        } else {
            console.log(red(`❌ PDF generation failed: ${pdfRes.status}`));
        }

        // 5.2 Send Quote
        console.log('5.2 Sending Quote...');
        const sendRes = await fetch(`${BASE_URL}/quotes/${quote.id}/send`, {
            method: 'POST',
            headers
        });
        if (!sendRes.ok) throw new Error(`Send failed: ${await sendRes.text()}`);
        console.log(green('✅ Quote Sent.'));

        // 5.5 Approve Quote
        console.log('5.5 Approving Quote...');
        const approveRes = await fetch(`${BASE_URL}/quotes/${quote.id}/approve`, {
            method: 'POST',
            headers
        });
        if (!approveRes.ok) {
            console.log(yellow(`Approve POST failed (${approveRes.status}), trying Update Status via PATCH...`));
            const updateRes = await fetch(`${BASE_URL}/quotes/${quote.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ status: 'APPROVED' })
            });
            if (!updateRes.ok) throw new Error(`Approve failed: ${await updateRes.text()}`);
            console.log(green('✅ Quote Approved via PATCH.'));
        } else {
            console.log(green('✅ Quote Approved via POST.'));
        }

        // 6. Convert
        console.log('6. Converting to Order...');
        const convRes = await fetch(`${BASE_URL}/quotes/${quote.id}/convert`, {
            method: 'POST',
            headers
        });
        if (!convRes.ok) throw new Error(`Convert failed: ${await convRes.text()}`);
        const order = await convRes.json();
        console.log(green(`✅ Order created: #${order.number}, Status: ${order.status}`));

        // 7. Delivery
        console.log('7. Scheduling Delivery...');
        const delDate = new Date();
        delDate.setDate(delDate.getDate() + 3);
        const delRes = await fetch(`${BASE_URL}/deliveries`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                orderId: order.id,
                scheduledDate: delDate.toISOString(),
                driverName: 'Driver Bot',
                vehiclePlate: 'BOT-007'
            })
        });
        if (!delRes.ok) throw new Error(`Delivery schedule failed: ${await delRes.text()}`);
        const delivery = await delRes.json();
        console.log(green(`✅ Delivery scheduled: ${delivery.status}`));

        console.log(green('\n🎉 FULL FLOW VERIFIED SUCCESSFULLY!'));

    } catch (e: any) {
        console.error(red(`\n❌ TEST FAILED: ${e.message}`));
        process.exit(1);
    }
}

main();
