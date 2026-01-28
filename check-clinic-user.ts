import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserClinicAssociation() {
    const userId = '82f9937a-d5e7-49fb-a8c6-2e295405f92d';
    const clinicId = 'f67d366e-e4e0-4c15-98a6-89ae5482439e';

    console.log('🔍 Checking user-clinic association...');
    console.log('User ID:', userId);
    console.log('Clinic ID:', clinicId);
    console.log('');

    // Check if ClinicUser exists
    const clinicUser = await prisma.clinicUser.findFirst({
        where: {
            userId: userId,
            clinicId: clinicId
        },
        include: {
            role: {
                include: {
                    permissions: {
                        include: {
                            permission: true
                        }
                    }
                }
            },
            user: true,
            clinic: true
        }
    });

    if (!clinicUser) {
        console.log('❌ ClinicUser NOT FOUND!');
        console.log('This user is not associated with this clinic.');
        console.log('');
        console.log('Creating association now...');

        // Get ADMIN role
        const adminRole = await prisma.role.findUnique({
            where: { key: 'CLINIC_ADMIN' }
        });

        if (!adminRole) {
            console.log('❌ ADMIN role not found');
            return;
        }

        // Create ClinicUser
        const newClinicUser = await prisma.clinicUser.create({
            data: {
                userId: userId,
                clinicId: clinicId,
                roleId: adminRole.id
            }
        });

        console.log('✅ ClinicUser created:', newClinicUser.id);
        console.log('Role: ADMIN');
    } else {
        console.log('✅ ClinicUser found:', clinicUser.id);
        console.log('User:', clinicUser.user.email);
        console.log('Clinic:', clinicUser.clinic.name);
        console.log('Role:', clinicUser.role?.name || 'No role');
        console.log('');
        console.log('Permissions:');

        if (clinicUser.role) {
            const permissions = clinicUser.role.permissions.map(rp => rp.permission.key);
            console.log(permissions.join(', '));

            const hasAppointmentRead = permissions.includes('appointment.read');
            console.log('');
            console.log('Has appointment.read?', hasAppointmentRead ? '✅ YES' : '❌ NO');
        } else {
            console.log('❌ No role assigned!');
        }
    }

    await prisma.$disconnect();
}

checkUserClinicAssociation().catch(console.error);
