import 'dotenv/config';
import { PrismaClient, CustomerType, SaleType, QuoteStatus, OrderStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // =========================================
    // 1. PERMISSIONS (including new Sales permissions)
    // =========================================
    const permissions = [
        // Clinic
        { key: 'clinic.settings.manage', description: 'Gerenciar configurações da loja' },
        { key: 'clinic.read', description: 'Visualizar dados da loja' },
        { key: 'clinic.update', description: 'Atualizar dados da loja' },
        { key: 'clinic.delete', description: 'Deletar loja' },
        // User
        { key: 'user.read', description: 'Visualizar usuários' },
        { key: 'user.create', description: 'Criar usuários' },
        { key: 'user.update', description: 'Atualizar usuários' },
        { key: 'user.delete', description: 'Deletar usuários' },
        { key: 'user.invite', description: 'Convidar usuários' },
        // Customer (NEW - Sales)
        { key: 'customer.read', description: 'Visualizar clientes' },
        { key: 'customer.create', description: 'Criar clientes' },
        { key: 'customer.update', description: 'Atualizar clientes' },
        { key: 'customer.delete', description: 'Deletar clientes' },
        // Architect (NEW - Sales)
        { key: 'architect.read', description: 'Visualizar arquitetos' },
        { key: 'architect.create', description: 'Criar arquitetos' },
        { key: 'architect.update', description: 'Atualizar arquitetos' },
        { key: 'architect.delete', description: 'Deletar arquitetos' },
        // Quote (NEW - Sales)
        { key: 'quote.read', description: 'Visualizar orçamentos' },
        { key: 'quote.create', description: 'Criar orçamentos' },
        { key: 'quote.update', description: 'Atualizar orçamentos' },
        { key: 'quote.delete', description: 'Deletar orçamentos' },
        { key: 'quote.send', description: 'Enviar orçamentos' },
        { key: 'quote.convert', description: 'Converter orçamento em pedido' },
        // Order (NEW - Sales)
        { key: 'order.read', description: 'Visualizar pedidos' },
        { key: 'order.create', description: 'Criar pedidos' },
        { key: 'order.update', description: 'Atualizar pedidos' },
        { key: 'order.cancel', description: 'Cancelar pedidos' },
        // Promotion (NEW - Sales)
        { key: 'promotion.read', description: 'Visualizar promoções' },
        { key: 'promotion.create', description: 'Criar promoções' },
        { key: 'promotion.update', description: 'Atualizar promoções' },
        { key: 'promotion.delete', description: 'Deletar promoções' },
        // Delivery (NEW - Sales)
        { key: 'delivery.read', description: 'Visualizar entregas' },
        { key: 'delivery.create', description: 'Agendar entregas' },
        { key: 'delivery.update', description: 'Atualizar entregas' },
        { key: 'delivery.update', description: 'Atualizar entregas' },

        // Product Catalog (Cadastro de Produtos)
        { key: 'product.create', description: 'Criar produtos' },
        { key: 'product.read', description: 'Visualizar catálogo de produtos' },
        { key: 'product.update', description: 'Atualizar produtos' },
        { key: 'product.delete', description: 'Excluir produtos' },

        // Suppliers
        { key: 'supplier.read', description: 'Visualizar fornecedores' },
        { key: 'supplier.create', description: 'Criar fornecedores' },
        { key: 'supplier.update', description: 'Atualizar fornecedores' },
        { key: 'supplier.delete', description: 'Deletar fornecedores' },

        // Categories
        { key: 'catalogue.settings', description: 'Gerenciar configurações do catálogo' },
        { key: 'category.read', description: 'Visualizar categorias' },
        { key: 'category.create', description: 'Criar categorias' },
        { key: 'category.update', description: 'Atualizar categorias' },
        { key: 'category.delete', description: 'Deletar categorias' },

        // Brands
        { key: 'brand.read', description: 'Visualizar marcas' },
        { key: 'brand.create', description: 'Criar marcas' },
        { key: 'brand.update', description: 'Atualizar marcas' },
        { key: 'brand.delete', description: 'Deletar marcas' },

        // Stock Operations (Estoque Físico)
        { key: 'stock.view', description: 'Visualizar saldos de estoque' },
        { key: 'stock.adjust', description: 'Realizar ajustes de estoque' },

        // RMA Operations
        { key: 'rma.read', description: 'Visualizar avarias e devoluções' },
        { key: 'rma.manage', description: 'Gerenciar avarias e devoluções' },
        // { key: 'stock.read', description: 'Visualizar estoque' }, // DEPRECATED
        // { key: 'stock.create', description: 'Criar itens de estoque' }, // DEPRECATED
        // { key: 'stock.update', description: 'Atualizar itens de estoque' }, // DEPRECATED

        // Finance
        { key: 'finance.read', description: 'Visualizar financeiro' },
        { key: 'finance.charge', description: 'Gerar cobranças' },
        { key: 'finance.payment', description: 'Registrar pagamentos' },
        // Audit
        { key: 'audit.read', description: 'Visualizar logs de auditoria' },
        // Legacy (hidden but kept for system compatibility)
        { key: 'patient.read', description: 'Visualizar pacientes' },
        { key: 'patient.create', description: 'Criar pacientes' },
        { key: 'patient.update', description: 'Atualizar pacientes' },
        { key: 'patient.delete', description: 'Deletar pacientes' },
        { key: 'appointment.read', description: 'Visualizar agendamentos' },
        { key: 'appointment.create', description: 'Criar agendamentos' },
        { key: 'appointment.update', description: 'Atualizar agendamentos' },
        { key: 'appointment.delete', description: 'Deletar agendamentos' },
        { key: 'appointment.cancel', description: 'Cancelar agendamentos' },
        { key: 'appointment.checkin', description: 'Fazer check-in de agendamentos' },
        { key: 'encounter.read', description: 'Visualizar atendimentos' },
        { key: 'encounter.start', description: 'Iniciar atendimentos' },
        { key: 'encounter.close', description: 'Finalizar atendimentos' },
        { key: 'record.read', description: 'Visualizar prontuários' },
        { key: 'record.create', description: 'Criar prontuários' },
        { key: 'record.update', description: 'Atualizar prontuários' },
        { key: 'procedure.read', description: 'Visualizar procedimentos' },
        { key: 'procedure.create', description: 'Criar procedimentos' },
        { key: 'procedure.update', description: 'Atualizar procedimentos' },
        { key: 'consumable.add', description: 'Adicionar consumíveis' },
        { key: 'consumable.read', description: 'Visualizar consumíveis' },
        { key: 'schedule.block', description: 'Gerenciar bloqueios de agenda' },
        { key: 'notice.read', description: 'Visualizar avisos' },
        { key: 'notice.create', description: 'Criar avisos' },
        { key: 'notice.update', description: 'Atualizar avisos' },
        { key: 'notice.delete', description: 'Deletar avisos' },
        { key: 'specialty.read', description: 'Visualizar especialidades' },
        { key: 'specialty.create', description: 'Criar especialidades' },
        { key: 'specialty.update', description: 'Atualizar especialidades' },
        { key: 'specialty.delete', description: 'Deletar especialidades' },
        { key: 'role.read', description: 'Visualizar papéis e permissões' },
        { key: 'role.manage', description: 'Gerenciar permissões de papéis' },
        { key: 'finance.create', description: 'Criar registros financeiros' },
        { key: 'finance.update', description: 'Atualizar registros financeiros' },

        // Fiscal (NF-e/NFC-e)
        { key: 'fiscal.config', description: 'Configurar Módulo Fiscal' },
        { key: 'fiscal.view', description: 'Visualizar Notas Fiscais' },
        { key: 'fiscal.emit', description: 'Emitir Notas Fiscais' },
        { key: 'fiscal.cancel', description: 'Cancelar Notas Fiscais' },
    ];

    for (const perm of permissions) {
        await prisma.permission.upsert({
            where: { key: perm.key },
            update: { description: perm.description },
            create: perm,
        });
    }
    console.log(`✅ Created ${permissions.length} permissions`);

    // =========================================
    // 2. ROLES
    // =========================================
    const adminRole = await prisma.role.upsert({
        where: { key: 'ADMIN' },
        update: { name: 'Administrador' },
        create: {
            key: 'ADMIN',
            name: 'Administrador',
            description: 'Acesso total ao sistema',
        },
    });

    const sellerRole = await prisma.role.upsert({
        where: { key: 'SELLER' },
        update: {},
        create: {
            key: 'SELLER',
            name: 'Vendedor',
            description: 'Vendas e atendimento ao cliente',
        },
    });

    const managerRole = await prisma.role.upsert({
        where: { key: 'MANAGER' },
        update: {},
        create: {
            key: 'MANAGER',
            name: 'Gerente',
            description: 'Gerência da loja',
        },
    });

    const stockManagerRole = await prisma.role.upsert({
        where: { key: 'STOCK_MANAGER' },
        update: {},
        create: {
            key: 'STOCK_MANAGER',
            name: 'Estoquista',
            description: 'Gestão de estoque',
        },
    });

    console.log('✅ Created roles: ADMIN, SELLER, MANAGER, STOCK_MANAGER');

    // =========================================
    // 3. ROLE PERMISSIONS
    // =========================================
    const allPermissions = await prisma.permission.findMany();
    const permissionMap = new Map(allPermissions.map(p => [p.key, p]));

    // ADMIN: All permissions
    for (const perm of allPermissions) {
        await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
            update: {},
            create: { roleId: adminRole.id, permissionId: perm.id },
        });
    }

    // SELLER permissions
    const sellerPermKeys = [
        'customer.read', 'customer.create', 'customer.update',
        'architect.read',
        'quote.read', 'quote.create', 'quote.update',
        'order.read', 'order.create',
        'promotion.read',
        'delivery.read', 'delivery.create', 'delivery.update',
        'product.read', 'stock.view', // Catalog + Balances
        'rma.read',
        'clinic.read',
    ];
    for (const key of sellerPermKeys) {
        const perm = permissionMap.get(key);
        if (perm) {
            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: sellerRole.id, permissionId: perm.id } },
                update: {},
                create: { roleId: sellerRole.id, permissionId: perm.id },
            });
        }
    }

    // MANAGER: All sales + finance + reports
    const managerPermKeys = [
        ...sellerPermKeys,
        'customer.delete', 'architect.create', 'architect.update', 'architect.delete',
        'quote.delete', 'quote.convert',
        'order.update', 'order.cancel',
        'promotion.create', 'promotion.update', 'promotion.delete',
        'product.create', 'product.update', // Manage Catalog
        'supplier.create', 'supplier.update', 'supplier.delete', // Manage Suppliers
        'catalogue.settings', // Manage Catalogue Settings (Markup)
        'category.create', 'category.update', 'category.delete', // Manage Categories
        'brand.create', 'brand.update', 'brand.delete', // Manage Brands
        'stock.adjust', // Manage Stock
        'rma.read', 'rma.manage', // Manage RMA
        'finance.read', 'finance.charge', 'finance.payment',
        'fiscal.view', 'fiscal.emit', 'fiscal.cancel', // Fiscal Access
        'user.read', 'audit.read',
    ];
    for (const key of managerPermKeys) {
        const perm = permissionMap.get(key);
        if (perm) {
            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id } },
                update: {},
                create: { roleId: managerRole.id, permissionId: perm.id },
            });
        }
    }

    // STOCK_MANAGER permissions
    const stockPermKeys = [
        'product.read', 'product.create', 'product.update', // Catalog management
        'catalogue.settings', // Manage Catalogue Settings
        'supplier.read', 'supplier.create', 'supplier.update', // Supplier management
        'category.read', 'category.create', 'category.update', // Category management
        'brand.read', 'brand.create', 'brand.update', // Brand management
        'stock.view', 'stock.adjust', // Stock management
        'rma.read', 'rma.manage', // Manage RMA
        'stock.create', 'stock.read', 'stock.update', // Legacy/Safety
        'clinic.read'
    ];
    for (const key of stockPermKeys) {
        const perm = permissionMap.get(key);
        if (perm) {
            await prisma.rolePermission.upsert({
                where: { roleId_permissionId: { roleId: stockManagerRole.id, permissionId: perm.id } },
                update: {},
                create: { roleId: stockManagerRole.id, permissionId: perm.id },
            });
        }
    }

    console.log('✅ Created role-permission associations');

    // =========================================
    // 4. CREATE DEMO STORE (CLINIC)
    // =========================================
    const hashedPassword = await bcrypt.hash('123456', 10);

    // =========================================
    // 4. CREATE STORE (CLINIC)
    // =========================================
    const store = await prisma.clinic.upsert({
        where: { slug: 'mosaic-teste' },
        update: {
            modules: ['APPOINTMENTS', 'STOCK', 'FINANCE', 'SALES', 'ARCHITECTS', 'PROMOTIONS', 'DELIVERIES', 'PURCHASES', 'ADMIN', 'RMA']
        },
        create: {
            name: 'Mosaic Teste',
            slug: 'mosaic-teste',
            isActive: true,
            modules: ['APPOINTMENTS', 'STOCK', 'FINANCE', 'SALES', 'ARCHITECTS', 'PROMOTIONS', 'DELIVERIES', 'PURCHASES', 'ADMIN', 'RMA']
        },
    });
    console.log(`✅ Created store: ${store.name} (ID: ${store.id})`);

    // =========================================
    // 5. CREATE ADMIN USER
    // =========================================
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@admin.com' },
        update: { password: hashedPassword },
        create: {
            email: 'admin@admin.com',
            password: hashedPassword,
            name: 'Administrador Mosaic',
            isActive: true,
        },
    });

    // Link user to store with ADMIN role
    await prisma.clinicUser.upsert({
        where: { clinicId_userId: { clinicId: store.id, userId: adminUser.id } },
        update: {},
        create: { clinicId: store.id, userId: adminUser.id, roleId: adminRole.id, active: true },
    });
    console.log('✅ Created user admin@admin.com and linked to store');

    // =========================================
    // 6. CREATE 3 ARCHITECTS
    // =========================================
    const architectsData = [
        {
            id: `${store.id}-arq-001`,
            name: 'Ana Lúcia Arquitetura',
            email: 'ana@arquitetura.com.br',
            phone: '11 91111-1111',
            document: '111.111.111-11',
            commissionRate: 5.0,
            isActive: true,
        },
        {
            id: `${store.id}-arq-002`,
            name: 'Beto Costa Studio',
            email: 'beto@studio.com',
            phone: '11 92222-2222',
            document: '222.222.222-22',
            commissionRate: 4.0,
            isActive: true,
        },
        {
            id: `${store.id}-arq-003`,
            name: 'Camila Design de Interiores',
            email: 'camila@design.com',
            phone: '11 93333-3333',
            document: '333.333.333-33',
            commissionRate: 6.0,
            isActive: true,
        }
    ];

    for (const arq of architectsData) {
        await prisma.architect.upsert({
            where: { id: arq.id },
            update: arq,
            create: { ...arq, clinicId: store.id },
        });
    }
    console.log(`✅ Created ${architectsData.length} architects`);

    // =========================================
    // 7. CREATE 3 CUSTOMERS
    // =========================================
    const customersData = [
        {
            id: `${store.id}-cli-001`,
            type: CustomerType.PF,
            name: 'João Pedro Silva',
            email: 'joaopedro@email.com',
            phone: '11 94444-4444',
            document: '444.444.444-44',
            address: 'Rua das Flores, 100',
            addressNumber: '100',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01400-000',
            architectId: architectsData[0].id,
            isActive: true,
        },
        {
            id: `${store.id}-cli-002`,
            type: CustomerType.PJ,
            name: 'Construtora Horizonte',
            email: 'compras@horizonte.com.br',
            phone: '11 5555-5555',
            document: '55.555.555/0001-55',
            stateRegistration: '123.456.789.000',
            address: 'Av. Paulista, 1000',
            addressNumber: '1000',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01310-000',
            creditLimitCents: 10000000, // R$ 100.000,00
            isActive: true,
        },
        {
            id: `${store.id}-cli-003`,
            type: CustomerType.PF,
            name: 'Maria Clara Souza',
            email: 'mariaclara@email.com',
            phone: '11 96666-6666',
            document: '666.666.666-66',
            address: 'Rua Augusta, 500',
            addressNumber: '500',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01305-000',
            architectId: architectsData[1].id,
            isActive: true,
        }
    ];

    for (const cli of customersData) {
        await prisma.customer.upsert({
            where: { id: cli.id },
            update: cli,
            create: { ...cli, clinicId: store.id },
        });
    }
    console.log(`✅ Created ${customersData.length} customers`);

    // =========================================
    // 8. CREATE 3 SUPPLIERS
    // =========================================
    const suppliersData = [
        {
            id: `${store.id}-sup-001`,
            name: 'Cerâmica XYZ Brasil',
            cnpj: '77.777.777/0001-77',
            email: 'contato@ceramicaxyz.com.br',
            phone: '19 3333-3333',
            address: 'Rodovia Anhanguera, km 150',
            city: 'Rio Claro',
            state: 'SP',
            isActive: true,
        },
        {
            id: `${store.id}-sup-002`,
            name: 'Tintas e Tintas S/A',
            cnpj: '88.888.888/0001-88',
            email: 'vendas@tintaspremium.com.br',
            phone: '11 3888-8888',
            address: 'Av. das Indústrias, 500',
            city: 'Guarulhos',
            state: 'SP',
            isActive: true,
        },
        {
            id: `${store.id}-sup-003`,
            name: 'Distribuidora de Argamassas Forte',
            cnpj: '99.999.999/0001-99',
            email: 'pedidos@argamassasforte.com',
            phone: '15 3999-9999',
            address: 'Estrada Velha, 200',
            city: 'Sorocaba',
            state: 'SP',
            isActive: true,
        }
    ];

    for (const sup of suppliersData) {
        await prisma.supplier.upsert({
            where: { id: sup.id },
            update: sup,
            create: { ...sup, clinicId: store.id },
        });
    }
    console.log(`✅ Created ${suppliersData.length} suppliers`);

    // =========================================
    // SUMMARY
    // =========================================
    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 CREDENCIAIS DE TESTE:');
    console.log('────────────────────────────────────');
    console.log('| Email                          | Senha  | Papel       |');
    console.log('|--------------------------------|--------|-------------|');
    console.log('| admin@admin.com                | 123456 | Administrador|');
    console.log('| superadmin@revestimentos.com   | 123456 | Super Admin |');
    console.log('────────────────────────────────────');
    console.log(`\n🏪 Loja ID: ${store.id} (Mosaic Teste)`);
    console.log(`👥 Clientes: 3`);
    console.log(`🏛️ Arquitetos: 3`);
    console.log(`🏭 Fornecedores: 3`);

    // =========================================
    // 12. CREATE SUPER ADMIN
    // =========================================
    const superAdmin = await prisma.user.upsert({
        where: { email: 'superadmin@revestimentos.com' },
        update: { password: hashedPassword, isSuperAdmin: true },
        create: {
            email: 'superadmin@revestimentos.com',
            password: hashedPassword,
            name: 'Super Admin',
            isActive: true,
            isSuperAdmin: true,
        },
    });
    console.log('✅ Created Super Admin: superadmin@revestimentos.com');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
