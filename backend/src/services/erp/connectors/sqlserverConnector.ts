/**
 * SQL Server ERP Connector
 *
 * Conecta a bancos de dados SQL Server
 * Requer: npm install mssql
 */

import { BaseErpConnector } from './baseConnector';
import { ErpConfig, ErpTransactionRow } from '../types';

export class SqlServerErpConnector extends BaseErpConnector {
  private pool: any = null;

  constructor(config: ErpConfig) {
    super(config);
    if (config.type !== 'sqlserver') {
      throw new Error('Config type must be sqlserver');
    }
  }

  async connect(): Promise<void> {
    try {
      console.log(`🔌 Conectando ao SQL Server ERP: ${this.config.host}:${this.config.port}`);

      // Importar mssql dinamicamente
      let sql: any;
      try {
        sql = require('mssql');
      } catch {
        throw new Error(
          'mssql não instalado. Execute: npm install mssql'
        );
      }

      // Criar pool
      this.pool = new sql.ConnectionPool({
        server: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        authentication: {
          type: 'default',
        },
        options: {
          encrypt: this.config.ssl || true,
          trustServerCertificate: true,
          connectTimeout: this.config.connectionTimeout || 10000,
          requestTimeout: this.config.requestTimeout || 30000,
        },
        pool: {
          min: 2,
          max: 10,
        },
      });

      // Test connection
      await this.pool.connect();
      await this.pool.request().query('SELECT 1');

      this.isConnected = true;
      console.log('✅ Conectado ao SQL Server ERP com sucesso');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Erro ao conectar ao SQL Server ERP:', errorMsg);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
        this.isConnected = false;
        console.log('✅ Desconectado do SQL Server ERP');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Erro ao desconectar do SQL Server ERP:', errorMsg);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) {
        await this.connect();
      }

      await this.pool.request().query('SELECT 1');
      return true;
    } catch (error) {
      console.error('❌ Teste de conexão SQL Server falhou:', error);
      return false;
    }
  }

  async getLastSyncTimestamp(): Promise<Date | null> {
    try {
      if (!this.pool) throw new Error('Não conectado ao ERP');

      const result = await this.pool
        .request()
        .query(`SELECT MAX(created_at) as last_sync FROM sale_transactions`);

      if (result.recordset && result.recordset.length > 0 && result.recordset[0].last_sync) {
        return new Date(result.recordset[0].last_sync);
      }

      return null;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Erro ao buscar último sync timestamp:', errorMsg);
      return null;
    }
  }

  async fetchTransactions(fromDate?: Date, limit: number = 1000): Promise<ErpTransactionRow[]> {
    try {
      if (!this.pool) throw new Error('Não conectado ao ERP');

      let query = `
        SELECT TOP (@limit)
          id,
          pdv,
          operator,
          amount,
          timestamp,
          type,
          reference
        FROM sale_transactions
        WHERE 1=1
      `;

      const request = this.pool.request();
      request.input('limit', limit);

      if (fromDate) {
        query += ` AND timestamp >= @fromDate`;
        request.input('fromDate', fromDate);
      }

      query += ` ORDER BY timestamp ASC`;

      console.log(`📊 Buscando transações SQL Server (limite: ${limit})...`);

      const result = await request.query(query);

      const transactions = (result.recordset || [])
        .map((row: any) => this.normalizeTransaction(row))
        .filter((row) => this.validateTransaction(row));

      console.log(`✅ ${transactions.length} transações buscadas do SQL Server`);
      return transactions;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Erro ao buscar transações SQL Server:', errorMsg);
      return [];
    }
  }

  async getTransactionCount(fromDate?: Date): Promise<number> {
    try {
      if (!this.pool) throw new Error('Não conectado ao ERP');

      let query = 'SELECT COUNT(*) as count FROM sale_transactions WHERE 1=1';
      const request = this.pool.request();

      if (fromDate) {
        query += ` AND timestamp >= @fromDate`;
        request.input('fromDate', fromDate);
      }

      const result = await request.query(query);

      if (result.recordset && result.recordset.length > 0) {
        return result.recordset[0].count || 0;
      }

      return 0;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Erro ao contar transações SQL Server:', errorMsg);
      return 0;
    }
  }

  /**
   * Buscar transações por lote com offset
   */
  async fetchTransactionsBatch(
    offset: number = 0,
    limit: number = 1000,
    fromDate?: Date
  ): Promise<ErpTransactionRow[]> {
    try {
      if (!this.pool) throw new Error('Não conectado ao ERP');

      let query = `
        SELECT
          id,
          pdv,
          operator,
          amount,
          timestamp,
          type,
          reference
        FROM sale_transactions
        WHERE 1=1
      `;

      const request = this.pool.request();

      if (fromDate) {
        query += ` AND timestamp >= @fromDate`;
        request.input('fromDate', fromDate);
      }

      query += ` ORDER BY timestamp ASC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`;
      request.input('offset', offset);
      request.input('limit', limit);

      const result = await request.query(query);

      return (result.recordset || [])
        .map((row: any) => this.normalizeTransaction(row))
        .filter((row) => this.validateTransaction(row));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Erro ao buscar lote de transações SQL Server:', errorMsg);
      return [];
    }
  }
}
