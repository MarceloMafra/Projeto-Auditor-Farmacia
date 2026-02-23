import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { eq, gte, lte, and, desc, asc } from 'drizzle-orm';
import { auditAlerts, operatorRiskScore, employees } from '@/db/schema';
import { alertFiltersSchema, highRiskOperatorsSchema, validateDateRange } from '../validations';
import { TRPCError } from '@trpc/server';

/**
 * Audit Router - Detecção de fraudes e investigação
 */
export const auditRouter = router({
  /**
   * Obter alertas de um operador específico
   * Retorna todos os alertas associados a um operador com filtros opcionais
   */
  getAlertsByOperator: protectedProcedure
    .input(
      z.object({
        operatorCpf: z.string().length(11),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        alertType: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(10),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Validar intervalo de datas
        if (!validateDateRange(input.dateFrom, input.dateTo)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Data inicial deve ser anterior à data final',
          });
        }

        // Construir condições WHERE
        const conditions = [eq(auditAlerts.idOperator, input.operatorCpf)];

        if (input.dateFrom) {
          conditions.push(gte(auditAlerts.createdAt, input.dateFrom));
        }
        if (input.dateTo) {
          conditions.push(lte(auditAlerts.createdAt, input.dateTo));
        }
        if (input.alertType) {
          conditions.push(eq(auditAlerts.alertType, input.alertType as any));
        }
        if (input.status) {
          conditions.push(eq(auditAlerts.status, input.status as any));
        }

        // Executar query
        const alerts = await ctx.db
          .select()
          .from(auditAlerts)
          .where(and(...conditions))
          .orderBy(desc(auditAlerts.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        // Contar total (para paginação)
        const [{ count }] = await ctx.db
          .select({ count: auditAlerts.id.count() })
          .from(auditAlerts)
          .where(and(...conditions));

        return {
          alerts: alerts.map((alert) => ({
            ...alert,
            evidence: alert.evidence ? JSON.parse(JSON.stringify(alert.evidence)) : null,
          })),
          total: count || 0,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error in getAlertsByOperator:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar alertas do operador',
        });
      }
    }),

  /**
   * Obter operadores com alto risco de fraude
   * Retorna operadores ranqueados por risk score em ordem decrescente
   */
  getHighRiskOperators: protectedProcedure
    .input(highRiskOperatorsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const highRiskOps = await ctx.db
          .select({
            cpf: employees.cpf,
            name: employees.name,
            riskScore: operatorRiskScore.riskScore,
            riskLevel: operatorRiskScore.riskLevel,
            ghostCancellations: operatorRiskScore.ghostCancellations,
            pbmDeviations: operatorRiskScore.pbmDeviations,
            noSaleEvents: operatorRiskScore.noSaleEvents,
            cpfAbuseCount: operatorRiskScore.cpfAbuseCount,
            cashDiscrepancies: operatorRiskScore.cashDiscrepancies,
            calculatedAt: operatorRiskScore.calculatedAt,
          })
          .from(operatorRiskScore)
          .innerJoin(employees, eq(operatorRiskScore.idOperator, employees.cpf))
          .where(gte(operatorRiskScore.riskScore, input.minRiskScore))
          .orderBy(desc(operatorRiskScore.riskScore))
          .limit(input.limit);

        return highRiskOps.map((op) => ({
          operatorCpf: op.cpf,
          operatorName: op.name,
          riskScore: op.riskScore,
          riskLevel: op.riskLevel,
          alerts: {
            ghostCancellations: op.ghostCancellations,
            pbmDeviations: op.pbmDeviations,
            noSaleEvents: op.noSaleEvents,
            cpfAbuseCount: op.cpfAbuseCount,
            cashDiscrepancies: op.cashDiscrepancies,
          },
          calculatedAt: op.calculatedAt,
        }));
      } catch (error) {
        console.error('Error in getHighRiskOperators:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar operadores de alto risco',
        });
      }
    }),

  /**
   * Recalcular risk scores para todos os operadores
   * Executa agregação de todos os alertas e atualiza tb_operator_risk_score
   *
   * NOTA: Em produção, isso seria agendado (batch job 03:00 AM)
   * Por enquanto, pode ser chamado manualmente via API
   */
  calculateRiskScores: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      // TODO: Implementar lógica de cálculo de risk scores
      // Por enquanto, retornar placeholder
      return {
        processed: 0,
        updated: 0,
        message: 'Risk score calculation - implementar em Fase 1.1',
      };
    } catch (error) {
      console.error('Error in calculateRiskScores:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao calcular risk scores',
      });
    }
  }),

  /**
   * Obter detalhes completos de um alerta específico
   * Inclui evidence, operador, e alertas relacionados
   */
  getAlertById: protectedProcedure
    .input(z.object({ alertId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const alert = await ctx.db
          .select()
          .from(auditAlerts)
          .where(eq(auditAlerts.id, input.alertId))
          .limit(1);

        if (!alert || alert.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Alerta não encontrado',
          });
        }

        const alertData = alert[0];

        // Buscar operador
        const operator = await ctx.db
          .select()
          .from(employees)
          .where(eq(employees.cpf, alertData.idOperator))
          .limit(1);

        // Buscar alertas relacionados do mesmo operador
        const relatedAlerts = await ctx.db
          .select()
          .from(auditAlerts)
          .where(and(eq(auditAlerts.idOperator, alertData.idOperator)))
          .orderBy(desc(auditAlerts.createdAt))
          .limit(5);

        return {
          ...alertData,
          evidence: alertData.evidence ? JSON.parse(JSON.stringify(alertData.evidence)) : null,
          operator: operator[0] || null,
          relatedAlerts: relatedAlerts.map((a) => ({
            id: a.id,
            type: a.alertType,
            severity: a.severity,
            status: a.status,
            createdAt: a.createdAt,
          })),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error in getAlertById:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar alerta',
        });
      }
    }),
});
