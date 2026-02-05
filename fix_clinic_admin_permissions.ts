
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Fixing CLINIC_ADMIN Permissions...');

    // 1. Find or Create CLINIC_ADMIN role
    const roleKey = 'CLINIC_ADMIN';
    let role = await prisma.role.findUnique({ where: { key: roleKey } });

    if (!role) {
        console.log(`Creating ${roleKey} role...`);
        role = await prisma.role.create({
            data: {
                key: roleKey,
                name: 'Administrador da Clínica',
                description: 'Administração total da unidade/loja'
            }
        });
    }

    // 2. Get All Permissions
    const allPermissions = await prisma.permission.findMany();
    console.log(`Found ${allPermissions.length} total permissions in system.`);

    // 3. Assign All Permissions to CLINIC_ADMIN
    let assignedCount = 0;
    for (const perm of allPermissions) {
        // Upsert to avoid duplicates
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: role.id,
                    permissionId: perm.id
                }
            },
            update: {},
            create: {
                roleId: role.id,
                permissionId: perm.id
            }
        });
        assignedCount++;
    }

    console.log(`✅ Successfully assigned ${assignedCount} permissions to ${role.name} (${role.key})`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
