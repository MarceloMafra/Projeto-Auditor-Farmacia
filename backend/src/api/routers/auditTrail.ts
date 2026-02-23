/**
 * Audit Trail Router
 *
 * Procedures para acessar dados de auditoria de sincronizações e detecções
 * - auditTrail.getSyncHistory: Histórico de sincronizações ERP
 * - auditTrail.getDetectionHistory: Histórico de execuções de detecção
 * - auditTrail.getSyncStatistics: Estatísticas de sincronização
 * - auditTrail.getDetectionStatistics: Estatísticas de detecção
 */

import { router, adminProcedure } from '@/api/trpc';
import { getAuditService } from '@/services/audit';
import { z } from 'zod';

export const auditTrailRouter = router({
  /**
   * Obter histórico de sincronizações ERP
   */
  getSyncHistory: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        daysBack: z.number().min(1).max(365).optional().default(30),
        databaseType: z.enum(['mysql', 'postgresql', 'oracle', 'sqlserver']).optional(),
        status: z.enum(['SUCCESS', 'PARTIAL', 'FAILED']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const auditService = getAuditService(ctx.db);

        // TODO: Implementar query com filtros
        const syncs = await auditService.getLastSyncs(input.limit);

        return {
          success: true,
          syncs: syncs.map((s) => ({
            syncId: s.syncId,
            databaseType: s.databaseType,
            syncType: s.syncType,
            timestamp: s.startTime,
            duration: s.durationMs,
            recordsInserted: s.recordsInserted,
            recordsSkipped: s.recordsSkipped,
            status: s.status,
            isManual: s.isManual === 1,
          })),
          total: syncs.length,
        };
      } catch (error) {
        return {
          success: false,
          syncs: [],
          total: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Obter histórico de detecções
   */
  getDetectionHistory: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(20),
        daysBack: z.number().min(1).max(365).optional().default(30),
        status: z.enum(['SUCCESS', 'PARTIAL', 'FAILED']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const auditService = getAuditService(ctx.db);

        // TODO: Implementar query com filtros
        const detections = await auditService.getLastDetections(input.limit);

        return {
          success: true,
          detections: detections.map((d) => ({
            detectionId: d.detectionId,
            timestamp: d.startTime,
            duration: d.durationMs,
            alertsGenerated: d.alertsGenerated,
            summary: {
              ghostCancellations: d.ghostCancellations,
              pbmDeviations: d.pbmDeviations,
              noSaleEvents: d.noSaleEvents,
              cpfAbuses: d.cpfAbuses,
              cashDiscrepancies: d.cashDiscrepancies,
            },
            status: d.status,
            isManual: d.isManual === 1,
          })),
          total: detections.length,
        };
      } catch (error) {
        return {
          success: false,
          detections: [],
          total: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Obter estatísticas de sincronização
   */
  getSyncStatistics: adminProcedure
    .input(
      z.object({
        daysBack: z.number().min(1).max(365).optional().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const auditService = getAuditService(ctx.db);

        const stats = await auditService.getSyncStatistics(input.daysBack);

        return {
          success: true,
          statistics: {
            totalSyncs: stats.totalSyncs,
            successfulSyncs: stats.successfulSyncs,
            failedSyncs: stats.failedSyncs,
            partialSyncs: stats.partialSyncs,
            successRate: stats.totalSyncs > 0 ? ((stats.successfulSyncs / stats.totalSyncs) * 100).toFixed(2) : 0,
            totalRecordsInserted: stats.totalRecordsInserted,
            totalRecordsSkipped: stats.totalRecordsSkipped,
            averageDuration: stats.averageDuration,
          },
        };
      } catch (error) {
        return {
          success: false,
          statistics: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Obter estatísticas de detecção
   */
  getDetectionStatistics: adminProcedure
    .input(
      z.object({
        daysBack: z.number().min(1).max(365).optional().default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const auditService = getAuditService(ctx.db);

        const stats = await auditService.getDetectionStatistics(input.daysBack);

        return {
          success: true,
          statistics: {
            totalDetections: stats.totalDetections,
            successfulDetections: stats.successfulDetections,
            failedDetections: stats.failedDetections,
            successRate: stats.totalDetections > 0 ? ((stats.successfulDetections / stats.totalDetections) * 100).toFixed(2) : 0,
            totalAlertsGenerated: stats.totalAlertsGenerated,
            averageAlertsPerRun: stats.totalDetections > 0 ? (stats.totalAlertsGenerated / stats.totalDetections).toFixed(2) : 0,
            averageDuration: stats.averageDuration,
          },
        };
      } catch (error) {
        return {
          success: false,
          statistics: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Exportar relatório de auditoria
   */
  exportAuditReport: adminProcedure
    .input(
      z.object({
        startDate: z.string().datetime(),
        endDate: z.string().datetime(),
        includeErrors: z.boolean().optional().default(true),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const auditService = getAuditService(ctx.db);

        const report = await auditService.exportAuditReport(
          new Date(input.startDate),
          new Date(input.endDate)
        );

        return {
          success: true,
          report: {
            periodStart: input.startDate,
            periodEnd: input.endDate,
            syncs: report.syncs,
            detections: report.detections,
            errors: input.includeErrors ? report.errors : [],
          },
        };
      } catch (error) {
        return {
          success: false,
          report: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),

  /**
   * Limpar dados antigos
   */
  cleanOldData: adminProcedure
    .input(
      z.object({
        daysToKeep: z.number().min(7).max(365).optional().default(30),
        dryRun: z.boolean().optional().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const auditService = getAuditService(ctx.db);

        if (!input.dryRun) {
          const removed = await auditService.cleanOldDedupKeys(input.daysToKeep);

          return {
            success: true,
            message: `Limpeza concluída: ${removed} registros removidos`,
            recordsRemoved: removed,
          };
        } else {
          return {
            success: true,
            message: 'Simulação: nenhum dado foi removido',
            recordsRemoved: 0,
          };
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
          recordsRemoved: 0,
        };
      }
    }),
});
