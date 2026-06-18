const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixClinicUserAssociation() {
    const userId = '82f9937a-d5e7-49fb-a8c6-2e295405f92d';
    const clinicId = 'f67d366e-e4e0-4c15-98a6-89ae5482439e';

    console.log('🔍 Checking ClinicUser association...');

    // Check if exists
    const existing = await prisma.clinicUser.findFirst({
        where: { userId, clinicId }
    });

    if (existing) {
        console.log('✅ ClinicUser already exists:', existing.id);
        return;
    }

    console.log('❌ ClinicUser NOT FOUND');
    console.log('Creating association...');

    // Get ADMIN role
    const adminRole = await prisma.role.findUnique({
        where: { key: 'CLINIC_ADMIN' }
    });

    if (!adminRole) {
        console.log('❌ ADMIN role not found!');
        await prisma.$disconnect();
        return;
    }

    // Create ClinicUser
    const newClinicUser = await prisma.clinicUser.create({
        data: {
            userId,
            clinicId,
            roleId: adminRole.id
        }
    });

    console.log('✅ ClinicUser created:', newClinicUser.id);
    console.log('');
    console.log('🎉 Done! Now try accessing /dashboard/agenda again');

    await prisma.$disconnect();
}

fixClinicUserAssociation().catch(console.error);
