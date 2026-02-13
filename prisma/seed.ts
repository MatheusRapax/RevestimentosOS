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

        // Stock Operations (Estoque Físico)
        { key: 'stock.view', description: 'Visualizar saldos de estoque' },
        { key: 'stock.adjust', description: 'Realizar ajustes de estoque' },
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
        'delivery.read', 'delivery.create', 'delivery.update',
        'product.read', 'stock.view', // Catalog + Balances
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
        'product.create', 'product.update', // Manage Catalog
        'stock.adjust', // Manage Stock
        'finance.read', 'finance.charge', 'finance.payment',
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
        'stock.view', 'stock.adjust', // Stock management
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

    /* 
    // DEMO DATA COMMENTED FOR PRODUCTION/TESTING RESET
    const store = await prisma.clinic.upsert({
        where: { slug: 'revestimentos-demo' },
        update: {},
        create: {
            name: 'Revestimentos Demo',
            slug: 'revestimentos-demo',
            isActive: true,
        },
    });
    console.log(`✅ Created store: ${store.name} (ID: ${store.id})`);

    // =========================================
    // 5. CREATE DEMO USERS
    // =========================================
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@revestimentos.com' },
        update: { password: hashedPassword },
        create: {
            email: 'admin@revestimentos.com',
            password: hashedPassword,
            name: 'Administrador',
            isActive: true,
        },
    });

    const sellerUser = await prisma.user.upsert({
        where: { email: 'vendedor@revestimentos.com' },
        update: { password: hashedPassword },
        create: {
            email: 'vendedor@revestimentos.com',
            password: hashedPassword,
            name: 'Carlos Vendedor',
            isActive: true,
        },
    });

    const managerUser = await prisma.user.upsert({
        where: { email: 'gerente@revestimentos.com' },
        update: { password: hashedPassword },
        create: {
            email: 'gerente@revestimentos.com',
            password: hashedPassword,
            name: 'Maria Gerente',
            isActive: true,
        },
    });

    console.log('✅ Created users: admin, vendedor, gerente');

    // Link users to store with roles
    await prisma.clinicUser.upsert({
        where: { clinicId_userId: { clinicId: store.id, userId: adminUser.id } },
        update: {},
        create: { clinicId: store.id, userId: adminUser.id, roleId: adminRole.id, active: true },
    });

    await prisma.clinicUser.upsert({
        where: { clinicId_userId: { clinicId: store.id, userId: sellerUser.id } },
        update: {},
        create: { clinicId: store.id, userId: sellerUser.id, roleId: sellerRole.id, active: true },
    });

    await prisma.clinicUser.upsert({
        where: { clinicId_userId: { clinicId: store.id, userId: managerUser.id } },
        update: {},
        create: { clinicId: store.id, userId: managerUser.id, roleId: managerRole.id, active: true },
    });

    console.log('✅ Linked users to store with roles');

    // =========================================
    // 6. CREATE DEMO PRODUCTS (Revestimentos)
    // =========================================
    const products = [
        {
            name: 'Porcelanato Carrara 60x60',
            description: 'Porcelanato polido tipo mármore Carrara',
            unit: 'caixa',
            sku: 'PRC-CARRARA-60',
            saleType: SaleType.AREA,
            boxCoverage: 1.44,
            piecesPerBox: 4,
            boxWeight: 28.5,
            palletBoxes: 40,
            costCents: 8900,
            priceCents: 15900,
            minStock: 20,
        },
        {
            name: 'Piso Laminado Carvalho',
            description: 'Piso laminado cor carvalho natural 8mm',
            unit: 'caixa',
            sku: 'LAM-CARV-8MM',
            saleType: SaleType.AREA,
            boxCoverage: 2.36,
            piecesPerBox: 8,
            boxWeight: 12.0,
            palletBoxes: 50,
            costCents: 4500,
            priceCents: 8900,
            minStock: 30,
        },
        {
            name: 'Rejunte Epóxi Branco 1kg',
            description: 'Rejunte epóxi para áreas molhadas',
            unit: 'unidade',
            sku: 'REJ-EPOX-BCO',
            saleType: SaleType.UNIT,
            costCents: 4500,
            priceCents: 7900,
            minStock: 50,
        },
        {
            name: 'Argamassa AC-III 20kg',
            description: 'Argamassa para piso sobre piso',
            unit: 'saco',
            sku: 'ARG-AC3-20',
            saleType: SaleType.UNIT,
            costCents: 3500,
            priceCents: 5900,
            minStock: 100,
        },
        {
            name: 'Cerâmica Subway White 7,5x15',
            description: 'Cerâmica tipo subway branca brilhante',
            unit: 'caixa',
            sku: 'CER-SUBWAY-W',
            saleType: SaleType.AREA,
            boxCoverage: 0.9,
            piecesPerBox: 80,
            boxWeight: 15.0,
            palletBoxes: 60,
            costCents: 3200,
            priceCents: 5900,
            minStock: 40,
        },
        {
            name: 'Porcelanato Madeira Nogueira 20x120',
            description: 'Porcelanato retificado tipo madeira',
            unit: 'caixa',
            sku: 'PRC-MAD-NOG',
            saleType: SaleType.AREA,
            boxCoverage: 1.2,
            piecesPerBox: 5,
            boxWeight: 32.0,
            palletBoxes: 35,
            costCents: 9900,
            priceCents: 17900,
            minStock: 25,
        },
    ];

    for (const prod of products) {
        await prisma.product.upsert({
            where: { id: `${store.id}-${prod.sku}` },
            update: prod,
            create: {
                id: `${store.id}-${prod.sku}`,
                clinicId: store.id,
                ...prod,
                isActive: true,
            },
        });
    }
    console.log(`✅ Created ${products.length} demo products`);

    // =========================================
    // 7. CREATE DEMO STOCK LOTS
    // =========================================
    const porcelanatoCarrara = await prisma.product.findFirst({
        where: { sku: 'PRC-CARRARA-60', clinicId: store.id },
    });

    if (porcelanatoCarrara) {
        await prisma.stockLot.upsert({
            where: { id: `lot-carrara-a1-9mm` },
            update: {},
            create: {
                id: `lot-carrara-a1-9mm`,
                clinicId: store.id,
                productId: porcelanatoCarrara.id,
                lotNumber: 'LOT-2026-001',
                quantity: 150,
                shade: 'A1',
                caliber: '9mm',
                expirationDate: new Date('2030-12-31'),
            },
        });

        await prisma.stockLot.upsert({
            where: { id: `lot-carrara-b2-9mm` },
            update: {},
            create: {
                id: `lot-carrara-b2-9mm`,
                clinicId: store.id,
                productId: porcelanatoCarrara.id,
                lotNumber: 'LOT-2026-002',
                quantity: 80,
                shade: 'B2',
                caliber: '9mm',
                expirationDate: new Date('2030-12-31'),
            },
        });
    }
    console.log('✅ Created demo stock lots with shade/caliber');

    // =========================================
    // 8. CREATE DEMO ARCHITECTS
    // =========================================
    const architect1 = await prisma.architect.upsert({
        where: { id: `${store.id}-arq-patricia` },
        update: {},
        create: {
            id: `${store.id}-arq-patricia`,
            clinicId: store.id,
            name: 'Patricia Silva',
            email: 'patricia@arquitetura.com',
            phone: '11 99999-1111',
            document: '123.456.789-00',
            commissionRate: 5.0,
            isActive: true,
        },
    });

    const architect2 = await prisma.architect.upsert({
        where: { id: `${store.id}-arq-roberto` },
        update: {},
        create: {
            id: `${store.id}-arq-roberto`,
            clinicId: store.id,
            name: 'Roberto Costa Arquitetura',
            email: 'roberto@rcaarquitetura.com.br',
            phone: '11 98888-2222',
            document: '987.654.321-00',
            commissionRate: 3.0,
            isActive: true,
        },
    });
    console.log('✅ Created 2 demo architects');

    // =========================================
    // 9. CREATE DEMO CUSTOMERS
    // =========================================
    const customer1 = await prisma.customer.upsert({
        where: { id: `${store.id}-cli-maria` },
        update: {},
        create: {
            id: `${store.id}-cli-maria`,
            clinicId: store.id,
            type: CustomerType.PF,
            name: 'Maria Oliveira',
            email: 'maria.oliveira@email.com',
            phone: '11 97777-3333',
            document: '111.222.333-44',
            address: 'Rua das Flores, 123',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '01234-567',
            architectId: architect1.id,
            isActive: true,
        },
    });

    const customer2 = await prisma.customer.upsert({
        where: { id: `${store.id}-cli-construtora` },
        update: {},
        create: {
            id: `${store.id}-cli-construtora`,
            clinicId: store.id,
            type: CustomerType.PJ,
            name: 'Construtora ABC Ltda',
            email: 'compras@construtorabc.com.br',
            phone: '11 3333-4444',
            document: '12.345.678/0001-99',
            stateRegistration: '123.456.789.000',
            address: 'Av. Industrial, 1000',
            city: 'Guarulhos',
            state: 'SP',
            zipCode: '07000-000',
            creditLimitCents: 5000000, // R$ 50.000,00
            isActive: true,
        },
    });

    const customer3 = await prisma.customer.upsert({
        where: { id: `${store.id}-cli-joao` },
        update: {},
        create: {
            id: `${store.id}-cli-joao`,
            clinicId: store.id,
            type: CustomerType.PF,
            name: 'João Santos',
            email: 'joao.santos@gmail.com',
            phone: '11 96666-5555',
            document: '555.666.777-88',
            address: 'Rua Principal, 456',
            city: 'São Paulo',
            state: 'SP',
            zipCode: '04567-890',
            isActive: true,
        },
    });
    console.log('✅ Created 3 demo customers (2 PF, 1 PJ)');

    // =========================================
    // 10. CREATE DEMO QUOTES
    // =========================================
    if (porcelanatoCarrara) {
        const quote1 = await prisma.quote.upsert({
            where: { id: `${store.id}-quote-001` },
            update: {},
            create: {
                id: `${store.id}-quote-001`,
                clinicId: store.id,
                number: 1,
                customerId: customer1.id,
                architectId: architect1.id,
                sellerId: sellerUser.id,
                status: QuoteStatus.AGUARDANDO_APROVACAO,
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
                sentAt: new Date(),
                subtotalCents: 318000,
                discountCents: 0,
                deliveryFee: 15000,
                totalCents: 333000,
                notes: 'Orçamento para reforma do banheiro - Porcelanato Carrara',
            },
        });

        await prisma.quoteItem.upsert({
            where: { id: `${store.id}-quoteitem-001` },
            update: {},
            create: {
                id: `${store.id}-quoteitem-001`,
                quoteId: quote1.id,
                productId: porcelanatoCarrara.id,
                inputArea: 28.8,
                quantityBoxes: 20,
                resultingArea: 28.8,
                unitPriceCents: 15900,
                discountCents: 0,
                totalCents: 318000,
                notes: 'Banheiro social + banheiro suíte',
            },
        });

        const quote2 = await prisma.quote.upsert({
            where: { id: `${store.id}-quote-002` },
            update: {},
            create: {
                id: `${store.id}-quote-002`,
                clinicId: store.id,
                number: 2,
                customerId: customer2.id,
                sellerId: sellerUser.id,
                status: QuoteStatus.EM_ORCAMENTO,
                validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
                subtotalCents: 1590000,
                discountCents: 79500,
                deliveryFee: 0,
                totalCents: 1510500,
                notes: 'Obra comercial - 100 caixas com desconto de 5%',
                internalNotes: 'Cliente grande, dar prioridade na entrega',
            },
        });
        console.log('✅ Created 2 demo quotes with items');
    }

    // =========================================
    // 11. CREATE DEMO ORDER
    // =========================================
    if (porcelanatoCarrara) {
        const order1 = await prisma.order.upsert({
            where: { id: `${store.id}-order-001` },
            update: {},
            create: {
                id: `${store.id}-order-001`,
                clinicId: store.id,
                number: 1,
                customerId: customer3.id,
                sellerId: sellerUser.id,
                status: OrderStatus.PAGO,
                subtotalCents: 79500,
                discountCents: 0,
                deliveryFee: 8000,
                totalCents: 87500,
                deliveryAddress: 'Rua Principal, 456 - São Paulo, SP',
                deliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
                confirmedAt: new Date(),
                notes: 'Entrega no período da manhã',
            },
        });

        await prisma.orderItem.upsert({
            where: { id: `${store.id}-orderitem-001` },
            update: {},
            create: {
                id: `${store.id}-orderitem-001`,
                orderId: order1.id,
                productId: porcelanatoCarrara.id,
                quantityBoxes: 5,
                resultingArea: 7.2,
                unitPriceCents: 15900,
                discountCents: 0,
                totalCents: 79500,
            },
        });
        console.log('✅ Created 1 demo order with items');
    }
    */

    // =========================================
    // SUMMARY
    // =========================================
    console.log('\n🎉 Seed completed successfully!');
    // console.log('\n📋 CREDENCIAIS DE TESTE:');
    // console.log('────────────────────────────────────');
    // console.log('| Email                          | Senha  | Papel       |');
    // console.log('|--------------------------------|--------|-------------|');
    // console.log('| admin@revestimentos.com        | 123456 | Admin       |');
    // console.log('| vendedor@revestimentos.com     | 123456 | Vendedor    |');
    // console.log('| gerente@revestimentos.com      | 123456 | Gerente     |');
    // console.log('────────────────────────────────────');
    // console.log(`\n🏪 Loja ID: ${store.id}`);
    // console.log(`📦 Produtos: 6`);
    // console.log(`👥 Clientes: 3`);
    // console.log(`🏛️ Arquitetos: 2`);
    // console.log(`📄 Orçamentos: 2`);
    // console.log(`📦 Pedidos: 1`);

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
