/**
 * Detection Router
 *
 * Procedures:
 * - detection.runNow: Executar detecção manualmente (requer permissão ADMIN)
 * - detection.getLastRun: Buscar último resultado de enriquecimento
 * - detection.getStatus: Status atual do sistema de detecção
 */

import { router, adminProcedure } from '@/api/trpc';
import { runDetectionEngine } from '@/services/detection';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

let lastDetectionRun: any = null;
let detectionRunning = false;

export const detectionRouter = router({
  /**
   * Executar detecção sob demanda
   * Requer permissão ADMIN
   */
  runNow: adminProcedure
    .input(
      z.object({
        daysBack: z.number().min(1).max(90).optional().default(30),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Evitar múltiplas execuções simultâneas
      if (detectionRunning) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Detecção já está em execução. Aguarde a conclusão.',
        });
      }

      detectionRunning = true;

      try {
        const dateFrom = new Date(Date.now() - input.daysBack * 24 * 60 * 60 * 1000);

        console.log(`🚀 Detecção sob demanda iniciada por ${ctx.userId}`);
        console.log(`   Período: últimos ${input.daysBack} dias`);

        const result = await runDetectionEngine(ctx.db, dateFrom);

        lastDetectionRun = {
          result,
          triggeredBy: ctx.userId,
          triggeredAt: new Date(),
          isManual: true,
        };

        console.log(`✅ Detecção sob demanda concluída`);
        console.log(`   Alertas gerados: ${result.totalAlertsGenerated}`);

        return {
          success: true,
          message: `Detecção concluída com ${result.totalAlertsGenerated} fraudes detectadas`,
          data: {
            totalAlertsGenerated: result.totalAlertsGenerated,
            totalDuration: result.totalDuration,
            summary: result.summary,
            timestamp: result.timestamp,
          },
        };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error('❌ Erro ao executar detecção:', errorMsg);

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erro ao executar detecção: ${errorMsg}`,
        });
      } finally {
        detectionRunning = false;
      }
    }),

  /**
   * Buscar resultado da última execução de detecção
   */
  getLastRun: adminProcedure.query(async ({ ctx }) => {
    if (!lastDetectionRun) {
      // Se nunca foi executado, tentar buscar do banco
      // Por enquanto retorna null
      return null;
    }

    return {
      result: {
        totalAlertsGenerated: lastDetectionRun.result.totalAlertsGenerated,
        totalDuration: lastDetectionRun.result.totalDuration,
        summary: lastDetectionRun.result.summary,
        timestamp: lastDetectionRun.result.timestamp,
        success: lastDetectionRun.result.success,
      },
      triggeredBy: lastDetectionRun.triggeredBy,
      triggeredAt: lastDetectionRun.triggeredAt,
      isManual: lastDetectionRun.isManual,
    };
  }),

  /**
   * Verificar status do sistema de detecção
   */
  getStatus: adminProcedure.query(async ({ ctx }) => {
    return {
      running: detectionRunning,
      lastRun: lastDetectionRun
        ? {
            timestamp: lastDetectionRun.triggeredAt,
            isManual: lastDetectionRun.isManual,
          }
        : null,
      nextScheduledRun: {
        time: '03:00 AM',
        timezone: 'America/Sao_Paulo',
        frequency: 'Diariamente',
      },
      modules: [
        {
          name: 'Ghost Cancellation',
          description: 'Detecção de devoluções fantasma',
          status: 'active',
          riskScore: 30,
        },
        {
          name: 'PBM Deviation',
          description: 'Detecção de desvios de autorização PBM',
          status: 'active',
          riskScore: 40,
        },
        {
          name: 'No Sale (Gaveta Cega)',
          description: 'Detecção de aberturas de gaveta sem venda',
          status: 'active',
          riskScore: 20,
        },
        {
          name: 'CPF Abuse',
          description: 'Detecção de abuso de CPF',
          status: 'active',
          riskScore: 50,
        },
        {
          name: 'Cash Discrepancy',
          description: 'Detecção de discrepâncias de caixa',
          status: 'active',
          riskScore: 35,
        },
        {
          name: 'Risk Score Calculation',
          description: 'Cálculo agregado de scores de risco',
          status: 'active',
          riskScore: 0,
        },
      ],
    };
  }),
});
