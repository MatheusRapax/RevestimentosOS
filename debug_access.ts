
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔍 Starting Access Diagnosis...');

    // 1. Check Module Configuration for All Clinics
    console.log('\n🏢 CHECKING CLINIC MODULES:');
    const clinics = await prisma.clinic.findMany();
    for (const clinic of clinics) {
        console.log(`  - [${clinic.isActive ? 'ACTIVE' : 'INACTIVE'}] ${clinic.name} (${clinic.slug})`);
        console.log(`    Modules: ${clinic.modules?.join(', ') || 'NONE'}`);
    }

    // 2. Check Roles
    console.log('\n🎭 CHECKING ROLES:');
    const roles = await prisma.role.findMany({
        include: { _count: { select: { rolePermissions: true } } }
    });
    for (const role of roles) {
        console.log(`  - ${role.name} (${role.key}): ${role._count.rolePermissions} permissions`);
    }

    // 3. User Assignments (focusing on recent users)
    console.log('\n👤 CHECKING USER ASSIGNMENTS:');
    const users = await prisma.user.findMany({
        include: {
            clinicUsers: {
                include: {
                    clinic: true,
                    role: {
                        include: {
                            rolePermissions: {
                                include: { permission: true }
                            }
                        }
                    }
                }
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
    });

    for (const user of users) {
        console.log(`\n  User: ${user.name} (${user.email})`);
        console.log(`  SuperAdmin: ${user.isSuperAdmin}`);

        if (user.clinicUsers.length === 0) {
            console.log('  ⚠️ No clinics assigned.');
            continue;
        }

        for (const cu of user.clinicUsers) {
            console.log(`    -> Linked to: ${cu.clinic.name} (${cu.clinic.slug})`);
            console.log(`       Role: ${cu.role?.name || 'NONE'} (${cu.role?.key})`);
            console.log(`       Active Link: ${cu.active}`);

            if (cu.role) {
                const perms = cu.role.rolePermissions.map((rp: any) => rp.permission.key);
                console.log(`       Total Permissions: ${perms.length}`);

                // key checks
                const checks = ['customer.read', 'role.read', 'architect.read', 'stock.read'];
                const missing = checks.filter(p => !perms.includes(p));

                if (missing.length > 0) {
                    console.log(`       ❌ MISSING CRITICAL PERMISSIONS: ${missing.join(', ')}`);
                } else {
                    console.log(`       ✅ Has critical permissions (customer, role, architect)`);
                }
            } else {
                console.log('       ❌ NO ROLE ASSIGNED!');
            }
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
