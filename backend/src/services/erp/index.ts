/**
 * ERP Integration Module
 *
 * Exporta serviços e tipos para integração com sistemas ERP
 */

export { ErpSyncService } from './syncService';
export {
  ErpConfig,
  ErpTransactionRow,
  ErpSyncResult,
  ErpConnectorInterface,
  SyncError,
  SyncAuditEntry,
  SyncConfig,
  SyncStatus,
  SyncStatistics,
  DatabaseType,
  generateDuplicationKey,
  type DuplicationKey,
} from './types';
export { createErpConnector, getSupportedDatabaseTypes } from './connectors';
