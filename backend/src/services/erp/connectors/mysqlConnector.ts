/**
 * MySQL ERP Connector
 *
 * Conecta a bancos de dados MySQL/MariaDB
 */

import mysql from 'mysql2/promise';
import { Pool } from 'mysql2/promise';
import { BaseErpConnector } from './baseConnector';
import { ErpConfig, ErpTransactionRow } from '../types';

export class MysqlErpConnector extends BaseErpConnector {
  private pool: Pool | null = null;

  constructor(config: ErpConfig) {
    super(config);
    if (config.type !== 'mysql') {
      throw new Error('Config type must be mysql');
    }
  }

  async connect(): Promise<void> {
    try {
      console.log(`🔌 Conectando ao MySQL ERP: ${this.config.host}:${this.config.port}`);

      this.pool = mysql.createPool({
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableConnectionPooling: true,
        connectTimeout: this.config.connectionTimeout || 10000,
      });

      // Test connection
      const connection = await this.pool.getConnection();
      await connection.ping();
      connection.release();

      this.isConnected = true;
      console.log('✅ Conectado ao MySQL ERP com sucesso');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Erro ao conectar ao MySQL ERP:', errorMsg);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
        this.isConnected = false;
        console.log('✅ Desconectado do MySQL ERP');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Erro ao desconectar do MySQL ERP:', errorMsg);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) {
        await this.connect();
      }

      const connection = await this.pool!.getConnection();
      await connection.ping();
      connection.release();

      return true;
    } catch (error) {
      console.error('❌ Teste de conexão MySQL falhou:', error);
      return false;
    }
  }

  async getLastSyncTimestamp(): Promise<Date | null> {
    try {
      if (!this.pool) throw new Error('Não conectado ao ERP');

      const connection = await this.pool.getConnection();

      try {
        // Buscar último timestamp de sincronização
        // Assumindo que existe tabela com audit trail
        const [rows] = await connection.query(
          `SELECT MAX(created_at) as last_sync FROM sale_transactions LIMIT 1`
        );

        connection.release();

        const result = rows as any[];
        if (result.length > 0 && result[0].last_sync) {
          return new Date(result[0].last_sync);
        }

        return null;
      } catch (error) {
        connection.release();
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

      const connection = await this.pool.getConnection();

      try {
        let query = `
          SELECT
            t.id,
            t.pdv,
            t.operator,
            t.amount,
            t.timestamp,
            t.type,
            t.reference
          FROM sale_transactions t
          WHERE 1=1
        `;

        const params: any[] = [];

        if (fromDate) {
          query += ` AND t.timestamp >= ?`;
          params.push(this.formatDateForQuery(fromDate));
        }

        query += ` ORDER BY t.timestamp ASC LIMIT ?`;
        params.push(limit);

        console.log(`📊 Buscando transações MySQL (limite: ${limit})...`);

        const [rows] = await connection.query(query, params);
        connection.release();

        const transactions = (rows as any[]).map((row) => this.normalizeTransaction(row)).filter((row) =>
          this.validateTransaction(row)
        );

        console.log(`✅ ${transactions.length} transações buscadas do MySQL`);
        return transactions;
      } catch (error) {
        connection.release();
        throw error;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Erro ao buscar transações MySQL:', errorMsg);
      return [];
    }
  }

  async getTransactionCount(fromDate?: Date): Promise<number> {
    try {
      if (!this.pool) throw new Error('Não conectado ao ERP');

      const connection = await this.pool.getConnection();

      try {
        let query = 'SELECT COUNT(*) as count FROM sale_transactions WHERE 1=1';
        const params: any[] = [];

        if (fromDate) {
          query += ` AND timestamp >= ?`;
          params.push(this.formatDateForQuery(fromDate));
        }

        const [rows] = await connection.query(query, params);
        connection.release();

        const result = rows as any[];
        return result[0].count || 0;
      } catch (error) {
        connection.release();
        throw error;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Erro ao contar transações MySQL:', errorMsg);
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

      const connection = await this.pool.getConnection();

      try {
        let query = `
          SELECT
            t.id,
            t.pdv,
            t.operator,
            t.amount,
            t.timestamp,
            t.type,
            t.reference
          FROM sale_transactions t
          WHERE 1=1
        `;

        const params: any[] = [];

        if (fromDate) {
          query += ` AND t.timestamp >= ?`;
          params.push(this.formatDateForQuery(fromDate));
        }

        query += ` ORDER BY t.timestamp ASC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await connection.query(query, params);
        connection.release();

        return (rows as any[])
          .map((row) => this.normalizeTransaction(row))
          .filter((row) => this.validateTransaction(row));
      } catch (error) {
        connection.release();
        throw error;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Erro ao buscar lote de transações MySQL:', errorMsg);
      return [];
    }
  }
}
