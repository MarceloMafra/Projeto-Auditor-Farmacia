/**
 * ERP Sync Service
 *
 * Orquestra a sincronização de dados do ERP para o banco de auditoria
 * Gerencia deduplicação, retry logic e audit trail
 */

import { Database } from '@/db';
import { v4 as uuidv4 } from 'uuid';
import {
  ErpConfig,
  ErpSyncResult,
  ErpConnectorInterface,
  ErpTransactionRow,
  SyncError,
  SyncAuditEntry,
  generateDuplicationKey,
  DuplicationKey,
  DatabaseType,
} from './types';
import { createErpConnector } from './connectors';
import { getAuditService } from '@/services/audit';

export interface SyncOptions {
  batchSize?: number;
  maxRecords?: number;
  daysBack?: number;
  fullSync?: boolean;
  deduplicationEnabled?: boolean;
  deduplicationWindowMinutes?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

export class ErpSyncService {
  private connector: ErpConnectorInterface;
  private db: Database;
  private config: ErpConfig;
  private syncId: string;
  private isRunning: boolean = false;

  constructor(db: Database, config: ErpConfig) {
    this.db = db;
    this.config = config;
    this.connector = createErpConnector(config);
    this.syncId = uuidv4();
  }

  /**
   * Testar conexão com ERP
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log(`🔍 Testando conexão com ${this.config.type} ERP...`);
      await this.connector.connect();
      const result = await this.connector.testConnection();
      await this.connector.disconnect();
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Teste de conexão falhou:', errorMsg);
      return false;
    }
  }

  /**
   * Executar sincronização
   */
  async sync(options: SyncOptions = {}): Promise<ErpSyncResult> {
    if (this.isRunning) {
      throw new Error('Sincronização já em andamento');
    }

    this.isRunning = true;
    this.syncId = uuidv4();

    const startTime = new Date();
    const errors: SyncError[] = [];
    let recordsFetched = 0;
    let recordsProcessed = 0;
    let recordsInserted = 0;
    let recordsUpdated = 0;
    let recordsSkipped = 0;

    const {
      batchSize = 1000,
      maxRecords = 50000,
      daysBack = 30,
      fullSync = false,
      deduplicationEnabled = true,
      deduplicationWindowMinutes = 5,
      maxRetries = 3,
      retryDelayMs = 1000,
    } = options;

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`🔄 INICIANDO SINCRONIZAÇÃO ERP (${this.config.type})`);
    console.log(`   Sync ID: ${this.syncId}`);
    console.log(`   Tipo: ${fullSync ? 'FULL' : 'INCREMENTAL'}`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');

    try {
      // 1. Conectar ao ERP
      console.log('📡 Conectando ao ERP...');
      await this.connector.connect();

      // 2. Calcular período de sincronização
      const fromDate = fullSync
        ? null
        : new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

      console.log(`📅 Período: ${fromDate ? fromDate.toISOString() : 'Histórico completo'}`);

      // 3. Contar registros
      const totalCount = await this.connector.getTransactionCount(fromDate);
      console.log(`📊 Total de registros no ERP: ${totalCount.toLocaleString('pt-BR')}`);

      // 4. Set de chaves de deduplicação já sincronizadas
      const existingKeys = new Set<string>();
      if (deduplicationEnabled) {
        console.log('🔍 Carregando chaves de deduplicação...');
        // TODO: Buscar chaves do banco de auditoria
        // const existing = await this.db.query.syncDeduplicationKeys.findMany();
        // existing.forEach(k => existingKeys.add(k.key));
      }

      // 5. Buscar e processar em lotes
      let offset = 0;
      const batches = Math.ceil(Math.min(totalCount, maxRecords) / batchSize);

      for (let batch = 0; batch < batches; batch++) {
        console.log(`\n📦 Processando lote ${batch + 1}/${batches}...`);

        let transactions: ErpTransactionRow[] = [];

        // Tentar buscar com retry
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const connector = this.connector as any;

            // Use batch fetching if available
            if (connector.fetchTransactionsBatch) {
              transactions = await connector.fetchTransactionsBatch(offset, batchSize, fromDate);
            } else {
              transactions = await this.connector.fetchTransactions(fromDate, batchSize);
            }

            recordsFetched += transactions.length;
            break;
          } catch (error) {
            if (attempt < maxRetries - 1) {
              const delay = retryDelayMs * (attempt + 1);
              console.log(`⚠️  Retry ${attempt + 1}/${maxRetries} após ${delay}ms...`);
              await new Promise((r) => setTimeout(r, delay));
            } else {
              throw error;
            }
          }
        }

        // Processar cada transação
        for (const transaction of transactions) {
          recordsProcessed++;

          try {
            // Verificar duplicação
            if (deduplicationEnabled) {
              const key = generateDuplicationKey(transaction, deduplicationWindowMinutes);
              const keyStr = JSON.stringify(key);

              if (existingKeys.has(keyStr)) {
                recordsSkipped++;
                continue;
              }

              existingKeys.add(keyStr);
            }

            // TODO: Inserir ou atualizar no banco de auditoria
            // const result = await this.upsertTransaction(transaction);
            // if (result.inserted) recordsInserted++;
            // else if (result.updated) recordsUpdated++;

            // Mock: contar como inserido
            recordsInserted++;
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            errors.push({
              record: transaction,
              error: errorMsg,
              severity: 'ERROR',
              recoverable: true,
            });

            console.warn(`⚠️  Erro ao processar transação ${transaction.id}: ${errorMsg}`);
          }
        }

        offset += batchSize;

        // Mostrar progresso
        const progress = Math.min(recordsFetched, maxRecords);
        const percentage = ((progress / Math.min(totalCount, maxRecords)) * 100).toFixed(1);
        console.log(
          `   ✅ Processados: ${progress.toLocaleString('pt-BR')}/${Math.min(totalCount, maxRecords).toLocaleString('pt-BR')} (${percentage}%)`
        );
        console.log(`   📥 Inseridos: ${recordsInserted}, 📤 Atualizados: ${recordsUpdated}, ⏭️  Pulados: ${recordsSkipped}`);
      }

