/**
 * Oracle ERP Connector
 *
 * Conecta a bancos de dados Oracle
 * Requer: npm install oracledb
 */

import { BaseErpConnector } from './baseConnector';
import { ErpConfig, ErpTransactionRow } from '../types';

export class OracleErpConnector extends BaseErpConnector {
  private pool: any = null;

  constructor(config: ErpConfig) {
    super(config);
    if (config.type !== 'oracle') {
      throw new Error('Config type must be oracle');
    }
  }

  async connect(): Promise<void> {
    try {
      console.log(`🔌 Conectando ao Oracle ERP: ${this.config.host}:${this.config.port}`);

      // Importar oracledb dinamicamente
      let oracledb: any;
      try {
        oracledb = require('oracledb');
      } catch {
        throw new Error(
          'oracledb não instalado. Execute: npm install oracledb'
        );
      }

      // Criar pool
      this.pool = await oracledb.createPool({
        connectString: `${this.config.host}:${this.config.port}/${this.config.database}`,
        user: this.config.username,
        password: this.config.password,
        poolMin: 2,
        poolMax: 10,
        poolIncrement: 1,
        connectTimeout: (this.config.connectionTimeout || 10000) / 1000, // em segundos
      });

      // Test connection
      const connection = await this.pool.getConnection();
      await connection.execute('SELECT 1 FROM DUAL');
      await connection.close();

      this.isConnected = true;
      console.log('✅ Conectado ao Oracle ERP com sucesso');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Erro ao conectar ao Oracle ERP:', errorMsg);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.pool) {
        await this.pool.close();
        this.pool = null;
        this.isConnected = false;
        console.log('✅ Desconectado do Oracle ERP');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Erro ao desconectar do Oracle ERP:', errorMsg);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.pool) {
        await this.connect();
      }

      const connection = await this.pool.getConnection();
      await connection.execute('SELECT 1 FROM DUAL');
      await connection.close();

      return true;
    } catch (error) {
      console.error('❌ Teste de conexão Oracle falhou:', error);
      return false;
    }
  }

  async getLastSyncTimestamp(): Promise<Date | null> {
    try {
      if (!this.pool) throw new Error('Não conectado ao ERP');

      const connection = await this.pool.getConnection();

      try {
        const result = await connection.execute(
          `SELECT MAX(created_at) as last_sync FROM sale_transactions`
        );

        await connection.close();

        if (result.rows && result.rows.length > 0 && result.rows[0][0]) {
          return new Date(result.rows[0][0]);
        }

        return null;
      } catch (error) {
        await connection.close();
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
            id,
            pdv,
            operator,
            amount,
            timestamp,
            type,
            reference
          FROM sale_transactions
          WHERE ROWNUM <= :limit
        `;

        const params: any = { limit };

        if (fromDate) {
          query = `
            SELECT * FROM (
              ${query.replace('WHERE ROWNUM <= :limit', '')}
              WHERE timestamp >= :fromDate
              ORDER BY timestamp ASC
            ) WHERE ROWNUM <= :limit
          `;
          params.fromDate = fromDate;
        } else {
          query += ` ORDER BY timestamp ASC`;
        }

        console.log(`📊 Buscando transações Oracle (limite: ${limit})...`);

        const result = await connection.execute(query, params, { outFormat: 3 }); // OBJECT mode
        await connection.close();

        const transactions = (result.rows || [])
          .map((row: any) => this.normalizeTransaction(row))
          .filter((row) => this.validateTransaction(row));

        console.log(`✅ ${transactions.length} transações buscadas do Oracle`);
        return transactions;
      } catch (error) {
        await connection.close();
        throw error;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Erro ao buscar transações Oracle:', errorMsg);
      return [];
    }
  }

  async getTransactionCount(fromDate?: Date): Promise<number> {
    try {
      if (!this.pool) throw new Error('Não conectado ao ERP');

      const connection = await this.pool.getConnection();

      try {
        let query = 'SELECT COUNT(*) as count FROM sale_transactions WHERE 1=1';
        const params: any = {};

        if (fromDate) {
          query += ` AND timestamp >= :fromDate`;
          params.fromDate = fromDate;
        }

        const result = await connection.execute(query, params, { outFormat: 3 });
        await connection.close();

        if (result.rows && result.rows.length > 0) {
          return result.rows[0].COUNT || 0;
        }

        return 0;
      } catch (error) {
        await connection.close();
        throw error;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Erro ao contar transações Oracle:', errorMsg);
      return 0;
    }
  }
}
