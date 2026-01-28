export const PERMISSIONS = {
    // Professionals (new - uses SCREAMING_SNAKE)
    PROFESSIONAL_READ: 'PROFESSIONAL_READ',
    PROFESSIONAL_MANAGE: 'PROFESSIONAL_MANAGE',

    // Clinic
    CLINIC_ADMIN: 'CLINIC_ADMIN',
    CLINIC_READ: 'clinic.read',
    CLINIC_SETTINGS_MANAGE: 'clinic.settings.manage',

    // Appointments
    APPOINTMENT_CREATE: 'appointment.create',
    APPOINTMENT_READ: 'appointment.read',
    APPOINTMENT_UPDATE: 'appointment.update',
    APPOINTMENT_CANCEL: 'appointment.cancel',
    APPOINTMENT_CHECKIN: 'appointment.checkin',

    // Encounters
    ENCOUNTER_START: 'encounter.start',
    ENCOUNTER_READ: 'encounter.read',
    ENCOUNTER_UPDATE: 'encounter.update',
    ENCOUNTER_CLOSE: 'encounter.close',

    // Patients
    PATIENT_CREATE: 'patient.create',
    PATIENT_READ: 'patient.read',
    PATIENT_UPDATE: 'patient.update',
    PATIENT_DELETE: 'patient.delete',

    // Procedures
    PROCEDURE_CREATE: 'procedure.create',
    PROCEDURE_READ: 'procedure.read',
    PROCEDURE_UPDATE: 'procedure.update',

    // Consumables
    CONSUMABLE_ADD: 'consumable.add',
    CONSUMABLE_READ: 'consumable.read',

    // Records
    RECORD_CREATE: 'record.create',

    // Audit
    AUDIT_READ: 'audit.read',

    // Stock
    STOCK_CREATE: 'stock.create',
    STOCK_READ: 'stock.read',
    STOCK_UPDATE: 'stock.update',

    // Schedule
    SCHEDULE_BLOCK: 'schedule.block',

    // Notices
    NOTICE_READ: 'notice.read',
    NOTICE_CREATE: 'notice.create',
    NOTICE_UPDATE: 'notice.update',
    NOTICE_DELETE: 'notice.delete',

    // Specialties
    SPECIALTY_READ: 'specialty.read',
    SPECIALTY_CREATE: 'specialty.create',
    SPECIALTY_UPDATE: 'specialty.update',
    SPECIALTY_DELETE: 'specialty.delete',

    // Roles
    ROLE_READ: 'role.read',
    ROLE_MANAGE: 'role.manage',

    // Finance
    FINANCE_READ: 'finance.read',
    FINANCE_CHARGE: 'finance.charge',
    FINANCE_PAYMENT: 'finance.payment',

    // =====================================================
    // SALES MODULE - Permissões para Vendas/Revestimentos
    // =====================================================

    // Customers (Clientes)
    CUSTOMER_CREATE: 'customer.create',
    CUSTOMER_READ: 'customer.read',
    CUSTOMER_UPDATE: 'customer.update',
    CUSTOMER_DELETE: 'customer.delete',

    // Architects (Arquitetos/Indicadores)
    ARCHITECT_CREATE: 'architect.create',
    ARCHITECT_READ: 'architect.read',
    ARCHITECT_UPDATE: 'architect.update',
    ARCHITECT_DELETE: 'architect.delete',

    // Quotes (Orçamentos)
    QUOTE_CREATE: 'quote.create',
    QUOTE_READ: 'quote.read',
    QUOTE_UPDATE: 'quote.update',
    QUOTE_SEND: 'quote.send',
    QUOTE_CONVERT: 'quote.convert',
    QUOTE_DELETE: 'quote.delete',

    // Orders (Pedidos)
    ORDER_CREATE: 'order.create',
    ORDER_READ: 'order.read',
    ORDER_UPDATE: 'order.update',
    ORDER_CONFIRM: 'order.confirm',
    ORDER_CANCEL: 'order.cancel',

    // Reports (Relatórios de Vendas)
    SALES_REPORT_READ: 'sales.report.read',
    COMMISSION_REPORT_READ: 'commission.report.read',
    // Deliveries
    DELIVERY_CREATE: 'delivery.create',
    DELIVERY_READ: 'delivery.read',
    DELIVERY_UPDATE: 'delivery.update',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
