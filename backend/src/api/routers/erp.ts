/**
 * ERP Router
 *
 * Procedures:
 * - erp.testConnection: Testar conexão com ERP
 * - erp.syncNow: Executar sincronização manual
 * - erp.getStatus: Status do serviço de sincronização
 * - erp.getSyncHistory: Histórico de sincronizações
 * - erp.getSupportedDatabases: Listar tipos de banco suportados
 */

import { router, adminProcedure } from '@/api/trpc';
import { ErpSyncService } from '@/services/erp';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

let lastSyncResult: any = null;
let syncRunning = false;

// Validação de config ERP
const erpConfigSchema = z.object({
  type: z.enum(['mysql', 'postgresql', 'oracle', 'sqlserver']),
  host: z.string().min(1),
  port: z.number().min(1).max(65535),
  database: z.string().min(1),
  username: z.string().min(1),
  password: z.string().min(1),
  ssl: z.boolean().optional(),
});

export const erpRouter = router({
  /**
   * Testar conexão com ERP
   */
  testConnection: adminProcedure
    .input(erpConfigSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        console.log(`🔍 Testando conexão com ${input.type} ERP...`);

        const syncService = new ErpSyncService(ctx.db, input);
        const result = await syncService.testConnection();

        if (result) {
          return {
            success: true,
            message: `✅ Conexão com ${input.type} ERP estabelecida com sucesso`,
          };
        } else {
          return {
            success: false,
            message: `❌ Falha ao conectar com ${input.type} ERP`,
          };
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erro ao testar conexão ERP: ${errorMsg}`,
        });
      }
    }),

  /**
   * Executar sincronização manual
   */
  syncNow: adminProcedure
    .input(
      erpConfigSchema.extend({
        fullSync: z.boolean().optional().default(false),
        daysBack: z.number().min(1).max(365).optional().default(30),
        batchSize: z.number().min(100).max(10000).optional().default(1000),
        maxRecords: z.number().min(100).optional().default(50000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (syncRunning) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Sincronização já está em andamento. Aguarde a conclusão.',
        });
      }

      syncRunning = true;

      try {
        console.log(`🚀 Sincronização manual iniciada por ${ctx.userId}`);

        const syncService = new ErpSyncService(ctx.db, {
          type: input.type,
          host: input.host,
          port: input.port,
          database: input.database,
          username: input.username,
          password: input.password,
          ssl: input.ssl,
        });

        const result = await syncService.sync({
          fullSync: input.fullSync,
          daysBack: input.daysBack,
          batchSize: input.batchSize,
          maxRecords: input.maxRecords,
        });

        lastSyncResult = {
          result,
          triggeredBy: ctx.userId,
          triggeredAt: new Date(),
          isManual: true,
        };

        return {
          success: result.success,
          message: `Sincronização concluída: ${result.recordsInserted} registros inseridos, ${result.recordsSkipped} duplicados`,
          data: {
            syncId: 'SYNC-' + new Date().toISOString().split('T')[0],
            databaseType: result.databaseType,
            recordsFetched: result.recordsFetched,
            recordsProcessed: result.recordsProcessed,
            recordsInserted: result.recordsInserted,
            recordsUpdated: result.recordsUpdated,
            recordsSkipped: result.recordsSkipped,
            duration: result.duration,
            timestamp: result.startTime,
            errorCount: result.errors.length,
          },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('❌ Erro ao executar sincronização:', errorMsg);

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erro ao executar sincronização: ${errorMsg}`,
        });
      } finally {
        syncRunning = false;
      }
    }),

  /**
   * Obter status do serviço de sincronização
   */
  getStatus: adminProcedure.query(async ({ ctx }) => {
    return {
      running: syncRunning,
      lastSync: lastSyncResult
        ? {
            timestamp: lastSyncResult.triggeredAt,
            isManual: lastSyncResult.isManual,
            recordsInserted: lastSyncResult.result.recordsInserted,
            recordsSkipped: lastSyncResult.result.recordsSkipped,
            duration: lastSyncResult.result.duration,
          }
        : null,
      nextScheduledSync: {
        time: 'Hourly',
        description: 'Sincronização automática a cada hora',
      },
      supportedDatabases: getSupportedDatabaseTypes(),
    };
  }),

  /**
   * Obter histórico de sincronizações
   */
  getSyncHistory: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // TODO: Buscar do banco de dados tb_erp_sync_audit
        return {
          syncs: [
            {
              syncId: 'SYNC-2024-01-15',
              databaseType: 'mysql',
              timestamp: new Date(),
              duration: 2500,
              recordsProcessed: 1250,
              recordsInserted: 1200,
              recordsSkipped: 50,
              status: 'SUCCESS',
              triggeredBy: 'system',
              isManual: false,
            },
          ],
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar histórico de sincronizações',
        });
      }
    }),

  /**
   * Obter tipos de banco suportados
   */
  getSupportedDatabases: adminProcedure.query(async ({ ctx }) => {
    return {
      databases: [
        {
          type: 'mysql',
          name: 'MySQL 5.7+',
          description: 'MySQL e MariaDB compatíveis',
          driver: 'mysql2',
          port: 3306,
        },
        {
          type: 'postgresql',
          name: 'PostgreSQL 10+',
          description: 'PostgreSQL com suporte a SSL',
          driver: 'pg',
          port: 5432,
        },
        {
          type: 'oracle',
          name: 'Oracle Database 11g+',
          description: 'Oracle Database com oracledb driver',
          driver: 'oracledb',
          port: 1521,
          needsInstall: true,
        },
        {
          type: 'sqlserver',
          name: 'SQL Server 2016+',
          description: 'SQL Server com mssql driver',
          driver: 'mssql',
          port: 1433,
          needsInstall: true,
        },
      ],
    };
  }),
});
