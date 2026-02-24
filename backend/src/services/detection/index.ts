/**
 * Detection Engine Orchestrator
 *
 * Executa todos os 6 módulos de detecção em paralelo
 * Consolida resultados e gera alertas finais
 */

import { Database } from '@/db';
import { detectGhostCancellations } from './ghostCancellation';
import { detectPbmDeviation } from './pbmDeviation';
import { detectNoSale } from './noSale';
import { detectCpfAbuse } from './cpfAbuse';
import { detectCashDiscrepancy } from './cashDiscrepancy';
import { calculateRiskScores } from './riskScoreCalculation';
import { DetectionResult } from './types';
import { getAuditService } from '@/services/audit';
import { v4 as uuidv4 } from 'uuid';

export interface DetectionEngineResult {
  success: boolean;
  totalDuration: number;
  timestamp: Date;
  results: DetectionResult[];
  totalAlertsGenerated: number;
  summary: {
    ghostCancellations: number;
    pbmDeviations: number;
    noSale: number;
    cpfAbuse: number;
    cashDiscrepancies: number;
    riskScoreUpdate: number;
  };
  errors?: string[];
}

/**
 * Executar todos os módulos de detecção em paralelo
 * Deve ser chamado durante job de enriquecimento (03:00 AM)
 */
export async function runDetectionEngine(db: Database, dateFrom?: Date): Promise<DetectionEngineResult> {
  const startTime = Date.now();
  const results: DetectionResult[] = [];
  const errors: string[] = [];

  console.log('🚀 Iniciando Detection Engine...');
  console.log(`   Período: ${dateFrom ? dateFrom.toISOString() : 'últimos 30 dias'}`);

  try {
    // Executar todos os detectores em paralelo
    const [ghostResult, pbmResult, noSaleResult, cpfResult, cashResult] = await Promise.all([
      detectGhostCancellations(db, dateFrom).catch((err) => {
        errors.push(`Ghost Cancellation: ${err.message}`);
        return {
          detectionType: 'GHOST_CANCELLATION',
          alertsGenerated: 0,
          processedRecords: 0,
          duration: 0,
          timestamp: new Date(),
          errors: [err.message],
        };
      }),
      detectPbmDeviation(db, dateFrom).catch((err) => {
        errors.push(`PBM Deviation: ${err.message}`);
        return {
          detectionType: 'PBM_DEVIATION',
          alertsGenerated: 0,
          processedRecords: 0,
          duration: 0,
          timestamp: new Date(),
          errors: [err.message],
        };
      }),
      detectNoSale(db, dateFrom).catch((err) => {
        errors.push(`No Sale: ${err.message}`);
        return {
          detectionType: 'NO_SALE',
          alertsGenerated: 0,
          processedRecords: 0,
          duration: 0,
          timestamp: new Date(),
          errors: [err.message],
        };
      }),
      detectCpfAbuse(db, dateFrom).catch((err) => {
        errors.push(`CPF Abuse: ${err.message}`);
        return {
          detectionType: 'CPF_ABUSE',
          alertsGenerated: 0,
          processedRecords: 0,
          duration: 0,
          timestamp: new Date(),
          errors: [err.message],
        };
      }),
      detectCashDiscrepancy(db, dateFrom).catch((err) => {
        errors.push(`Cash Discrepancy: ${err.message}`);
        return {
          detectionType: 'CASH_DISCREPANCY',
          alertsGenerated: 0,
          processedRecords: 0,
          duration: 0,
          timestamp: new Date(),
          errors: [err.message],
        };
      }),
    ]);

    results.push(ghostResult, pbmResult, noSaleResult, cpfResult, cashResult);

    // Calcular risk scores após detecções
    console.log('📊 Calculando Risk Scores...');
    const riskScoreResult = await calculateRiskScores(db, dateFrom).catch((err) => {
      errors.push(`Risk Score Calculation: ${err.message}`);
      return {
        detectionType: 'RISK_SCORE_CALCULATION',
        alertsGenerated: 0,
        processedRecords: 0,
        duration: 0,
        timestamp: new Date(),
        errors: [err.message],
      };
    });

    results.push(riskScoreResult);

    // Consolidar resultados
    const totalAlertsGenerated = results.reduce((sum, r) => sum + r.alertsGenerated, 0);
    const totalDuration = Date.now() - startTime;

    const summary = {
      ghostCancellations: ghostResult.alertsGenerated,
      pbmDeviations: pbmResult.alertsGenerated,
      noSale: noSaleResult.alertsGenerated,
      cpfAbuse: cpfResult.alertsGenerated,
      cashDiscrepancies: cashResult.alertsGenerated,
      riskScoreUpdate: riskScoreResult.processedRecords,
    };

    console.log('');
    console.log('✅ Detection Engine Completo!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📊 Resumo de Detecções:`);
    console.log(`   Ghost Cancellations:   ${summary.ghostCancellations} fraudes`);
    console.log(`   PBM Deviations:        ${summary.pbmDeviations} fraudes`);
    console.log(`   No Sale (Gaveta):      ${summary.noSale} fraudes`);
    console.log(`   CPF Abuse:             ${summary.cpfAbuse} fraudes`);
    console.log(`   Cash Discrepancies:    ${summary.cashDiscrepancies} fraudes`);
    console.log(`   ────────────────────────────────`);
    console.log(`   TOTAL:                 ${totalAlertsGenerated} fraudes detectadas`);
    console.log(`   Operadores atualizados: ${summary.riskScoreUpdate}`);
    console.log(`   Tempo total:           ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const detectionResult = {
      success: true,
      totalDuration,
      timestamp: new Date(),
      results,
      totalAlertsGenerated,
      summary,
      errors: errors.length > 0 ? errors : undefined,
    };

    // Registrar em auditoria
    try {
      const auditService = getAuditService(db);
      const detectionId = `DET-${new Date().toISOString().split('T')[0]}-${uuidv4().slice(0, 8).toUpperCase()}`;

      await auditService.recordDetectionRun({
        detectionId,
        result: detectionResult,
        triggeredBy: 'system',
        isManual: false,
      });
    } catch (auditError) {
      console.error('⚠️  Erro ao registrar detecção em auditoria:', auditError);
    }

    return detectionResult;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Detection Engine error:', errorMsg);

    const detectionResult = {
      success: false,
      totalDuration: Date.now() - startTime,
      timestamp: new Date(),
      results,
      totalAlertsGenerated: results.reduce((sum, r) => sum + r.alertsGenerated, 0),
      summary: {
        ghostCancellations: 0,
        pbmDeviations: 0,
        noSale: 0,
        cpfAbuse: 0,
        cashDiscrepancies: 0,
        riskScoreUpdate: 0,
      },
      errors: [...errors, errorMsg],
    };

    // Registrar erro em auditoria
    try {
      const auditService = getAuditService(db);
      const detectionId = `DET-${new Date().toISOString().split('T')[0]}-${uuidv4().slice(0, 8).toUpperCase()}`;

      await auditService.recordDetectionRun({
        detectionId,
        result: detectionResult,
        triggeredBy: 'system',
        isManual: false,
      });
    } catch (auditError) {
      console.error('⚠️  Erro ao registrar detecção em auditoria:', auditError);
    }

    return detectionResult;
  }
}

// Tipos e constants já são importados acima e usados internally
