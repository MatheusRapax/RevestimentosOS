import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPermissions() {
    console.log('🔐 Seeding RBAC permissions...');

    // 1. Create base permissions
    const permissions = [
        {
            key: 'PROFESSIONAL_READ',
            description: 'List professionals in a clinic',
        },
        {
            key: 'PROFESSIONAL_MANAGE',
            description: 'Create, activate, deactivate and remove professionals',
        },
        {
            key: 'CLINIC_ADMIN',
            description: 'Full administrative access to clinic resources',
        },
        {
            key: 'encounter.update',
            description: 'Update or delete encounters',
        },
        {
            key: 'audit.read',
            description: 'View audit logs',
        },
    ];

    for (const perm of permissions) {
        await prisma.permission.upsert({
            where: { key: perm.key },
            update: { description: perm.description },
            create: perm,
        });
        console.log(`  ✓ Permission: ${perm.key}`);
    }

    // 2. Ensure roles exist
    console.log('👥 Ensuring roles exist...');

    const roles = [
        { key: 'ADMIN', name: 'Administrator', description: 'Full administrative access' },
        { key: 'CLINIC_ADMIN', name: 'Clinic Administrator', description: 'Clinic-level administrative access' },
        { key: 'PROFESSIONAL', name: 'Professional', description: 'Healthcare professional' },
        { key: 'RECEPTIONIST', name: 'Receptionist', description: 'Front desk staff' },
    ];

    for (const role of roles) {
        await prisma.role.upsert({
            where: { key: role.key },
            update: {},
            create: role,
        });
        console.log(`  ✓ Role: ${role.key}`);
    }

    // 3. Fetch roles
    const adminRole = await prisma.role.findUnique({
        where: { key: 'ADMIN' },
    });
    const clinicAdminRole = await prisma.role.findUnique({
        where: { key: 'CLINIC_ADMIN' },
    });
    const professionalRole = await prisma.role.findUnique({
        where: { key: 'PROFESSIONAL' },
    });
    const receptionistRole = await prisma.role.findUnique({
        where: { key: 'RECEPTIONIST' },
    });

    if (!adminRole || !clinicAdminRole || !professionalRole || !receptionistRole) {
        throw new Error('Required roles not found. Run main seed first.');
    }

    // 4. Fetch permissions
    const professionalRead = await prisma.permission.findUnique({
        where: { key: 'PROFESSIONAL_READ' },
    });
    const professionalManage = await prisma.permission.findUnique({
        where: { key: 'PROFESSIONAL_MANAGE' },
    });
    const clinicAdmin = await prisma.permission.findUnique({
        where: { key: 'CLINIC_ADMIN' },
    });
    const encounterUpdate = await prisma.permission.findUnique({
        where: { key: 'encounter.update' },
    });
    const auditRead = await prisma.permission.findUnique({
        where: { key: 'audit.read' },
    });

    if (!professionalRead || !professionalManage || !clinicAdmin) {
        throw new Error('Permissions not created properly');
    }

    // 5. Assign permissions to roles
    console.log('🔗 Assigning permissions to roles...');

    // ADMIN gets all permissions
    const adminPermissions = [
        { roleId: adminRole.id, permissionId: clinicAdmin.id },
        { roleId: adminRole.id, permissionId: professionalRead.id },
        { roleId: adminRole.id, permissionId: professionalManage.id },
    ];

    for (const rp of adminPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: rp.roleId,
                    permissionId: rp.permissionId,
                },
            },
            update: {},
            create: rp,
        });
    }
    console.log(`  ✓ ADMIN role: 3 permissions`);

    // CLINIC_ADMIN gets all permissions (same as ADMIN for professionals + extra)
    const clinicAdminPermissions = [
        { roleId: clinicAdminRole.id, permissionId: clinicAdmin.id },
        { roleId: clinicAdminRole.id, permissionId: professionalRead.id },
        { roleId: clinicAdminRole.id, permissionId: professionalManage.id },
        ...(encounterUpdate ? [{ roleId: clinicAdminRole.id, permissionId: encounterUpdate.id }] : []),
        ...(auditRead ? [{ roleId: clinicAdminRole.id, permissionId: auditRead.id }] : []),
    ];

    for (const rp of clinicAdminPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: rp.roleId,
                    permissionId: rp.permissionId,
                },
            },
            update: {},
            create: rp,
        });
    }
    console.log(`  ✓ CLINIC_ADMIN role: ${clinicAdminPermissions.length} permissions`);

    // PROFESSIONAL gets read-only
    await prisma.rolePermission.upsert({
        where: {
            roleId_permissionId: {
                roleId: professionalRole.id,
                permissionId: professionalRead.id,
            },
        },
        update: {},
        create: {
            roleId: professionalRole.id,
            permissionId: professionalRead.id,
        },
    });
    console.log(`  ✓ PROFESSIONAL role: 1 permission`);

    // RECEPTIONIST gets read-only
    await prisma.rolePermission.upsert({
        where: {
            roleId_permissionId: {
                roleId: receptionistRole.id,
                permissionId: professionalRead.id,
            },
        },
        update: {},
        create: {
            roleId: receptionistRole.id,
            permissionId: professionalRead.id,
        },
    });
    console.log(`  ✓ RECEPTIONIST role: 1 permission`);

    console.log('✅ RBAC permissions seeded successfully!');
}

seedPermissions()
    .catch((e) => {
        console.error('❌ Error seeding permissions:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
