/**
 * PBM Deviation Detection
 *
 * Identifica autorizações PBM aprovadas sem cupom fiscal vinculado
 * no mesmo PDV em janela de 5 minutos
 *
 * Indica possível desvio de crédito (usar autorização mas embolsar dinheiro)
 *
 * Risk Score: +40 pontos por ocorrência
 */

import { Database } from '@/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { pbmAuth, sales, employees } from '@/db/schema';
import { FraudAlert, DetectionResult, RISK_SCORES, getSeverityFromScore } from './types';
import { v4 as uuidv4 } from 'uuid';

const TIME_WINDOW = 5 * 60; // 5 minutos em segundos
const LOOKBACK_DAYS = 30;

export async function detectPbmDeviation(db: Database, dateFrom?: Date): Promise<DetectionResult> {
  const startTime = Date.now();
  const alerts: FraudAlert[] = [];
  let processedRecords = 0;
  const errors: string[] = [];

  try {
    // Se não especificar data, buscar últimos 30 dias
    const fromDate = dateFrom || new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    // Buscar todas as autorizações PBM do período
    const pbmAuthorizations = await db.query.pbmAuth.findMany({
      where: and(
        gte(pbmAuth.authorizationTimestamp, fromDate),
        eq(pbmAuth.status, 'APPROVED') // Apenas aprovadas
      ),
    });

    // Buscar todas as vendas do período
    const salesData = await db.query.sales.findMany({
      where: gte(sales.timestampSale, fromDate),
    });

    // Mapear vendas por PDV e timestamp para busca rápida
    const salesByPdv = new Map<string | null, typeof salesData>();
    salesData.forEach((s) => {
      if (!salesByPdv.has(s.idPdv)) {
        salesByPdv.set(s.idPdv, []);
      }
      salesByPdv.get(s.idPdv)!.push(s);
    });

    // Processar cada autorização PBM
    for (const pbm of pbmAuthorizations) {
      processedRecords++;

      // Buscar vendas no mesmo PDV dentro da janela de tempo
      const pdvSales = salesByPdv.get(pbm.idPdv) || [];

      let linkedSaleFound = false;
      for (const sale of pdvSales) {
        const timeDiffSeconds = Math.abs(
          (sale.timestampSale.getTime() - pbm.authorizationTimestamp!.getTime()) / 1000
        );

        // Se houver venda próxima à autorização, está linkada
        if (timeDiffSeconds <= TIME_WINDOW) {
          linkedSaleFound = true;
          break;
        }
      }

      // Se não encontrou venda linkada, é desvio
      if (!linkedSaleFound) {
        // Buscar dados do operador
        const operator = pbm.idOperator
          ? await db.query.employees.findFirst({
              where: eq(employees.cpf, pbm.idOperator),
            })
          : null;

        const riskScore = RISK_SCORES.PBM_DEVIATION;

        const alert: FraudAlert = {
          id: `ALERT-${new Date().toISOString().split('T')[0]}-${uuidv4().slice(0, 8).toUpperCase()}`,
          alertType: 'PBM_DEVIATION',
          severity: getSeverityFromScore(riskScore),
          operatorCpf: pbm.idOperator || 'UNKNOWN',
          operatorName: operator?.name || null,
          pdv: pbm.idPdv,
          pharmacy: null,
          saleId: null,
          cancellationId: null,
          saleAmount: pbm.authorizationAmount ? parseFloat(pbm.authorizationAmount.toString()) : null,
          saleTimestamp: null,
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

    console.log(`✅ PBM Deviation: Processadas ${processedRecords} autorizações, ${alerts.length} fraudes detectadas`);

    return {
      detectionType: 'PBM_DEVIATION',
      alertsGenerated: alerts.length,
      processedRecords,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ PBM Deviation detection error:', errorMsg);
    errors.push(errorMsg);

    return {
      detectionType: 'PBM_DEVIATION',
      alertsGenerated: alerts.length,
      processedRecords,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      errors,
    };
  }
}

export { alerts };
