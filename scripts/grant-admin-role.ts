import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function grantAdminRole() {
    // Get user
    const user = await prisma.user.findUnique({
        where: { email: 'teste@clinicos.com' },
        include: { clinicUsers: { include: { role: true, clinic: true } } }
    });

    if (!user) {
        console.log('❌ User not found');
        return;
    }

    console.log('✅ User found:', user.email);
    console.log('Current clinic users:', user.clinicUsers.length);

    for (const cu of user.clinicUsers) {
        console.log(`  - Clinic: ${cu.clinic.name}, Role: ${cu.role?.name || 'No role'}`);
    }

    // Get ADMIN role
    const adminRole = await prisma.role.findUnique({
        where: { key: 'CLINIC_ADMIN' }
    });

    if (!adminRole) {
        console.log('❌ ADMIN role not found. Running seed first...');
        return;
    }

    console.log('✅ ADMIN role found:', adminRole.name);

    // Update all clinic users to ADMIN
    for (const clinicUser of user.clinicUsers) {
        await prisma.clinicUser.update({
            where: { id: clinicUser.id },
            data: { roleId: adminRole.id }
        });
        console.log(`✅ Updated clinic "${clinicUser.clinic.name}" to ADMIN role`);
    }

    console.log('🎉 User now has ADMIN role in all clinics!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Logout from frontend');
    console.log('2. Login again');
    console.log('3. Access /dashboard/agenda');

    await prisma.$disconnect();
}

grantAdminRole().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
});
