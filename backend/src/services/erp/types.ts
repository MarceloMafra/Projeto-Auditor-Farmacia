/**
 * ERP Integration Types
 *
 * Define tipos e interfaces para sincronização de dados com sistemas ERP
 */

export type DatabaseType = 'mysql' | 'postgresql' | 'oracle' | 'sqlserver';

export interface ErpConfig {
  type: DatabaseType;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
  requestTimeout?: number;
}

export interface ErpTransactionRow {
  id: string;
  pdv: string; // PDV/Terminal ID
  operator: string; // Employee ID or CPF
  amount: number;
  timestamp: Date;
  type: 'SALE' | 'CANCELLATION' | 'REFUND' | 'ADJUSTMENT';
  reference?: string; // Transaction reference from ERP
  metadata?: Record<string, any>;
}

export interface ErpSyncResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number; // milliseconds
  databaseType: DatabaseType;
  recordsFetched: number;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number; // Duplicates
  errors: SyncError[];
}

export interface SyncError {
  record?: ErpTransactionRow;
  error: string;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  recoverable: boolean;
}

export interface SyncAuditEntry {
  id: string;
  syncId: string;
  databaseType: DatabaseType;
  syncType: 'FULL' | 'INCREMENTAL';
  startTime: Date;
  endTime: Date;
  duration: number;
  recordsProcessed: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  errors: string[];
  lastSyncTimestamp?: Date;
  nextSyncTimestamp: Date;
}

export interface ErpConnectorInterface {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;
  getLastSyncTimestamp(): Promise<Date | null>;
  fetchTransactions(fromDate?: Date, limit?: number): Promise<ErpTransactionRow[]>;
  getTransactionCount(fromDate?: Date): Promise<number>;
}

/**
 * Deduplication Strategy
 * Identifica registros duplicados baseado em:
 * - PDV + Operator + Amount + Timestamp (5-minute window)
 * - External reference if available
 */
export interface DuplicationKey {
  pdv: string;
  operator: string;
  amount: number;
  timestampBucket: number; // Timestamp arredondado para 5 minutos
  reference?: string;
}

export function generateDuplicationKey(record: ErpTransactionRow, windowMinutes: number = 5): DuplicationKey {
  const windowMs = windowMinutes * 60 * 1000;
  const timestampBucket = Math.floor(record.timestamp.getTime() / windowMs) * windowMs;

  return {
    pdv: record.pdv,
    operator: record.operator,
    amount: parseFloat(record.amount.toString()),
    timestampBucket,
    reference: record.reference,
  };
}

/**
 * Status da Sincronização
 */
export interface SyncStatus {
  lastSync: Date | null;
  nextSync: Date;
  isRunning: boolean;
  successCount: number;
  errorCount: number;
  averageDuration: number; // milliseconds
  recordsPerMinute: number;
}

/**
 * Configurações de Sincronização
 */
export interface SyncConfig {
  enabled: boolean;
  schedule: string; // Cron expression (ex: "0 * * * *" = hourly)
  batchSize: number; // Records per batch
  deduplicationEnabled: boolean;
  deduplicationWindow: number; // minutes
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Estatísticas de Sincronização
 */
export interface SyncStatistics {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  partialSyncs: number;
  totalRecordsProcessed: number;
  totalRecordsInserted: number;
  totalRecordsDuplicated: number;
  totalErrors: number;
  averageSyncDuration: number; // seconds
  lastSyncSuccess: Date | null;
  lastSyncError: Date | null;
}
