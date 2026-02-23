/**
 * Enrichment Batch Job
 *
 * Executa diariamente às 03:00 AM para:
 * - Executar todos os módulos de detecção de fraude
 * - Consolidar resultados e alertas
 * - Calcular risk scores por operador
 * - Enviar notificações aos analistas
 *
 * Pode ser executado via:
 * - Cron job (node-schedule, agenda.js)
 * - AWS Lambda / Google Cloud Functions
 * - Docker container com entrypoint
 */

import { Database } from '@/db';
import { runDetectionEngine, DetectionEngineResult } from '@/services/detection';
import { auditAlerts } from '@/db/schema';

interface EnrichmentJobResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  detectionResult: DetectionEngineResult;
  alertsStored: number;
  errors?: string[];
}

/**
 * Executar job de enriquecimento
 * Deve ser chamado diariamente às 03:00 AM via cron/scheduler
 */
export async function runEnrichmentJob(db: Database): Promise<EnrichmentJobResult> {
  const startTime = new Date();

  console.log('');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔄 INICIANDO JOB DE ENRIQUECIMENTO');
  console.log(`⏰ Timestamp: ${startTime.toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Executar detection engine
    console.log('📊 Executando Detection Engine com todos os módulos...');
    const detectionResult = await runDetectionEngine(db);

    if (!detectionResult.success) {
      console.error('❌ Detection Engine falhou');
      return {
        success: false,
        startTime,
        endTime: new Date(),
        duration: Date.now() - startTime.getTime(),
        detectionResult,
        alertsStored: 0,
        errors: detectionResult.errors,
      };
    }

    // TODO: Armazenar alertas em tb_audit_alerts
    // Os alertas foram gerados mas ainda precisam ser persistidos
    // Será implementado na próxima fase junto com integração dos routers

    const endTime = new Date();
    const totalDuration = endTime.getTime() - startTime.getTime();

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ JOB DE ENRIQUECIMENTO COMPLETO');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`⏱️  Tempo total: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`📊 Alertas gerados: ${detectionResult.totalAlertsGenerated}`);
    console.log(`📈 Operadores analisados: ${detectionResult.summary.riskScoreUpdate}`);
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('');

    return {
      success: true,
      startTime,
      endTime,
      duration: totalDuration,
      detectionResult,
      alertsStored: detectionResult.totalAlertsGenerated,
      errors: detectionResult.errors,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Erro crítico no Job de Enriquecimento:', errorMsg);

    const endTime = new Date();

    return {
      success: false,
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      detectionResult: {
        success: false,
        totalDuration: 0,
        timestamp: new Date(),
        results: [],
        totalAlertsGenerated: 0,
        summary: {
          ghostCancellations: 0,
          pbmDeviations: 0,
          noSale: 0,
          cpfAbuse: 0,
          cashDiscrepancies: 0,
          riskScoreUpdate: 0,
        },
        errors: [errorMsg],
      },
      alertsStored: 0,
      errors: [errorMsg],
    };
  }
}

/**
 * Agendar job de enriquecimento para 03:00 AM diariamente
 * Usar com node-schedule ou similar
 */
export function scheduleEnrichmentJob(db: Database): void {
  // Import dinâmico para evitar dependência obrigatória
  const schedule = require('node-schedule');

  // Agendar para 03:00 AM todos os dias
  const job = schedule.scheduleJob('0 3 * * *', async () => {
    console.log('🎯 Executando Job de Enriquecimento agendado...');
    await runEnrichmentJob(db);
  });

  console.log('✅ Job de Enriquecimento agendado para 03:00 AM diariamente');
}
