#!/usr/bin/env ts-node

/**
 * Seed CLI Script
 * Executa: npx ts-node backend/scripts/seed.ts
 */

import { getDb } from '@/db';
import { runSeed } from '@/db/seed';

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...\n');

  try {
    const db = await getDb();
    await runSeed(db);
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

main();
