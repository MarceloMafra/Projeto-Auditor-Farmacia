/**
 * PostgreSQL ERP Connector
 *
 * Conecta a bancos de dados PostgreSQL
 */

import { Pool, Client } from 'pg';
import { BaseErpConnector } from './baseConnector';
import { ErpConfig, ErpTransactionRow } from '../types';

export class PostgresErpConnector extends BaseErpConnector {
  private pool: Pool | null = null;

  constructor(config: ErpConfig) {
    super(config);
    if (config.type !== 'postgresql') {
      throw new Error('Config type must be postgresql');
    }
  }

  async connect(): Promise<void> {
    try {
      console.log(`🔌 Conectando ao PostgreSQL ERP: ${this.config.host}:${this.config.port}`);

      this.pool = new Pool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: this.config.connectionTimeout || 10000,
        idleTimeoutMillis: 30000,
        max: 10,
      });

      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      console.log('✅ Conectado ao PostgreSQL ERP com sucesso');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Erro ao conectar ao PostgreSQL ERP:', errorMsg);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        this.isConnected = false;
        console.log('✅ Desconectado do PostgreSQL ERP');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Erro ao desconectar do PostgreSQL ERP:', errorMsg);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) {
        await this.connect();
      }

      const client = await this.pool!.connect();
      await client.query('SELECT NOW()');
      client.release();

      return true;
    } catch (error) {
      console.error('❌ Teste de conexão PostgreSQL falhou:', error);
      return false;
    }
  }

  async getLastSyncTimestamp(): Promise<Date | null> {
    try {
      if (!this.pool) throw new Error('Não conectado ao ERP');

      const client = await this.pool.connect();

      try {
        const result = await client.query(
          `SELECT MAX(created_at) as last_sync FROM sale_transactions`
        );

        client.release();

        if (result.rows.length > 0 && result.rows[0].last_sync) {
          return new Date(result.rows[0].last_sync);
        }

        return null;
      } catch (error) {
        client.release();
        throw error;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Erro ao buscar último sync timestamp:', errorMsg);
      return null;
    }
  }

  async fetchTransactions(fromDate?: Date, limit: number = 1000): Promise<ErpTransactionRow[]> {
    try {
      if (!this.pool) throw new Error('Não conectado ao ERP');

      const client = await this.pool.connect();

      try {
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

        const params: any[] = [];

        if (fromDate) {
          query += ` AND timestamp >= $${params.length + 1}`;
          params.push(fromDate);
        }

        query += ` ORDER BY timestamp ASC LIMIT $${params.length + 1}`;
        params.push(limit);

        console.log(`📊 Buscando transações PostgreSQL (limite: ${limit})...`);

        const result = await client.query(query, params);
        client.release();

        const transactions = result.rows
          .map((row) => this.normalizeTransaction(row))
          .filter((row) => this.validateTransaction(row));

        console.log(`✅ ${transactions.length} transações buscadas do PostgreSQL`);
        return transactions;
      } catch (error) {
        client.release();
        throw error;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Erro ao buscar transações PostgreSQL:', errorMsg);
      return [];
    }
  }

  async getTransactionCount(fromDate?: Date): Promise<number> {
    try {
      if (!this.pool) throw new Error('Não conectado ao ERP');

      const client = await this.pool.connect();

      try {
        let query = 'SELECT COUNT(*) as count FROM sale_transactions WHERE 1=1';
        const params: any[] = [];

        if (fromDate) {
          query += ` AND timestamp >= $${params.length + 1}`;
          params.push(fromDate);
        }

        const result = await client.query(query, params);
        client.release();

        return parseInt(result.rows[0].count, 10) || 0;
      } catch (error) {
        client.release();
        throw error;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Erro ao contar transações PostgreSQL:', errorMsg);
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

      const client = await this.pool.connect();

      try {
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

        const params: any[] = [];

        if (fromDate) {
          query += ` AND timestamp >= $${params.length + 1}`;
          params.push(fromDate);
        }

        query += ` ORDER BY timestamp ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await client.query(query, params);
        client.release();

        return result.rows
          .map((row) => this.normalizeTransaction(row))
          .filter((row) => this.validateTransaction(row));
      } catch (error) {
        client.release();
        throw error;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Erro ao buscar lote de transações PostgreSQL:', errorMsg);
      return [];
    }
  }
}
