import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { gte, lte, and, eq } from 'drizzle-orm';
import { auditAlerts, operatorRiskScore, sales, cancellations } from '@/db/schema';
import { dashboardFiltersSchema, validateDateRange } from '../validations';
import { TRPCError } from '@trpc/server';

/**
 * KPIs Router - Métricas para dashboard
 * Retorna 8 KPIs principais para análise do status do sistema
 */
export const kpisRouter = router({
  /**
   * Obter todos os KPIs para dashboard
   * Retorna 8 métricas principais: alertas pendentes, operadores alto risco,
   * taxa cancelamento, detecções ativas, tempo investigação, acurácia,
   * cobertura farmácias, valor recuperado
   */
  getDashboard: protectedProcedure
    .input(dashboardFiltersSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Validar intervalo de datas
        if (!validateDateRange(input.dateFrom, input.dateTo)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Data inicial deve ser anterior à data final',
          });
        }

        // Determinar período (últimos 30 dias se não especificado)
        const dateFrom = input.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const dateTo = input.dateTo || new Date();

        // ==================== KPI 1: Alertas Pendentes ====================
        const [{ count: pendingAlerts }] = await ctx.db
          .select({ count: auditAlerts.id.count() })
          .from(auditAlerts)
          .where(and(eq(auditAlerts.status, 'Pending'), gte(auditAlerts.createdAt, dateFrom)));

        // ==================== KPI 2: Operadores Alto Risco ====================
        const [{ count: highRiskOperators }] = await ctx.db
          .select({ count: operatorRiskScore.idOperator.countDistinct() })
          .from(operatorRiskScore)
          .where(gte(operatorRiskScore.riskScore, 150));

        // ==================== KPI 3: Taxa de Cancelamento ====================
        const [{ totalSales }] = await ctx.db
          .select({ totalSales: sales.id.count() })
          .from(sales)
          .where(and(gte(sales.timestampSale, dateFrom), lte(sales.timestampSale, dateTo)));

        const [{ totalCancellations }] = await ctx.db
          .select({ totalCancellations: cancellations.id.count() })
          .from(cancellations)
          .where(and(gte(cancellations.timestampCancellation, dateFrom), lte(cancellations.timestampCancellation, dateTo)));

        const cancellationRate = totalSales > 0 ? (totalCancellations / totalSales) * 100 : 0;

        // ==================== KPI 4: Detecções Ativas ====================
        // Contar módulos de detecção que geraram alertas (placeholder)
        const detectionTypes = await ctx.db
          .select({ type: auditAlerts.alertType.count() })
          .from(auditAlerts)
          .where(gte(auditAlerts.createdAt, dateFrom));

        const detectionsActive = detectionTypes.length > 0 ? Math.min(detectionTypes.length, 6) : 0;

        // ==================== KPI 5: Tempo Médio de Investigação ====================
        // Calcular tempo médio entre criação e investigação
        const investigatedAlerts = await ctx.db
          .select()
          .from(auditAlerts)
          .where(
            and(
              gte(auditAlerts.createdAt, dateFrom),
              lte(auditAlerts.createdAt, dateTo),
              eq(auditAlerts.investigatedBy, null) // Implementar depois com datas reais
            )
          )
          .limit(1000);

        const avgInvestigationTime = 2; // Placeholder: 2 horas

        // ==================== KPI 6: Taxa de Acurácia ====================
        const [{ fraudConfirmed }] = await ctx.db
          .select({ fraudConfirmed: auditAlerts.id.count() })
          .from(auditAlerts)
          .where(
            and(
              eq(auditAlerts.status, 'Fraude Confirmada'),
              gte(auditAlerts.createdAt, dateFrom),
              lte(auditAlerts.createdAt, dateTo)
            )
          );

        const [{ totalAlerts }] = await ctx.db
          .select({ totalAlerts: auditAlerts.id.count() })
          .from(auditAlerts)
          .where(and(gte(auditAlerts.createdAt, dateFrom), lte(auditAlerts.createdAt, dateTo)));

        const accuracyRate = totalAlerts > 0 ? (fraudConfirmed / totalAlerts) * 100 : 0;

        // ==================== KPI 7: Cobertura de Farmácias ====================
        // Placeholder: 30 farmácias
        const pharmaciesCovered = 30;

        // ==================== KPI 8: Valor Recuperado ====================
        // Suma de valores de fraudes confirmadas
        const fraudulentAlerts = await ctx.db
          .select({ amount: auditAlerts.saleAmount })
          .from(auditAlerts)
          .where(
            and(
              eq(auditAlerts.status, 'Fraude Confirmada'),
              gte(auditAlerts.createdAt, dateFrom),
              lte(auditAlerts.createdAt, dateTo)
            )
          );

        const recoveredValue = fraudulentAlerts.reduce((sum, alert) => {
          const amount = alert.amount ? parseFloat(alert.amount.toString()) : 0;
          return sum + amount;
        }, 0);

        return {
          period: { from: dateFrom, to: dateTo },
          kpis: {
            pendingAlerts: pendingAlerts || 0,
            highRiskOperators: highRiskOperators || 0,
            cancellationRate: parseFloat(cancellationRate.toFixed(2)),
            detectionsActive: detectionsActive,
            avgInvestigationTime,
            accuracyRate: parseFloat(accuracyRate.toFixed(2)),
            pharmaciesCovered,
            recoveredValue: parseFloat(recoveredValue.toFixed(2)),
          },
        };
      } catch (error) {
        console.error('Error in kpis.getDashboard:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar KPIs do dashboard',
        });
      }
    }),

  /**
   * Obter série temporal de um KPI específico
   * Útil para gráficos de evolução (últimos 30 dias)
   */
  getTimeSeries: protectedProcedure
    .input(
      z.object({
        metric: z.enum(['alertsCreated', 'fraudConfirmed', 'investigationTime', 'riskScoreEvolution']),
        interval: z.enum(['daily', 'weekly']).default('daily'),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Placeholder: Implementar depois com dados reais
        return {
          metric: input.metric,
          interval: input.interval,
          data: [], // Será preenchido com dados reais
        };
      } catch (error) {
        console.error('Error in kpis.getTimeSeries:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar série temporal de KPI',
        });
      }
    }),
});
