import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { eq, gte, lte, and, desc } from 'drizzle-orm';
import { employees, operatorRiskScore, auditAlerts } from '@/db/schema';
import { operatorProfileSchema, validateDateRange } from '../validations';
import { TRPCError } from '@trpc/server';

/**
 * Operators Router - Perfil e histórico de operadores
 */
export const operatorsRouter = router({
  /**
   * Obter perfil completo de um operador
   * Inclui dados pessoais, risk score, histórico de alertas
   */
  getProfile: protectedProcedure
    .input(operatorProfileSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Validar CPF
        if (!/^\d{11}$/.test(input.operatorCpf)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'CPF inválido (deve ter 11 dígitos)',
          });
        }

        // Validar intervalo de datas
        if (!validateDateRange(input.dateFrom, input.dateTo)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Data inicial deve ser anterior à data final',
          });
        }

        // Buscar dados do operador
        const operator = await ctx.db
          .select()
          .from(employees)
          .where(eq(employees.cpf, input.operatorCpf))
          .limit(1);

        if (!operator || operator.length === 0) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Operador não encontrado',
          });
        }

        const operatorData = operator[0];

        // Buscar risk score
        const riskData = await ctx.db
          .select()
          .from(operatorRiskScore)
          .where(eq(operatorRiskScore.idOperator, input.operatorCpf))
          .limit(1);

        // Construir condições para histórico de alertas
        const alertConditions = [eq(auditAlerts.idOperator, input.operatorCpf)];

        if (input.dateFrom) {
          alertConditions.push(gte(auditAlerts.createdAt, input.dateFrom));
        }
        if (input.dateTo) {
          alertConditions.push(lte(auditAlerts.createdAt, input.dateTo));
        }

        // Buscar histórico de alertas
        const alerts = await ctx.db
          .select()
          .from(auditAlerts)
          .where(and(...alertConditions))
          .orderBy(desc(auditAlerts.createdAt))
          .limit(100);

        // Contar alertas por status
        const alertsByStatus = alerts.reduce(
          (acc, alert) => {
            acc[alert.status as string] = (acc[alert.status as string] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        // Contar alertas por tipo
        const alertsByType = alerts.reduce(
          (acc, alert) => {
            acc[alert.alertType as string] = (acc[alert.alertType as string] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        return {
          operator: {
            cpf: operatorData.cpf,
            name: operatorData.name,
            hireDate: operatorData.hireDate,
            status: operatorData.status,
            createdAt: operatorData.createdAt,
            updatedAt: operatorData.updatedAt,
          },
          riskProfile: riskData[0]
            ? {
                riskScore: riskData[0].riskScore,
                riskLevel: riskData[0].riskLevel,
                ghostCancellations: riskData[0].ghostCancellations,
                pbmDeviations: riskData[0].pbmDeviations,
                noSaleEvents: riskData[0].noSaleEvents,
                cpfAbuseCount: riskData[0].cpfAbuseCount,
                cashDiscrepancies: riskData[0].cashDiscrepancies,
                calculatedAt: riskData[0].calculatedAt,
              }
            : null,
          alerts: {
            total: alerts.length,
            byStatus: alertsByStatus,
            byType: alertsByType,
            recent: alerts.slice(0, 10).map((a) => ({
              id: a.id,
              type: a.alertType,
              severity: a.severity,
              status: a.status,
              createdAt: a.createdAt,
            })),
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error in operators.getProfile:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar perfil do operador',
        });
      }
    }),

  /**
   * Listar todos os operadores com risk scores
   * Retorna lista paginada e ranqueada por risk score (descending)
   */
  listWithRiskScores: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
        sortBy: z.enum(['riskScore', 'name']).default('riskScore'),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const operators = await ctx.db
          .select({
            cpf: employees.cpf,
            name: employees.name,
            status: employees.status,
            riskScore: operatorRiskScore.riskScore,
            riskLevel: operatorRiskScore.riskLevel,
            calculatedAt: operatorRiskScore.calculatedAt,
          })
          .from(employees)
          .leftJoin(operatorRiskScore, eq(employees.cpf, operatorRiskScore.idOperator))
          .orderBy(input.sortBy === 'riskScore' ? desc(operatorRiskScore.riskScore) : asc(employees.name))
          .limit(input.limit)
          .offset(input.offset);

        // Contar total
        const [{ count }] = await ctx.db
          .select({ count: employees.cpf.countDistinct() })
          .from(employees);

        return {
          operators,
          total: count || 0,
          limit: input.limit,
          offset: input.offset,
        };
      } catch (error) {
        console.error('Error in operators.listWithRiskScores:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao listar operadores',
        });
      }
    }),

  /**
   * Buscar operador por nome ou CPF
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(100),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        // Se parece CPF (11 dígitos), buscar por CPF
        const isLikelyCpf = /^\d{11}$/.test(input.query);

        let results: any;

        if (isLikelyCpf) {
          results = await ctx.db
            .select()
            .from(employees)
            .where(eq(employees.cpf, input.query))
            .limit(10);
        } else {
          // Buscar por nome (usar LIKE)
          // NOTE: Drizzle pode precisar de ajuste para LIKE queries
          results = await ctx.db
            .select()
            .from(employees)
            .limit(10); // Placeholder - implementar busca por nome depois
        }

        return results.map((op) => ({
          cpf: op.cpf,
          name: op.name,
          status: op.status,
        }));
      } catch (error) {
        console.error('Error in operators.search:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao buscar operadores',
        });
      }
    }),
});

import { asc } from 'drizzle-orm';
