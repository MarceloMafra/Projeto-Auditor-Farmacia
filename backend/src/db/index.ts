/**
 * Database Connection
 */

import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { env } from '@/config/env';
import * as schema from './schema';
import { mockData } from '@/lib/mockData';

let db: ReturnType<typeof drizzle> | null = null;
let pool: mysql.Pool | null = null;

export async function getDb() {
  if (db) {
    return db;
  }

  // ==================== MODO MOCK ====================
  if (env.MOCK_DATABASE) {
    console.log('⚠️  MOCK DATABASE MODE ENABLED - Using fake data');
    db = createMockDb() as any;
    return db;
  }

  try {
    pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    db = drizzle(pool, { schema, mode: 'default' });
    console.log('✅ Database connected');
    return db;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    throw error;
  }
}

export async function testConnection(): Promise<boolean> {
  if (env.MOCK_DATABASE) {
    return true; // Sempre OK em modo mock
  }

  try {
    if (!pool) {
      await getDb();
    }

    const connection = await pool?.getConnection();
    if (connection) {
      connection.release();
      return true;
    }
    return false;
  } catch (error) {
    console.warn('⚠️  Database test connection failed:', error);
    return false;
  }
}

/**
 * Criar database fake para desenvolvimento
 * Retorna um objeto que simula a API do Drizzle ORM
 */
function createMockDb() {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve([]),
        }),
        limit: () => Promise.resolve([]),
      }),
    }),
    query: {
      auditAlerts: {
        findMany: async () => mockData.alerts,
      },
      operatorRiskScore: {
        findMany: async () => mockData.operators,
      },
    },
    // Retorna promessas diretas para operações comuns
    execute: async (query: any) => Promise.resolve([]),
  } as any;
}

export type Database = ReturnType<typeof drizzle>;

export default { getDb, testConnection };
