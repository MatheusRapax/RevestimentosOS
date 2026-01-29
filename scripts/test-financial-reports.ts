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
    console.log(yellow('🚀 Starting Financial Reports Verification...'));

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

        // 2. Get Clinic ID
        const meRes = await fetch(`${BASE_URL}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const meData = await meRes.json();
        let clinicId = meData.clinics?.[0]?.clinicId || meData.clinics?.[0]?.id;

        if (!clinicId) {
            console.log(yellow('⚠️ API did not return clinics. Fetching via Prisma...'));
            const prisma = new PrismaClient();
            const userWithClinics = await prisma.user.findUnique({
                where: { email: USER_EMAIL },
                include: { clinicUsers: { include: { clinic: true } } }
            });

            if (userWithClinics && userWithClinics.clinicUsers.length > 0) {
                const clinic = userWithClinics.clinicUsers[0].clinic;
                clinicId = clinic.id;
            } else {
                throw new Error('No clinic found for user');
            }
            await prisma.$disconnect();
        }
        console.log(green(`✅ Clinic Context: ${clinicId}`));

        const headers = {
            'Authorization': `Bearer ${token}`,
            'X-Clinic-Id': clinicId,
            'Content-Type': 'application/json'
        };

        // 3. Test Seller Performance Endpoint
        console.log('3. Testing /dashboard/finance/sellers ...');
        const sellersRes = await fetch(`${BASE_URL}/dashboard/finance/sellers?startDate=2020-01-01&endDate=2030-12-31`, { headers });

        if (!sellersRes.ok) throw new Error(`Sellers endpoint failed: ${await sellersRes.text()}`);
        const sellersData = await sellersRes.json();

        console.log(`   Sellers Found: ${sellersData.sellers.length}`);
        console.log(`   Total Revenue: ${sellersData.totals.totalRevenue}`);

        // Assertions
        if (!Array.isArray(sellersData.sellers)) throw new Error('Sellers data is not an array');
        if (typeof sellersData.totals.totalRevenue !== 'number') throw new Error('Total Revenue is not a number');

        console.log(green('✅ Sellers Report Structure OK.'));

        // 4. Test Architect Performance Endpoint
        console.log('4. Testing /dashboard/finance/architects ...');
        const archRes = await fetch(`${BASE_URL}/dashboard/finance/architects?startDate=2020-01-01&endDate=2030-12-31`, { headers });

        if (!archRes.ok) throw new Error(`Architects endpoint failed: ${await archRes.text()}`);
        const archData = await archRes.json();

        console.log(`   Architects Found: ${archData.length}`);

        if (!Array.isArray(archData)) throw new Error('Architects data is not an array');
        if (archData.length > 0 && typeof archData[0].stats.commissionTotal !== 'number') {
            throw new Error('Architect stats structure invalid');
        }

        console.log(green('✅ Architects Report Structure OK.'));

        console.log(green('\n🎉 FINANCIAL REPORTS VERIFIED SUCCESSFULLY!'));

    } catch (e: any) {
        console.error(red(`\n❌ TEST FAILED: ${e.message}`));
        process.exit(1);
    }
}

main();
