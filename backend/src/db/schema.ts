import { mysqlTable, varchar, text, datetime, decimal, int, enum as mysqlEnum, json, index, primaryKey } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// ==================== tb_employees ====================
export const employees = mysqlTable(
  'tb_employees',
  {
    cpf: varchar('cpf', { length: 11 }).primaryKey(),
    name: text('name').notNull(),
    hireDate: datetime('hireDate'),
    status: mysqlEnum('status', ['ACTIVE', 'INACTIVE']).default('ACTIVE'),
    createdAt: datetime('createdAt').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
  },
  (table) => ({
    statusIdx: index('idx_status').on(table.status),
  })
);

// ==================== tb_sales ====================
export const sales = mysqlTable(
  'tb_sales',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    idOperator: varchar('idOperator', { length: 11 }).notNull(),
    idPdv: varchar('idPdv', { length: 20 }),
    totalAmount: decimal('totalAmount', { precision: 10, scale: 2 }).notNull(),
    timestampSale: datetime('timestampSale').notNull(),
    customerCpf: varchar('customerCpf', { length: 11 }),
    createdAt: datetime('createdAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    operatorIdx: index('idx_operator').on(table.idOperator),
    timestampIdx: index('idx_timestamp').on(table.timestampSale),
    customerIdx: index('idx_customer').on(table.customerCpf),
  })
);

// ==================== tb_cancellations ====================
export const cancellations = mysqlTable(
  'tb_cancellations',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    idSale: varchar('idSale', { length: 50 }).notNull(),
    timestampCancellation: datetime('timestampCancellation').notNull(),
    reason: text('reason'),
    createdAt: datetime('createdAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    saleIdx: index('idx_sale').on(table.idSale),
    timestampIdx: index('idx_timestamp').on(table.timestampCancellation),
  })
);

// ==================== tb_pos_events ====================
export const posEvents = mysqlTable(
  'tb_pos_events',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    idOperator: varchar('idOperator', { length: 11 }).notNull(),
    idPdv: varchar('idPdv', { length: 20 }),
    eventType: mysqlEnum('eventType', ['DRAWER_OPEN_NO_SALE', 'DRAWER_OPEN_WITH_SALE', 'CASH_IN', 'CASH_OUT']).notNull(),
    eventTimestamp: datetime('eventTimestamp').notNull(),
    createdAt: datetime('createdAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    operatorIdx: index('idx_operator').on(table.idOperator),
    eventTypeIdx: index('idx_event_type').on(table.eventType),
    timestampIdx: index('idx_timestamp').on(table.eventTimestamp),
  })
);

// ==================== tb_pbm_auth ====================
export const pbmAuth = mysqlTable(
  'tb_pbm_auth',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    authorizationCode: varchar('authorizationCode', { length: 50 }).notNull(),
    idOperator: varchar('idOperator', { length: 11 }),
    idPdv: varchar('idPdv', { length: 20 }),
    authorizationTimestamp: datetime('authorizationTimestamp').notNull(),
    authorizationAmount: decimal('authorizationAmount', { precision: 10, scale: 2 }),
    status: mysqlEnum('status', ['APPROVED', 'DECLINED', 'PENDING']).default('APPROVED'),
    createdAt: datetime('createdAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    operatorIdx: index('idx_operator').on(table.idOperator),
    timestampIdx: index('idx_timestamp').on(table.authorizationTimestamp),
    statusIdx: index('idx_status').on(table.status),
  })
);

// ==================== tb_operator_risk_score ====================
export const operatorRiskScore = mysqlTable(
  'tb_operator_risk_score',
  {
    id: int('id').autoincrement().primaryKey(),
    idOperator: varchar('idOperator', { length: 11 }).notNull(),
    riskScore: int('riskScore').default(0),
    riskLevel: mysqlEnum('riskLevel', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('LOW'),
    ghostCancellations: int('ghostCancellations').default(0),
    pbmDeviations: int('pbmDeviations').default(0),
    noSaleEvents: int('noSaleEvents').default(0),
    cpfAbuseCount: int('cpfAbuseCount').default(0),
    cashDiscrepancies: int('cashDiscrepancies').default(0),
    calculatedAt: datetime('calculatedAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    operatorIdx: index('idx_operator').on(table.idOperator),
    riskLevelIdx: index('idx_risk_level').on(table.riskLevel),
    calculatedIdx: index('idx_calculated').on(table.calculatedAt),
  })
);

// ==================== tb_audit_alerts ====================
export const auditAlerts = mysqlTable(
  'tb_audit_alerts',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    alertType: mysqlEnum('alertType', ['GHOST_CANCELLATION', 'PBM_DEVIATION', 'NO_SALE', 'CPF_ABUSE', 'CASH_DISCREPANCY']).notNull(),
    severity: mysqlEnum('severity', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).notNull(),
    status: mysqlEnum('status', ['Pending', 'Investigado', 'Falso Positivo', 'Fraude Confirmada']).default('Pending'),
    idOperator: varchar('idOperator', { length: 11 }).notNull(),
    operatorName: text('operatorName'),
    pdv: varchar('pdv', { length: 20 }),
    pharmacy: text('pharmacy'),
    saleId: varchar('saleId', { length: 50 }),
    cancellationId: varchar('cancellationId', { length: 50 }),
    saleAmount: decimal('saleAmount', { precision: 10, scale: 2 }),
    saleTimestamp: datetime('saleTimestamp'),
    cancellationTimestamp: datetime('cancellationTimestamp'),
    delaySeconds: int('delaySeconds'),
    riskScore: int('riskScore'),
    evidence: json('evidence').$type<{
      cameraAvailable?: boolean;
      cameraUrl?: string;
      relatedAlerts?: number;
    }>(),
    createdAt: datetime('createdAt').default(sql`CURRENT_TIMESTAMP`),
    investigatedBy: int('investigatedBy'),
    investigationNotes: text('investigationNotes'),
  },
  (table) => ({
    operatorIdx: index('idx_operator').on(table.idOperator),
    statusIdx: index('idx_status').on(table.status),
    createdIdx: index('idx_created').on(table.createdAt),
    severityIdx: index('idx_severity').on(table.severity),
  })
);

// ==================== tb_cash_discrepancies ====================
export const cashDiscrepancies = mysqlTable(
  'tb_cash_discrepancies',
  {
    id: int('id').autoincrement().primaryKey(),
    idPdv: varchar('idPdv', { length: 20 }).notNull(),
    expectedAmount: decimal('expectedAmount', { precision: 10, scale: 2 }),
    actualAmount: decimal('actualAmount', { precision: 10, scale: 2 }),
    discrepancy: decimal('discrepancy', { precision: 10, scale: 2 }),
    discrepancyDate: datetime('discrepancyDate'),
    createdAt: datetime('createdAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    pdvIdx: index('idx_pdv').on(table.idPdv),
    dateIdx: index('idx_date').on(table.discrepancyDate),
  })
);

// ==================== tb_users (para investigadores) ====================
export const users = mysqlTable(
  'tb_users',
  {
    id: int('id').autoincrement().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: text('name').notNull(),
    role: mysqlEnum('role', ['Admin', 'Analyst']).default('Analyst'),
    createdAt: datetime('createdAt').default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime('updatedAt').default(sql`CURRENT_TIMESTAMP`).onUpdateNow(),
  },
  (table) => ({
    emailIdx: index('idx_email').on(table.email),
  })
);

// Export all tables
export const schema = {
  employees,
  sales,
  cancellations,
  posEvents,
  pbmAuth,
  operatorRiskScore,
  auditAlerts,
  cashDiscrepancies,
  users,
};
