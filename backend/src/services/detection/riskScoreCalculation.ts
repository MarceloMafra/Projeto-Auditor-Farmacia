/**
 * Risk Score Calculation
 *
 * Calcula score agregado de risco por operador baseado em todas as detecções.
 * Atualiza tb_operator_risk_score com scores e níveis.
 *
 * Fórmula:
 * Risk Score = (Ghost × 30) + (PBM × 40) + (NoSale × 20) + (CPF × 50) + (CashDisc × 35)
 *
 * Níveis:
 * - LOW (0-50): Verde
 * - MEDIUM (51-150): Amarelo
 * - HIGH (151-300): Laranja
 * - CRITICAL (301+): Vermelho
 */

import { Database } from '@/db';
import { eq, and, gte } from 'drizzle-orm';
import { auditAlerts, operatorRiskScore, employees } from '@/db/schema';
import { RiskScoreDetails, RISK_SCORES, getRiskLevel, DetectionResult } from './types';

const LOOKBACK_DAYS = 30;

export async function calculateRiskScores(db: Database, dateFrom?: Date): Promise<DetectionResult> {
  const startTime = Date.now();
  const results: RiskScoreDetails[] = [];
  let processedOperators = 0;
  const errors: string[] = [];

  try {
    // Se não especificar data, buscar últimos 30 dias
    const fromDate = dateFrom || new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    // Buscar todos os funcionários
    const allEmployees = await db.query.employees.findMany();

    // Buscar todos os alertas do período
    const alerts = await db.query.auditAlerts.findMany({
      where: and(gte(auditAlerts.createdAt, fromDate)),
    });

    // Agrupar alertas por operador
    const alertsByOperator = new Map<string, typeof alerts>();
    for (const alert of alerts) {
      if (!alertsByOperator.has(alert.idOperator)) {
        alertsByOperator.set(alert.idOperator, []);
      }
      alertsByOperator.get(alert.idOperator)!.push(alert);
    }

    // Calcular score para cada operador
    for (const employee of allEmployees) {
      processedOperators++;

      const operatorAlerts = alertsByOperator.get(employee.cpf) || [];

      // Contar por tipo de alerta
      const ghostCount = operatorAlerts.filter((a) => a.alertType === 'GHOST_CANCELLATION').length;
      const pbmCount = operatorAlerts.filter((a) => a.alertType === 'PBM_DEVIATION').length;
      const noSaleCount = operatorAlerts.filter((a) => a.alertType === 'NO_SALE').length;
      const cpfCount = operatorAlerts.filter((a) => a.alertType === 'CPF_ABUSE').length;
      const cashCount = operatorAlerts.filter((a) => a.alertType === 'CASH_DISCREPANCY').length;

      // Calcular score total
      const totalScore =
        ghostCount * RISK_SCORES.GHOST_CANCELLATION +
        pbmCount * RISK_SCORES.PBM_DEVIATION +
        noSaleCount * RISK_SCORES.NO_SALE +
        cpfCount * RISK_SCORES.CPF_ABUSE +
        cashCount * RISK_SCORES.CASH_DISCREPANCY;

      const riskLevel = getRiskLevel(totalScore);

      // Atualizar ou inserir em tb_operator_risk_score
      try {
        // Verificar se já existe
        const existing = await db.query.operatorRiskScore.findFirst({
          where: eq(operatorRiskScore.idOperator, employee.cpf),
        });

        if (existing) {
          // Atualizar
          await db
            .update(operatorRiskScore)
            .set({
              riskScore: totalScore,
              riskLevel,
              ghostCancellations: ghostCount,
              pbmDeviations: pbmCount,
              noSaleEvents: noSaleCount,
              cpfAbuseCount: cpfCount,
              cashDiscrepancies: cashCount,
              calculatedAt: new Date(),
            })
            .where(eq(operatorRiskScore.idOperator, employee.cpf));
        } else {
          // Inserir novo
          await db.insert(operatorRiskScore).values({
            idOperator: employee.cpf,
            riskScore: totalScore,
            riskLevel,
            ghostCancellations: ghostCount,
            pbmDeviations: pbmCount,
            noSaleEvents: noSaleCount,
            cpfAbuseCount: cpfCount,
            cashDiscrepancies: cashCount,
            calculatedAt: new Date(),
          });
        }

        results.push({
          operatorCpf: employee.cpf,
          ghostCancellations: ghostCount,
          pbmDeviations: pbmCount,
          noSaleEvents: noSaleCount,
          cpfAbuseCount: cpfCount,
          cashDiscrepancies: cashCount,
          totalScore,
          riskLevel,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Erro ao atualizar score para ${employee.cpf}:`, errorMsg);
        errors.push(`${employee.cpf}: ${errorMsg}`);
      }
    }

    // Logar resumo
    const criticalOps = results.filter((r) => r.riskLevel === 'CRITICAL').length;
    const highOps = results.filter((r) => r.riskLevel === 'HIGH').length;

    console.log(`✅ Risk Score Calculation: ${processedOperators} operadores processados`);
    console.log(`   - ${criticalOps} CRÍTICOS`);
    console.log(`   - ${highOps} ALTO RISCO`);

    return {
      detectionType: 'RISK_SCORE_CALCULATION',
      alertsGenerated: results.filter((r) => r.riskLevel === 'CRITICAL' || r.riskLevel === 'HIGH').length,
      processedRecords: processedOperators,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Risk Score Calculation error:', errorMsg);
    errors.push(errorMsg);

    return {
      detectionType: 'RISK_SCORE_CALCULATION',
      alertsGenerated: 0,
      processedRecords,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      errors,
    };
  }
}
