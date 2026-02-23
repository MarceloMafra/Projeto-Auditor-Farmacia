/**
 * No Sale / Gaveta Cega Detection
 *
 * Monitora aberturas de gaveta sem transação vinculada.
 * Operadores com >3 eventos por turno são ranqueados como alto risco.
 *
 * Indica possível "gaveta cega" (abrir gaveta fora de transação
 * para colocar dinheiro do cliente sem registrar venda)
 *
 * Risk Score: +20 pontos por evento (máx 60/turno)
 */

import { Database } from '@/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import { posEvents, employees } from '@/db/schema';
import { FraudAlert, DetectionResult, RISK_SCORES, getSeverityFromScore } from './types';
import { v4 as uuidv4 } from 'uuid';

const NO_SALE_EVENT_TYPE = 'DRAWER_OPEN_NO_SALE';
const RISK_THRESHOLD = 3; // eventos por turno
const LOOKBACK_DAYS = 30;

// Definir turnos (em horas)
const SHIFTS = [
  { name: 'Manhã', startHour: 6, endHour: 12 },
  { name: 'Tarde', startHour: 12, endHour: 18 },
  { name: 'Noite', startHour: 18, endHour: 6 },
];

export async function detectNoSale(db: Database, dateFrom?: Date): Promise<DetectionResult> {
  const startTime = Date.now();
  const alerts: FraudAlert[] = [];
  let processedRecords = 0;
  const errors: string[] = [];

  try {
    // Se não especificar data, buscar últimos 30 dias
    const fromDate = dateFrom || new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    // Buscar todos os eventos de abertura de gaveta sem venda
    const noSaleEvents = await db.query.posEvents.findMany({
      where: and(
        gte(posEvents.eventTimestamp, fromDate),
        eq(posEvents.eventType, NO_SALE_EVENT_TYPE)
      ),
    });

    // Agrupar por operador, data e turno
    const eventsByOperatorShift = new Map<string, number>();

    for (const event of noSaleEvents) {
      processedRecords++;

      // Determinar turno
      const eventHour = event.eventTimestamp.getHours();
      const shift = SHIFTS.find((s) => {
        if (s.name === 'Noite') {
          return eventHour >= s.startHour || eventHour < s.endHour;
        }
        return eventHour >= s.startHour && eventHour < s.endHour;
      });

      const key = `${event.idOperator}-${event.eventTimestamp.toDateString()}-${shift?.name || 'UNKNOWN'}`;
      eventsByOperatorShift.set(key, (eventsByOperatorShift.get(key) || 0) + 1);
    }

    // Processar eventos agrupados
    for (const [key, count] of eventsByOperatorShift.entries()) {
      if (count > RISK_THRESHOLD) {
        const [operatorCpf, dateStr, shiftName] = key.split('-');

        // Buscar dados do operador
        const operator = await db.query.employees.findFirst({
          where: eq(employees.cpf, operatorCpf),
        });

        // Calcular risk score: 20 por evento até 3, depois +40 por evento adicional
        let riskScore = 0;
        if (count > 3) {
          riskScore = RISK_SCORES.NO_SALE * 3 + RISK_SCORES.NO_SALE * (count - 3);
        } else {
          riskScore = RISK_SCORES.NO_SALE * count;
        }

        // Limitar a 60 por turno
        riskScore = Math.min(riskScore, 60);

        const severity = getSeverityFromScore(riskScore);

        const alert: FraudAlert = {
          id: `ALERT-${new Date().toISOString().split('T')[0]}-${uuidv4().slice(0, 8).toUpperCase()}`,
          alertType: 'NO_SALE',
          severity,
          operatorCpf,
          operatorName: operator?.name || null,
          pdv: null,
          pharmacy: null,
          saleId: null,
          cancellationId: null,
          saleAmount: null,
          saleTimestamp: null,
          cancellationTimestamp: null,
          delaySeconds: null,
          riskScore,
          evidence: {
            cameraAvailable: true,
            relatedAlerts: count, // Quantidade de eventos
          },
        };

        alerts.push(alert);
      }
    }

    console.log(`✅ No Sale: Processados ${processedRecords} eventos, ${alerts.length} fraudes detectadas`);

    return {
      detectionType: 'NO_SALE',
      alertsGenerated: alerts.length,
      processedRecords,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ No Sale detection error:', errorMsg);
    errors.push(errorMsg);

    return {
      detectionType: 'NO_SALE',
      alertsGenerated: alerts.length,
      processedRecords,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      errors,
    };
  }
}

export { alerts };
