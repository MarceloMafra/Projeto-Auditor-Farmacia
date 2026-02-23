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

// ==================== tb_erp_sync_audit ====================
// Rastreia cada sincronização com ERP
export const erpSyncAudit = mysqlTable(
  'tb_erp_sync_audit',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    syncId: varchar('syncId', { length: 50 }).notNull(),
    databaseType: mysqlEnum('databaseType', ['mysql', 'postgresql', 'oracle', 'sqlserver']).notNull(),
    syncType: mysqlEnum('syncType', ['FULL', 'INCREMENTAL']).notNull(),
    startTime: datetime('startTime').notNull(),
    endTime: datetime('endTime').notNull(),
    durationMs: int('durationMs').notNull(),
    recordsFetched: int('recordsFetched').default(0),
    recordsProcessed: int('recordsProcessed').default(0),
    recordsInserted: int('recordsInserted').default(0),
    recordsUpdated: int('recordsUpdated').default(0),
    recordsSkipped: int('recordsSkipped').default(0),
    status: mysqlEnum('status', ['SUCCESS', 'PARTIAL', 'FAILED']).notNull(),
    errorCount: int('errorCount').default(0),
    errors: json('errors').$type<string[]>(),
    triggeredBy: varchar('triggeredBy', { length: 50 }), // 'system' or user_id
    isManual: int('isManual').default(0), // Boolean: 0 or 1
    host: varchar('host', { length: 255 }),
    database: varchar('database', { length: 255 }),
    createdAt: datetime('createdAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    syncIdIdx: index('idx_sync_id').on(table.syncId),
    statusIdx: index('idx_status').on(table.status),
    createdIdx: index('idx_created').on(table.createdAt),
    databaseTypeIdx: index('idx_database_type').on(table.databaseType),
    startTimeIdx: index('idx_start_time').on(table.startTime),
  })
);

// ==================== tb_sync_dedup_keys ====================
// Cache de chaves de deduplicação para evitar importações duplicadas
export const syncDedupKeys = mysqlTable(
  'tb_sync_dedup_keys',
  {
    id: int('id').autoincrement().primaryKey(),
    syncId: varchar('syncId', { length: 50 }).notNull(),
    dedupKey: varchar('dedupKey', { length: 255 }).notNull(),
    pdv: varchar('pdv', { length: 10 }).notNull(),
    operator: varchar('operator', { length: 20 }).notNull(),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    timestampBucket: datetime('timestampBucket').notNull(),
    reference: varchar('reference', { length: 100 }),
    createdAt: datetime('createdAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    syncIdIdx: index('idx_sync_id').on(table.syncId),
    dedupKeyIdx: index('idx_dedup_key').on(table.dedupKey),
    pdvOperatorIdx: index('idx_pdv_operator').on(table.pdv, table.operator),
    timestampIdx: index('idx_timestamp').on(table.timestampBucket),
  })
);

// ==================== tb_sync_errors ====================
// Detalhes de erros ocorridos durante sincronização
export const syncErrors = mysqlTable(
  'tb_sync_errors',
  {
    id: int('id').autoincrement().primaryKey(),
    syncId: varchar('syncId', { length: 50 }).notNull(),
    errorMessage: text('errorMessage').notNull(),
    errorSeverity: mysqlEnum('errorSeverity', ['WARNING', 'ERROR', 'CRITICAL']).notNull(),
    isRecoverable: int('isRecoverable').default(1), // Boolean: 0 or 1
    recordData: json('recordData').$type<Record<string, any>>(),
    stackTrace: text('stackTrace'),
    attemptNumber: int('attemptNumber').default(1),
    createdAt: datetime('createdAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    syncIdIdx: index('idx_sync_id').on(table.syncId),
    severityIdx: index('idx_severity').on(table.errorSeverity),
    createdIdx: index('idx_created').on(table.createdAt),
  })
);

// ==================== tb_detection_audit ====================
// Rastreia execuções do Detection Engine
export const detectionAudit = mysqlTable(
  'tb_detection_audit',
  {
    id: varchar('id', { length: 50 }).primaryKey(),
    detectionId: varchar('detectionId', { length: 50 }).notNull(),
    startTime: datetime('startTime').notNull(),
    endTime: datetime('endTime').notNull(),
    durationMs: int('durationMs').notNull(),
    recordsAnalyzed: int('recordsAnalyzed').default(0),
    alertsGenerated: int('alertsGenerated').default(0),
    ghostCancellations: int('ghostCancellations').default(0),
    pbmDeviations: int('pbmDeviations').default(0),
    noSaleEvents: int('noSaleEvents').default(0),
    cpfAbuses: int('cpfAbuses').default(0),
    cashDiscrepancies: int('cashDiscrepancies').default(0),
    operatorsUpdated: int('operatorsUpdated').default(0),
    status: mysqlEnum('status', ['SUCCESS', 'PARTIAL', 'FAILED']).notNull(),
    errorCount: int('errorCount').default(0),
    errors: json('errors').$type<string[]>(),
    triggeredBy: varchar('triggeredBy', { length: 50 }), // 'system' or user_id
    isManual: int('isManual').default(0), // Boolean: 0 or 1
    syncId: varchar('syncId', { length: 50 }), // Link to sync if triggered after sync
    createdAt: datetime('createdAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    detectionIdIdx: index('idx_detection_id').on(table.detectionId),
    statusIdx: index('idx_status').on(table.status),
    createdIdx: index('idx_created').on(table.createdAt),
    syncIdIdx: index('idx_sync_id').on(table.syncId),
    startTimeIdx: index('idx_start_time').on(table.startTime),
  })
);

// ==================== tb_detection_errors ====================
// Detalhes de erros ocorridos durante detecção
export const detectionErrors = mysqlTable(
  'tb_detection_errors',
  {
    id: int('id').autoincrement().primaryKey(),
    detectionId: varchar('detectionId', { length: 50 }).notNull(),
    moduleType: mysqlEnum('moduleType', ['GHOST_CANCELLATION', 'PBM_DEVIATION', 'NO_SALE', 'CPF_ABUSE', 'CASH_DISCREPANCY', 'RISK_SCORE']).notNull(),
    errorMessage: text('errorMessage').notNull(),
    errorSeverity: mysqlEnum('errorSeverity', ['WARNING', 'ERROR', 'CRITICAL']).notNull(),
    isRecoverable: int('isRecoverable').default(1), // Boolean: 0 or 1
    stackTrace: text('stackTrace'),
    createdAt: datetime('createdAt').default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => ({
    detectionIdIdx: index('idx_detection_id').on(table.detectionId),
    moduleTypeIdx: index('idx_module_type').on(table.moduleType),
    severityIdx: index('idx_severity').on(table.errorSeverity),
    createdIdx: index('idx_created').on(table.createdAt),
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
  erpSyncAudit,
  syncDedupKeys,
  syncErrors,
  detectionAudit,
  detectionErrors,
};
