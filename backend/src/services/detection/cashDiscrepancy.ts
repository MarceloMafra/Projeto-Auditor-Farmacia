/**
 * Cash Discrepancy Detection
 *
 * Monitora discrepâncias entre valor esperado e valor real no caixa.
 * Discrepâncias significativas indicam possível roubo ou fraude.
 *
 * Risk Score: +35 pontos por ocorrência
 */

import { Database } from '@/db';
import { gte, and } from 'drizzle-orm';
import { cashDiscrepancies } from '@/db/schema';
import { FraudAlert, DetectionResult, RISK_SCORES, getSeverityFromScore } from './types';
import { v4 as uuidv4 } from 'uuid';

const LOOKBACK_DAYS = 30;
const DISCREPANCY_THRESHOLD = 10; // R$ mínimo para considerar fraude

export async function detectCashDiscrepancy(db: Database, dateFrom?: Date): Promise<DetectionResult> {
  const startTime = Date.now();
  const alerts: FraudAlert[] = [];
  let processedRecords = 0;
  const errors: string[] = [];

  try {
    // Se não especificar data, buscar últimos 30 dias
    const fromDate = dateFrom || new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    // Buscar todas as discrepâncias do período
    const discrepancies = await db.query.cashDiscrepancies.findMany({
      where: and(gte(cashDiscrepancies.discrepancyDate, fromDate)),
    });

    // Processar cada discrepância
    for (const disc of discrepancies) {
      processedRecords++;

      const discrepancyAmount = Math.abs(disc.discrepancy ? parseFloat(disc.discrepancy.toString()) : 0);

      // Se discrepância acima do threshold
      if (discrepancyAmount >= DISCREPANCY_THRESHOLD) {
        const riskScore = RISK_SCORES.CASH_DISCREPANCY;

        // Classificar severidade por valor da discrepância
        let severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        if (discrepancyAmount < 50) {
          severity = 'LOW';
        } else if (discrepancyAmount < 200) {
          severity = 'MEDIUM';
        } else if (discrepancyAmount < 500) {
          severity = 'HIGH';
        } else {
          severity = 'CRITICAL';
        }

        const alert: FraudAlert = {
          id: `ALERT-${new Date().toISOString().split('T')[0]}-${uuidv4().slice(0, 8).toUpperCase()}`,
          alertType: 'CASH_DISCREPANCY',
          severity,
          operatorCpf: 'MULTIPLE', // Múltiplos operadores podem trabalhar no turno
          operatorName: `PDV ${disc.idPdv}`,
          pdv: disc.idPdv,
          pharmacy: null,
          saleId: null,
          cancellationId: null,
          saleAmount: discrepancyAmount,
          saleTimestamp: disc.discrepancyDate,
          cancellationTimestamp: null,
          delaySeconds: null,
          riskScore,
          evidence: {
            cameraAvailable: true,
            relatedAlerts: 0,
          },
        };

        alerts.push(alert);
      }
    }

    console.log(`✅ Cash Discrepancy: Processadas ${processedRecords} discrepâncias, ${alerts.length} fraudes detectadas`);

    return {
      detectionType: 'CASH_DISCREPANCY',
      alertsGenerated: alerts.length,
      processedRecords,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Cash Discrepancy detection error:', errorMsg);
    errors.push(errorMsg);

    return {
      detectionType: 'CASH_DISCREPANCY',
      alertsGenerated: alerts.length,
      processedRecords,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      errors,
    };
  }
}

export { alerts };
