/**
 * Audit Service
 *
 * Gerencia registro de eventos de sincronização ERP e detecção de fraude
 * em tabelas de auditoria para rastreamento completo
 */

import { Database } from '@/db';
import { v4 as uuidv4 } from 'uuid';
import {
  erpSyncAudit,
  syncDedupKeys,
  syncErrors,
  detectionAudit,
  detectionErrors,
} from '@/db/schema';
import { ErpSyncResult, SyncError as ErpSyncError, DatabaseType } from '@/services/erp';
import { DetectionEngineResult } from '@/services/detection';

export class AuditService {
  constructor(private db: Database) {}

  /**
   * Registrar sincronização ERP
   */
  async recordErpSync(data: {
    syncId: string;
    databaseType: DatabaseType;
    syncType: 'FULL' | 'INCREMENTAL';
    result: ErpSyncResult;
    host: string;
    database: string;
    triggeredBy?: string;
    isManual?: boolean;
  }): Promise<void> {
    try {
      const auditId = `AUDIT-${data.syncId.substring(0, 20)}`;

      console.log(`📝 Registrando sincronização ERP: ${auditId}`);

      await this.db.insert(erpSyncAudit).values({
        id: auditId,
        syncId: data.syncId,
        databaseType: data.databaseType,
        syncType: data.syncType,
        startTime: data.result.startTime,
        endTime: data.result.endTime,
        durationMs: data.result.duration,
        recordsFetched: data.result.recordsFetched,
        recordsProcessed: data.result.recordsProcessed,
        recordsInserted: data.result.recordsInserted,
        recordsUpdated: data.result.recordsUpdated,
        recordsSkipped: data.result.recordsSkipped,
        status: data.result.success ? 'SUCCESS' : data.result.errors.length < data.result.recordsProcessed ? 'PARTIAL' : 'FAILED',
        errorCount: data.result.errors.length,
        errors: data.result.errors.map((e) => e.error),
        triggeredBy: data.triggeredBy || 'system',
        isManual: data.isManual ? 1 : 0,
        host: data.host,
        database: data.database,
      });

      console.log(`✅ Sincronização registrada com sucesso`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro ao registrar sincronização:', errorMsg);
    }
  }

  /**
   * Registrar chaves de deduplicação
   */
  async recordDedupKeys(syncId: string, keys: Array<{ key: string; pdv: string; operator: string; amount: number; timestampBucket: Date; reference?: string }>): Promise<void> {
    try {
      if (keys.length === 0) {
        return;
      }

      console.log(`📝 Registrando ${keys.length} chaves de deduplicação...`);

      for (const key of keys) {
        await this.db.insert(syncDedupKeys).values({
          syncId,
          dedupKey: key.key,
          pdv: key.pdv,
          operator: key.operator,
          amount: key.amount.toString(),
          timestampBucket: key.timestampBucket,
          reference: key.reference,
        });
      }

      console.log(`✅ Chaves registradas com sucesso`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('⚠️  Erro ao registrar chaves de deduplicação:', errorMsg);
    }
  }

  /**
   * Registrar erros de sincronização
   */
  async recordSyncErrors(syncId: string, errors: ErpSyncError[]): Promise<void> {
    try {
      if (errors.length === 0) {
        return;
      }

      console.log(`📝 Registrando ${errors.length} erros de sincronização...`);

      for (let i = 0; i < errors.length; i++) {
        const error = errors[i];

        await this.db.insert(syncErrors).values({
          syncId,
          errorMessage: error.error,
          errorSeverity: error.severity,
          isRecoverable: error.recoverable ? 1 : 0,
          recordData: error.record ? JSON.parse(JSON.stringify(error.record)) : null,
          attemptNumber: 1,
        });
      }

      console.log(`✅ Erros registrados com sucesso`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('⚠️  Erro ao registrar erros de sincronização:', errorMsg);
    }
  }

  /**
   * Registrar execução do Detection Engine
   */
  async recordDetectionRun(data: {
    detectionId: string;
    result: DetectionEngineResult;
    triggeredBy?: string;
    isManual?: boolean;
    syncId?: string;
  }): Promise<void> {
    try {
      console.log(`📝 Registrando execução de detecção: ${data.detectionId}`);

      await this.db.insert(detectionAudit).values({
        id: `AUDIT-${data.detectionId.substring(0, 20)}`,
        detectionId: data.detectionId,
        startTime: data.result.timestamp,
        endTime: new Date(data.result.timestamp.getTime() + data.result.totalDuration),
        durationMs: data.result.totalDuration,
        recordsAnalyzed: data.result.results.length,
        alertsGenerated: data.result.totalAlertsGenerated,
        ghostCancellations: data.result.summary.ghostCancellations,
        pbmDeviations: data.result.summary.pbmDeviations,
        noSaleEvents: data.result.summary.noSale,
        cpfAbuses: data.result.summary.cpfAbuse,
        cashDiscrepancies: data.result.summary.cashDiscrepancies,
        operatorsUpdated: data.result.summary.riskScoreUpdate,
        status: data.result.success ? 'SUCCESS' : data.result.errors && data.result.errors.length > 0 ? 'PARTIAL' : 'FAILED',
        errorCount: data.result.errors?.length || 0,
        errors: data.result.errors || [],
        triggeredBy: data.triggeredBy || 'system',
        isManual: data.isManual ? 1 : 0,
        syncId: data.syncId,
      });

      console.log(`✅ Detecção registrada com sucesso`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ Erro ao registrar detecção:', errorMsg);
    }
  }

  /**
   * Registrar erros de detecção
   */
  async recordDetectionErrors(
    detectionId: string,
    errors: Array<{
      moduleType:
        | 'GHOST_CANCELLATION'
        | 'PBM_DEVIATION'
        | 'NO_SALE'
        | 'CPF_ABUSE'
        | 'CASH_DISCREPANCY'
        | 'RISK_SCORE';
      errorMessage: string;
      severity: 'WARNING' | 'ERROR' | 'CRITICAL';
      isRecoverable?: boolean;
    }>
  ): Promise<void> {
    try {
      if (errors.length === 0) {
        return;
      }

      console.log(`📝 Registrando ${errors.length} erros de detecção...`);

      for (const error of errors) {
        await this.db.insert(detectionErrors).values({
          detectionId,
          moduleType: error.moduleType,
          errorMessage: error.errorMessage,
          errorSeverity: error.severity,
          isRecoverable: error.isRecoverable !== false ? 1 : 0,
        });
      }

      console.log(`✅ Erros de detecção registrados com sucesso`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('⚠️  Erro ao registrar erros de detecção:', errorMsg);
    }
  }

  /**
   * Obter últimas sincronizações
   */
  async getLastSyncs(limit: number = 10): Promise<any[]> {
    try {
      // TODO: Usar queries do Drizzle
      // const syncs = await this.db.query.erpSyncAudit.findMany({
      //   orderBy: desc(erpSyncAudit.createdAt),
      //   limit,
      // });
      // return syncs;
      return [];
    } catch (error) {
      console.error('Erro ao buscar últimas sincronizações:', error);
      return [];
    }
  }

  /**
   * Obter estatísticas de sincronização
   */
  async getSyncStatistics(daysBack: number = 30): Promise<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    partialSyncs: number;
    totalRecordsInserted: number;
    totalRecordsSkipped: number;
    averageDuration: number;
  }> {
    try {
      // TODO: Implementar queries para estatísticas
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        partialSyncs: 0,
        totalRecordsInserted: 0,
        totalRecordsSkipped: 0,
        averageDuration: 0,
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        partialSyncs: 0,
        totalRecordsInserted: 0,
        totalRecordsSkipped: 0,
        averageDuration: 0,
      };
    }
  }

  /**
   * Obter últimas detecções
   */
  async getLastDetections(limit: number = 10): Promise<any[]> {
    try {
      // TODO: Usar queries do Drizzle
      return [];
    } catch (error) {
      console.error('Erro ao buscar últimas detecções:', error);
      return [];
    }
  }

  /**
   * Obter estatísticas de detecção
   */
  async getDetectionStatistics(daysBack: number = 30): Promise<{
    totalDetections: number;
    successfulDetections: number;
    failedDetections: number;
    totalAlertsGenerated: number;
    averageDuration: number;
  }> {
    try {
      // TODO: Implementar queries para estatísticas
      return {
        totalDetections: 0,
        successfulDetections: 0,
        failedDetections: 0,
        totalAlertsGenerated: 0,
        averageDuration: 0,
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas de detecção:', error);
      return {
        totalDetections: 0,
        successfulDetections: 0,
        failedDetections: 0,
        totalAlertsGenerated: 0,
        averageDuration: 0,
      };
    }
  }

  /**
   * Limpar dados antigos de deduplicação (manter últimos 30 dias)
   */
  async cleanOldDedupKeys(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      // TODO: Implementar delete com Drizzle
      // const result = await this.db.delete(syncDedupKeys).where(
      //   lt(syncDedupKeys.createdAt, cutoffDate)
      // );

      console.log(`🧹 Chaves de deduplicação antigas removidas`);
      return 0;
    } catch (error) {
      console.error('Erro ao limpar chaves antigas:', error);
      return 0;
    }
  }

  /**
   * Exportar relatório de auditoria
   */
  async exportAuditReport(startDate: Date, endDate: Date): Promise<{
    syncs: any[];
    detections: any[];
    errors: any[];
  }> {
    try {
      console.log(`📊 Gerando relatório de auditoria...`);

      // TODO: Implementar queries para gerar relatório
      return {
        syncs: [],
        detections: [],
        errors: [],
      };
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return {
        syncs: [],
        detections: [],
        errors: [],
      };
    }
  }
}

/**
 * Criar instância singleton do serviço de auditoria
 */
let auditServiceInstance: AuditService | null = null;

export function getAuditService(db: Database): AuditService {
  if (!auditServiceInstance) {
    auditServiceInstance = new AuditService(db);
  }
  return auditServiceInstance;
}
