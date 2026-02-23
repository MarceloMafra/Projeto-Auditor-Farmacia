/**
 * ERP Sync Batch Job
 *
 * Executa sincronização com ERP em intervalos regulares (por padrão a cada hora)
 * Pode ser configurado para diferentes frequências e múltiplos ERPs
 */

import { Database } from '@/db';
import { ErpSyncService, ErpConfig } from '@/services/erp';

export interface ErpSyncJobConfig {
  enabled: boolean;
  interval: number; // em minutos
  configs: ErpConfig[];
  fullSyncInterval?: number; // Full sync a cada N horas (padrão: 24)
}

interface SyncJobResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  syncs: Array<{
    databaseType: string;
    success: boolean;
    recordsInserted: number;
    recordsSkipped: number;
    duration: number;
    errorCount: number;
  }>;
  errors: string[];
}

let lastSyncResult: SyncJobResult | null = null;
let isSyncing = false;
let syncCount = 0;

/**
 * Executar sincronização ERP
 */
export async function runErpSyncJob(
  db: Database,
  config: ErpSyncJobConfig
): Promise<SyncJobResult> {
  if (!config.enabled) {
    console.log('⏭️  ERP Sync Job desativado');
    return {
      success: true,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      syncs: [],
      errors: [],
    };
  }

  if (isSyncing) {
    console.warn('⚠️  Sincronização ERP já em andamento, pulando execução');
    return lastSyncResult || {
      success: false,
      startTime: new Date(),
      endTime: new Date(),
      duration: 0,
      syncs: [],
      errors: ['Sincronização já em andamento'],
    };
  }

  isSyncing = true;
  syncCount++;

  const startTime = new Date();
  const errors: string[] = [];
  const syncs: Array<{
    databaseType: string;
    success: boolean;
    recordsInserted: number;
    recordsSkipped: number;
    duration: number;
    errorCount: number;
  }> = [];

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`🔄 ERP SYNC JOB #${syncCount}`);
  console.log(`⏰ Timestamp: ${startTime.toISOString()}`);
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  try {
    // Determinar se deve fazer full sync
    const fullSyncInterval = config.fullSyncInterval || 24; // horas
    const isFullSync = syncCount % (fullSyncInterval * 60) === 0; // A cada 24 horas = 24*60 minutos

    for (const erpConfig of config.configs) {
      try {
        console.log(`\n📡 Sincronizando ${erpConfig.type} ERP...`);

        const syncService = new ErpSyncService(db, erpConfig);

        const result = await syncService.sync({
          fullSync: isFullSync,
          daysBack: isFullSync ? undefined : 1, // Sync incremental: últimas 24h
          batchSize: 1000,
          maxRecords: 100000,
          deduplicationEnabled: true,
          deduplicationWindowMinutes: 5,
        });

        syncs.push({
          databaseType: result.databaseType,
          success: result.success,
          recordsInserted: result.recordsInserted,
          recordsSkipped: result.recordsSkipped,
          duration: result.duration,
          errorCount: result.errors.length,
        });

        if (!result.success) {
          errors.push(`${erpConfig.type}: ${result.errors.map((e) => e.error).join(', ')}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`❌ Erro ao sincronizar ${erpConfig.type}:`, errorMsg);
        errors.push(`${erpConfig.type}: ${errorMsg}`);

        syncs.push({
          databaseType: erpConfig.type,
          success: false,
          recordsInserted: 0,
          recordsSkipped: 0,
          duration: 0,
          errorCount: 1,
        });
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    const totalRecordsInserted = syncs.reduce((sum, s) => sum + s.recordsInserted, 0);
    const totalRecordsSkipped = syncs.reduce((sum, s) => sum + s.recordsSkipped, 0);
    const totalErrors = errors.length;

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ ERP SYNC JOB CONCLUÍDO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Tempo total: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📥 Registros inseridos: ${totalRecordsInserted.toLocaleString('pt-BR')}`);
    console.log(`⏭️  Registros duplicados: ${totalRecordsSkipped.toLocaleString('pt-BR')}`);
    console.log(`❌ Erros: ${totalErrors}`);
    console.log(`📊 Próxima sincronização: ${new Date(Date.now() + config.interval * 60000).toISOString()}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    lastSyncResult = {
      success: errors.length === 0,
      startTime,
      endTime,
      duration,
      syncs,
      errors,
    };

    return lastSyncResult;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro crítico no ERP Sync Job:', errorMsg);

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();

    lastSyncResult = {
      success: false,
      startTime,
      endTime,
      duration,
      syncs,
      errors: [errorMsg],
    };

    return lastSyncResult;
  } finally {
    isSyncing = false;
  }
}

/**
 * Agendar ERP Sync Job para execução periódica
 */
export function scheduleErpSyncJob(db: Database, config: ErpSyncJobConfig): void {
  if (!config.enabled) {
    console.log('⏭️  ERP Sync Job desativado na configuração');
    return;
  }

  try {
    const schedule = require('node-schedule');

    // Calcular intervalo em minutos para cron expression
    const intervalMinutes = config.interval;

    // Se for múltiplo de 60 (horas), usar cron simples
    if (intervalMinutes % 60 === 0) {
      const hours = intervalMinutes / 60;
      const cron = `0 */${hours} * * *`; // A cada N horas

      const job = schedule.scheduleJob(cron, async () => {
        console.log('🎯 Executando ERP Sync Job agendado...');
        await runErpSyncJob(db, config);
      });

      console.log(`✅ ERP Sync Job agendado a cada ${hours} hora(s) (${cron})`);
    } else {
      // Para intervalos não-hourly, usar setInterval
      setInterval(async () => {
        console.log('🎯 Executando ERP Sync Job agendado...');
        await runErpSyncJob(db, config);
      }, intervalMinutes * 60 * 1000);

      console.log(`✅ ERP Sync Job agendado a cada ${intervalMinutes} minuto(s)`);
    }
  } catch (error) {
    console.error('❌ Erro ao agendar ERP Sync Job:', error);
  }
}

/**
 * Obter resultado do último sync
 */
export function getLastSyncResult(): SyncJobResult | null {
  return lastSyncResult;
}

/**
 * Verificar se está sincronizando
 */
export function isSyncing(): boolean {
  return isSyncing;
}

/**
 * Obter contador de sincronizações
 */
export function getSyncCount(): number {
  return syncCount;
}
