/**
 * Base ERP Connector
 *
 * Classe abstrata que define a interface para todos os conectores de ERP
 */

import {
  ErpConnectorInterface,
  ErpConfig,
  ErpTransactionRow,
  DatabaseType,
} from '../types';

export abstract class BaseErpConnector implements ErpConnectorInterface {
  protected config: ErpConfig;
  protected isConnected: boolean = false;
  protected lastSyncTimestamp: Date | null = null;

  constructor(config: ErpConfig) {
    this.config = config;
    this.validateConfig();
  }

  /**
   * Validar configuração básica
   */
  protected validateConfig(): void {
    if (!this.config.host) throw new Error('ERP host é obrigatório');
    if (!this.config.database) throw new Error('ERP database é obrigatório');
    if (!this.config.username) throw new Error('ERP username é obrigatório');
    if (!this.config.port < 1 || this.config.port > 65535)
      throw new Error('ERP port deve estar entre 1 e 65535');
  }

  /**
   * Conectar ao banco de dados
   */
  abstract connect(): Promise<void>;

  /**
   * Desconectar do banco de dados
   */
  abstract disconnect(): Promise<void>;

  /**
   * Testar conexão
   */
  abstract testConnection(): Promise<boolean>;

  /**
   * Buscar último timestamp de sincronização
   */
  abstract getLastSyncTimestamp(): Promise<Date | null>;

  /**
   * Buscar transações do ERP
   */
  abstract fetchTransactions(fromDate?: Date, limit?: number): Promise<ErpTransactionRow[]>;

  /**
   * Contar transações
   */
  abstract getTransactionCount(fromDate?: Date): Promise<number>;

  /**
   * Normalizar dados de transação
   * Converte dados do ERP para formato padrão
   */
  protected normalizeTransaction(row: any): ErpTransactionRow {
    // Override em subclasses se necessário
    return {
      id: row.id || row.transaction_id,
      pdv: String(row.pdv || row.terminal || row.pos),
      operator: String(row.operator || row.employee || row.operator_id),
      amount: parseFloat(row.amount || row.total || 0),
      timestamp: new Date(row.timestamp || row.date || row.created_at),
      type: row.type || 'SALE',
      reference: row.reference || row.reference_id,
      metadata: row.metadata || {},
    };
  }

  /**
   * Validar transação normalizada
   */
  protected validateTransaction(row: ErpTransactionRow): boolean {
    if (!row.id) {
      console.warn('Transaction missing id');
      return false;
    }
    if (!row.pdv) {
      console.warn('Transaction missing pdv');
      return false;
    }
    if (!row.operator) {
      console.warn('Transaction missing operator');
      return false;
    }
    if (row.amount < 0) {
      console.warn('Transaction has negative amount');
      return false;
    }
    if (!(row.timestamp instanceof Date) || isNaN(row.timestamp.getTime())) {
      console.warn('Transaction has invalid timestamp');
      return false;
    }
    return true;
  }

  /**
   * Obter tipo de banco de dados
   */
  getDatabaseType(): DatabaseType {
    return this.config.type;
  }

  /**
   * Verificar se está conectado
   */
  isConnectedStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Formatar data para query SQL
   */
  protected formatDateForQuery(date: Date): string {
    return date.toISOString().replace('T', ' ').substring(0, 19);
  }

  /**
   * Parse data de string para Date
   */
  protected parseDate(value: any): Date {
    if (value instanceof Date) return value;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date: ${value}`);
    }
    return date;
  }
}
