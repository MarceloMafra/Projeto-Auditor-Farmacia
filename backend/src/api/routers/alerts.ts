import { z } from 'zod';
import { protectedProcedure, adminProcedure, router } from '../trpc';
import { eq, gte, lte, and, desc } from 'drizzle-orm';
import { auditAlerts } from '@/db/schema';
import { alertFiltersSchema, updateAlertStatusSchema, validateDateRange } from '../validations';
import { TRPCError } from '@trpc/server';

/**
 * Alerts Router - Gerenciamento de alertas gerados
 */
export const alertsRouter = router({
  /**
   * Listar todos os alertas com filtros opcionais
   * Retorna alertas paginados, ranqueados por data (mais recentes primeiro)
   */
  getAll: protectedProcedure
    .input(alertFiltersSchema)
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
        const conditions: any[] = [];

        if (input.dateFrom) {
          conditions.push(gte(auditAlerts.createdAt, input.dateFrom));
        }
        if (input.dateTo) {
          conditions.push(lte(auditAlerts.createdAt, input.dateTo));
        }
        if (input.status) {
          conditions.push(eq(auditAlerts.status, input.status as any));
        }
        if (input.severity) {
          conditions.push(eq(auditAlerts.severity, input.severity as any));
        }
        if (input.alertType) {
          conditions.push(eq(auditAlerts.alertType, input.alertType as any));
        }
        if (input.operatorCpf) {
          conditions.push(eq(auditAlerts.idOperator, input.operatorCpf));
        }

        // Executar query
        const alerts = await ctx.db
          .select()
          .from(auditAlerts)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(auditAlerts.createdAt))
          .limit(input.limit)
          .offset(input.offset);

        // Contar total
        const [{ count }] = await ctx.db
          .select({ count: auditAlerts.id.count() })
          .from(auditAlerts)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

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
        console.error('Error in alerts.getAll:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar alertas',
        });
      }
    }),

  /**
   * Obter alerta por ID
   * Inclui detalhes completos e evidence
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const alert = await ctx.db
          .select()
          .from(auditAlerts)
          .where(eq(auditAlerts.id, input.id))
          .limit(1);

        if (!alert || alert.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Alerta não encontrado',
          });
        }

        const alertData = alert[0];
        return {
          ...alertData,
          evidence: alertData.evidence ? JSON.parse(JSON.stringify(alertData.evidence)) : null,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error in alerts.getById:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar alerta',
        });
      }
    }),

  /**
   * Atualizar status de um alerta
   * Analistas podem marcar como: Investigado, Falso Positivo, Fraude Confirmada
   * Apenas admins podem fazer rollback para Pending
   */
  updateStatus: protectedProcedure
    .input(updateAlertStatusSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        // Verificar se alerta existe
        const existing = await ctx.db
          .select()
          .from(auditAlerts)
          .where(eq(auditAlerts.id, input.alertId))
          .limit(1);

        if (!existing || existing.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Alerta não encontrado',
          });
        }

        // Atualizar status e notas
        const result = await ctx.db
          .update(auditAlerts)
          .set({
            status: input.status as any,
            investigationNotes: input.notes || null,
            investigatedBy: ctx.user?.id || null,
          })
          .where(eq(auditAlerts.id, input.alertId));

        // Buscar alerta atualizado
        const updated = await ctx.db
          .select()
          .from(auditAlerts)
          .where(eq(auditAlerts.id, input.alertId))
          .limit(1);

        if (!updated || updated.length === 0) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Erro ao atualizar alerta',
          });
        }

        return {
          ...updated[0],
          evidence: updated[0].evidence ? JSON.parse(JSON.stringify(updated[0].evidence)) : null,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error in alerts.updateStatus:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao atualizar status do alerta',
        });
      }
    }),

  /**
   * Contar alertas por status (para dashboard)
   */
  countByStatus: protectedProcedure.query(async ({ ctx }) => {
    try {
      const result = await ctx.db
        .select({
          status: auditAlerts.status,
          count: auditAlerts.id.count(),
        })
        .from(auditAlerts)
        .groupBy(auditAlerts.status);

      return result.reduce(
        (acc, row) => {
          acc[row.status as string] = row.count || 0;
          return acc;
        },
        {} as Record<string, number>
      );
    } catch (error) {
      console.error('Error in alerts.countByStatus:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao contar alertas',
      });
    }
  }),

  /**
   * Contar alertas por severidade (para dashboard)
   */
  countBySeverity: protectedProcedure.query(async ({ ctx }) => {
    try {
      const result = await ctx.db
        .select({
          severity: auditAlerts.severity,
          count: auditAlerts.id.count(),
        })
        .from(auditAlerts)
        .groupBy(auditAlerts.severity);

      return result.reduce(
        (acc, row) => {
          acc[row.severity as string] = row.count || 0;
          return acc;
        },
        {} as Record<string, number>
      );
    } catch (error) {
      console.error('Error in alerts.countBySeverity:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao contar alertas por severidade',
      });
    }
  }),

  /**
   * Contar alertas por tipo (para dashboard)
   */
  countByType: protectedProcedure.query(async ({ ctx }) => {
    try {
      const result = await ctx.db
        .select({
          type: auditAlerts.alertType,
          count: auditAlerts.id.count(),
        })
        .from(auditAlerts)
        .groupBy(auditAlerts.alertType);

      return result.reduce(
        (acc, row) => {
          acc[row.type as string] = row.count || 0;
          return acc;
        },
        {} as Record<string, number>
      );
    } catch (error) {
      console.error('Error in alerts.countByType:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao contar alertas por tipo',
      });
    }
  }),
});
