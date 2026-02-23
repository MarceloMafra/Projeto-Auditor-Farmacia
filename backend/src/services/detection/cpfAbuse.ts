/**
 * CPF Abuse Detection
 *
 * Identifica quando o mesmo CPF (especialmente de funcionário)
 * é usado em múltiplas vendas de clientes diferentes para
 * acúmulo indevido de pontos de fidelidade
 *
 * Risk Score: +50 pontos por ocorrência (fraude mais séria)
 */

import { Database } from '@/db';
import { eq, and, gte, count } from 'drizzle-orm';
import { sales, employees } from '@/db/schema';
import { FraudAlert, DetectionResult, RISK_SCORES, getSeverityFromScore } from './types';
import { v4 as uuidv4 } from 'uuid';

const EMPLOYEE_CPF_THRESHOLD = 10; // >10 vendas com CPF de funcionário
const CUSTOMER_CPF_THRESHOLD = 20; // >20 vendas com CPF de cliente
const LOOKBACK_DAYS = 30;

export async function detectCpfAbuse(db: Database, dateFrom?: Date): Promise<DetectionResult> {
  const startTime = Date.now();
  const alerts: FraudAlert[] = [];
  let processedRecords = 0;
  const errors: string[] = [];

  try {
    // Se não especificar data, buscar últimos 30 dias
    const fromDate = dateFrom || new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    // Buscar todos os funcionários (para validação)
    const allEmployees = await db.query.employees.findMany();
    const employeeCpfs = new Set(allEmployees.map((e) => e.cpf));

    // Buscar todas as vendas com CPF do período
    const salesWithCpf = await db.query.sales.findMany({
      where: and(gte(sales.timestampSale, fromDate)),
    });

    // Agrupar vendas por CPF do cliente
    const salesByCpf = new Map<string, typeof salesWithCpf>();
    for (const sale of salesWithCpf) {
      if (sale.customerCpf) {
        processedRecords++;
        if (!salesByCpf.has(sale.customerCpf)) {
          salesByCpf.set(sale.customerCpf, []);
        }
        salesByCpf.get(sale.customerCpf)!.push(sale);
      }
    }

    // Analisar cada CPF
    for (const [customerCpf, cpfSales] of salesByCpf.entries()) {
      // Verificar se é CPF de funcionário
      const isEmployeeCpf = employeeCpfs.has(customerCpf);

      // Determinar threshold
      const threshold = isEmployeeCpf ? EMPLOYEE_CPF_THRESHOLD : CUSTOMER_CPF_THRESHOLD;

      // Agrupar por operador para detectar abuso
      const salesByOperator = new Map<string, typeof cpfSales>();
      for (const sale of cpfSales) {
        if (!salesByOperator.has(sale.idOperator)) {
          salesByOperator.set(sale.idOperator, []);
        }
        salesByOperator.get(sale.idOperator)!.push(sale);
      }

      // Verificar cada operador
      for (const [operatorCpf, operatorSales] of salesByOperator.entries()) {
        // Contar vendas em dias distintos
        const distinctDays = new Set(operatorSales.map((s) => s.timestampSale.toDateString())).size;

        // Se passou do threshold
        if (operatorSales.length > threshold) {
          // Buscar dados do operador
          const operator = await db.query.employees.findFirst({
            where: eq(employees.cpf, operatorCpf),
          });

          const riskScore = RISK_SCORES.CPF_ABUSE;
          const severity = isEmployeeCpf ? 'CRITICAL' : getSeverityFromScore(riskScore);

          const alert: FraudAlert = {
            id: `ALERT-${new Date().toISOString().split('T')[0]}-${uuidv4().slice(0, 8).toUpperCase()}`,
            alertType: 'CPF_ABUSE',
            severity: severity as any,
            operatorCpf,
            operatorName: operator?.name || null,
            pdv: operatorSales[0].idPdv,
            pharmacy: null,
            saleId: operatorSales[0].id,
            cancellationId: null,
            saleAmount: operatorSales.reduce((sum, s) => sum + parseFloat(s.totalAmount.toString()), 0),
            saleTimestamp: operatorSales[0].timestampSale,
            cancellationTimestamp: null,
            delaySeconds: null,
            riskScore,
            evidence: {
              cameraAvailable: true,
              relatedAlerts: operatorSales.length,
            },
          };

          alerts.push(alert);
        }
      }
    }

    console.log(`✅ CPF Abuse: Processadas ${processedRecords} vendas, ${alerts.length} fraudes detectadas`);

    return {
      detectionType: 'CPF_ABUSE',
      alertsGenerated: alerts.length,
      processedRecords,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ CPF Abuse detection error:', errorMsg);
    errors.push(errorMsg);

    return {
      detectionType: 'CPF_ABUSE',
      alertsGenerated: alerts.length,
      processedRecords,
      duration: Date.now() - startTime,
      timestamp: new Date(),
      errors,
    };
  }
}

export { alerts };
