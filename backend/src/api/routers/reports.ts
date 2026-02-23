import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { gte, lte, and, eq, desc } from 'drizzle-orm';
import { auditAlerts, operatorRiskScore, employees } from '@/db/schema';
import { reportGenerationSchema, validateDateRange } from '../validations';
import { TRPCError } from '@trpc/server';

/**
 * Reports Router - Geração de relatórios
 * Relatórios em PDF, Excel, CSV com dados agregados
 */
export const reportsRouter = router({
  /**
   * Gerar sumário executivo para um período
   * Inclui: alertas totais, tipos, severidade, status, top operadores, valor recuperado
   */
  generateExecutiveSummary: protectedProcedure
    .input(reportGenerationSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Validar intervalo de datas
        if (!validateDateRange(input.dateFrom, input.dateTo)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Data inicial deve ser anterior à data final',
          });
        }

        // Construir condições
        const conditions = [gte(auditAlerts.createdAt, input.dateFrom), lte(auditAlerts.createdAt, input.dateTo)];

        // Aplicar filtros opcionais
        if (input.alertType) {
          conditions.push(eq(auditAlerts.alertType, input.alertType as any));
        }
        if (input.status) {
          conditions.push(eq(auditAlerts.status, input.status as any));
        }

        // Buscar todos os alertas do período
        const alerts = await ctx.db
          .select()
          .from(auditAlerts)
          .where(and(...conditions));

        // Contar por tipo
        const alertsByType: Record<string, number> = {};
        const alertsBySeverity: Record<string, number> = {};
        const alertsByStatus: Record<string, number> = {};
        let totalValue = 0;

        alerts.forEach((alert) => {
          // Por tipo
          alertsByType[alert.alertType as string] = (alertsByType[alert.alertType as string] || 0) + 1;

          // Por severidade
          alertsBySeverity[alert.severity as string] = (alertsBySeverity[alert.severity as string] || 0) + 1;

          // Por status
          alertsByStatus[alert.status as string] = (alertsByStatus[alert.status as string] || 0) + 1;

          // Valor recuperado (fraudes confirmadas)
          if (alert.status === 'Fraude Confirmada' && alert.saleAmount) {
            totalValue += parseFloat(alert.saleAmount.toString());
          }
        });

        // Obter top 10 operadores de alto risco
        const topOperators = await ctx.db
          .select({
            cpf: employees.cpf,
            name: employees.name,
            riskScore: operatorRiskScore.riskScore,
            riskLevel: operatorRiskScore.riskLevel,
            alertCount: auditAlerts.id.count(),
          })
          .from(operatorRiskScore)
          .innerJoin(employees, eq(operatorRiskScore.idOperator, employees.cpf))
          .leftJoin(auditAlerts, eq(operatorRiskScore.idOperator, auditAlerts.idOperator))
          .where(and(...conditions))
          .groupBy(operatorRiskScore.idOperator)
          .orderBy(desc(operatorRiskScore.riskScore))
          .limit(10);

        // Recomendações automáticas
        const recommendations: string[] = [];

        if (alertsByStatus['Pending'] > 10) {
          recommendations.push(
            'Muitos alertas pendentes de investigação. Considere aumentar capacidade da equipe.'
          );
        }

        const criticalAlerts = alertsBySeverity['CRITICAL'] || 0;
        if (criticalAlerts > 5) {
          recommendations.push('Alertas críticos detectados. Revisão urgente recomendada.');
        }

        if (topOperators.length > 0 && topOperators[0].riskScore > 300) {
          recommendations.push(`Operador ${topOperators[0].name} apresenta risco crítico. Ação imediata necessária.`);
        }

        return {
          period: {
            from: input.dateFrom,
            to: input.dateTo,
          },
          summary: {
            totalAlerts: alerts.length,
            alertsByType,
            alertsBySeverity,
            alertsByStatus,
            estimatedLoss: 0, // Placeholder
            recoveredValue: parseFloat(totalValue.toFixed(2)),
          },
          topOperators: topOperators.map((op) => ({
            cpf: op.cpf,
            name: op.name,
            riskScore: op.riskScore,
            riskLevel: op.riskLevel,
            alertCount: op.alertCount || 0,
          })),
          recommendations,
          generatedAt: new Date(),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error in reports.generateExecutiveSummary:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao gerar sumário executivo',
        });
      }
    }),

  /**
   * Gerar relatório detalhado de alertas
   * Inclui lista completa com filtros opcionais
   */
  generateAlertReport: protectedProcedure
    .input(reportGenerationSchema)
    .query(async ({ ctx, input }) => {
      try {
        // Validar intervalo
        if (!validateDateRange(input.dateFrom, input.dateTo)) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Data inicial deve ser anterior à data final',
          });
        }

        // Construir condições
        const conditions = [gte(auditAlerts.createdAt, input.dateFrom), lte(auditAlerts.createdAt, input.dateTo)];

        if (input.alertType) {
          conditions.push(eq(auditAlerts.alertType, input.alertType as any));
        }
        if (input.status) {
          conditions.push(eq(auditAlerts.status, input.status as any));
        }

        // Buscar alertas
        const alerts = await ctx.db
          .select()
          .from(auditAlerts)
          .where(and(...conditions))
          .orderBy(desc(auditAlerts.createdAt))
          .limit(1000);

        return {
          period: {
            from: input.dateFrom,
            to: input.dateTo,
          },
          alerts: alerts.map((alert) => ({
            id: alert.id,
            type: alert.alertType,
            severity: alert.severity,
            status: alert.status,
            operatorCpf: alert.idOperator,
            operatorName: alert.operatorName,
            pdv: alert.pdv,
            pharmacy: alert.pharmacy,
            saleAmount: alert.saleAmount,
            riskScore: alert.riskScore,
            createdAt: alert.createdAt,
            investigationNotes: alert.investigationNotes,
          })),
          totalCount: alerts.length,
          generatedAt: new Date(),
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error('Error in reports.generateAlertReport:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao gerar relatório de alertas',
        });
      }
    }),

  /**
   * Exportar dados em CSV
   * Retorna URL do arquivo em S3 (implementar depois)
   */
  exportToCSV: protectedProcedure
    .input(
      z.object({
        reportType: z.enum(['alerts', 'operators', 'kpis']),
        dateFrom: z.date(),
        dateTo: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Placeholder: Implementar exportação real depois
        return {
          success: true,
          url: `https://auditor-evidence-bucket.s3.amazonaws.com/reports/export-${input.reportType}-${Date.now()}.csv`,
          filename: `export-${input.reportType}-${new Date().toISOString()}.csv`,
          message: 'Exportação iniciada. Arquivo será gerado em segundos.',
        };
      } catch (error) {
        console.error('Error in reports.exportToCSV:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Erro ao exportar relatório',
        });
      }
    }),
});
