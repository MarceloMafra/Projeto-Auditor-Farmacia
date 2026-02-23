/**
 * Ghost Cancellation Detection
 *
 * Detecta cancelamentos realizados >60 segundos após conclusão da venda,
 * indicando que o cliente já saiu da loja (fraude de devolver dinheiro)
 *
 * Risk Score: +30 pontos por ocorrência
 */

import { Database } from '@/db';
import { eq, gte, and, lte } from 'drizzle-orm';
import { sales, cancellations, employees } from '@/db/schema';
import { FraudAlert, DetectionResult, RISK_SCORES, getSeverityFromScore } from './types';
import { v4 as uuidv4 } from 'uuid';

const DELAY_THRESHOLD = 60; // segundos
const LOOKBACK_DAYS = 30;

export async function detectGhostCancellations(db: Database, dateFrom?: Date): Promise<DetectionResult> {
  const startTime = Date.now();
  const alerts: FraudAlert[] = [];
  let processedRecords = 0;
  const errors: string[] = [];

  try {
    // Se não especificar data, buscar últimos 30 dias
    const fromDate = dateFrom || new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    // Query otimizada: buscar vendas e seus cancelamentos
    const ghostCancellationsRaw = await db.query.sales.findMany({
      where: and(gte(sales.timestampSale, fromDate)),
      with: {
        // Não há relacionamento direto, fazer manual com JOIN
      },
    });

    // Buscar cancelamentos do período
    const cancelationsData = await db.query.cancellations.findMany({
      where: and(gte(cancellations.timestampCancellation, fromDate)),
    });

    // Mapear cancelamentos por saleId para acesso rápido
    const cancelationMap = new Map<string, typeof cancelationsData[0][]>();
    cancelationsData.forEach((c) => {
      if (!cancelationMap.has(c.idSale)) {
        cancelationMap.set(c.idSale, []);
      }
      cancelationMap.get(c.idSale)!.push(c);
    });

    // Processar cada venda
    for (const sale of ghostCancellationsRaw) {
      processedRecords++;

      const salesCancellations = cancelationMap.get(sale.id) || [];

      for (const cancellation of salesCancellations) {
        // Calcular delay em segundos
        const delaySeconds = Math.floor(
          (cancellation.timestampCancellation!.getTime() - sale.timestampSale.getTime()) / 1000
        );

        // Verificar se é ghost cancellation
        if (delaySeconds > DELAY_THRESHOLD) {
          // Buscar dados do operador para melhor contexto
          const operator = await db.query.employees.findFirst({
            where: eq(employees.cpf, sale.idOperator),
          });

          const riskScore = RISK_SCORES.GHOST_CANCELLATION;

          const alert: FraudAlert = {
            id: `ALERT-${new Date().toISOString().split('T')[0]}-${uuidv4().slice(0, 8).toUpperCase()}`,
            alertType: 'GHOST_CANCELLATION',
            severity: getSeverityFromScore(riskScore),
            operatorCpf: sale.idOperator,
            operatorName: operator?.name || null,
            pdv: sale.idPdv,
            pharmacy: null, // Será preenchido pelo job de enriquecimento
            saleId: sale.id,
            cancellationId: cancellation.id,
            saleAmount: parseFloat(sale.totalAmount.toString()),
            saleTimestamp: sale.timestampSale,
            cancellationTimestamp: cancellation.timestampCancellation,
            delaySeconds,
            riskScore,
            evidence: {
              cameraAvailable: true, // Assumir que há câmeras
              relatedAlerts: 0, // Será preenchido depois
            },
          };

          alerts.push(alert);
        }
      }
    }

    console.log(`✅ Ghost Cancellation: Processadas ${processedRecords} vendas, ${alerts.length} fraudes detectadas`);

    return {
      detectionType: 'GHOST_CANCELLATION',
      alertsGenerated: alerts.length,
      processedRecords,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Ghost Cancellation detection error:', errorMsg);
    errors.push(errorMsg);

    return {
      detectionType: 'GHOST_CANCELLATION',
      alertsGenerated: alerts.length,
      processedRecords,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      errors,
    };
  }
}

export { alerts };
