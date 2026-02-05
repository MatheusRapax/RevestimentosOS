
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying ADMIN Role Permissions...');

    const adminRole = await prisma.role.findUnique({
        where: { key: 'ADMIN' },
        include: {
            rolePermissions: {
                include: {
                    permission: true
                }
            }
        }
    });

    if (!adminRole) {
        console.error('❌ Role ADMIN not found!');
        return;
    }

    console.log(`✅ Role found: ${adminRole.name} (${adminRole.key})`);
    console.log(`📊 Total Permissions: ${adminRole.rolePermissions.length}`);

    const permissions = adminRole.rolePermissions.map(rp => rp.permission.key);

    const checkList = [
        'customer.read',
        'architect.read',
        'order.read',
        'clinic.read'
    ];

    console.log('\nChecking specific permissions:');
    checkList.forEach(key => {
        const has = permissions.includes(key);
        console.log(`${has ? '✅' : '❌'} ${key}`);
    });

    if (adminRole.rolePermissions.length < 50) {
        console.log('\nWarning: ADMIN role seems to have very few permissions. Seed might not have completed.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