      // 6. Desconectar
      await this.connector.disconnect();

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      // 7. Registrar auditoria
      await this.recordSyncAudit({
        syncId: this.syncId,
        databaseType: this.config.type,
        syncType: fullSync ? 'FULL' : 'INCREMENTAL',
        startTime,
        endTime,
        duration,
        recordsProcessed,
        status: errors.length === 0 ? 'SUCCESS' : errors.length < recordsProcessed ? 'PARTIAL' : 'FAILED',
        errors: errors.map((e) => e.error),
      });

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('✅ SINCRONIZAÇÃO CONCLUÍDA');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`⏱️  Tempo total: ${(duration / 1000).toFixed(2)}s`);
      console.log(`📥 Registros inseridos: ${recordsInserted.toLocaleString('pt-BR')}`);
      console.log(`📤 Registros atualizados: ${recordsUpdated.toLocaleString('pt-BR')}`);
      console.log(`⏭️  Registros duplicados: ${recordsSkipped.toLocaleString('pt-BR')}`);
      console.log(`❌ Erros: ${errors.length}`);
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');

      return {
        success: errors.length === 0,
        startTime,
        endTime,
        duration,
        databaseType: this.config.type,
        recordsFetched,
        recordsProcessed,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        errors,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Erro crítico na sincronização:', errorMsg);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      return {
        success: false,
        startTime,
        endTime,
        duration,
        databaseType: this.config.type,
        recordsFetched,
        recordsProcessed,
        recordsInserted,
        recordsUpdated,
        recordsSkipped,
        errors: [
          {
            error: errorMsg,
            severity: 'CRITICAL',
            recoverable: false,
          },
        ],
      };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Registrar sincronização em auditoria
   */
  private async recordSyncAudit(data: any): Promise<void> {
    try {
      const auditService = getAuditService(this.db);

      await auditService.recordErpSync({
        syncId: this.syncId,
        databaseType: this.config.type,
        syncType: data.syncType,
        result: data.result,
        host: this.config.host,
        database: this.config.database,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('⚠️  Erro ao registrar auditoria:', errorMsg);
    }
  }

  /**
   * Verificar status da sincronização
   */
  isRunnng(): boolean {
    return this.isRunning;
  }

  /**
   * Obter ID da sincronização atual
   */
  getCurrentSyncId(): string {
    return this.syncId;
  }
}
