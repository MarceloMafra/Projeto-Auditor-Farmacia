/**
 * Database Seed
 *
 * Gera dados de teste realistas:
 * - 30 farmácias
 * - 150 funcionários (5 por farmácia)
 * - 45.160 transações de vendas
 * - Alertas de fraude para detecção de padrões
 *
 * Usar: npx ts-node backend/src/db/seed.ts
 */

import { Database } from '@/db';
import {
  employees,
  sales,
  cancellations,
  posEvents,
  pbmAuthorizations,
  cashDiscrepancies,
  operatorRiskScore,
  auditAlerts,
} from '@/db/schema';
import { v4 as uuidv4 } from 'uuid';

const PHARMACIES_COUNT = 30;
const EMPLOYEES_PER_PHARMACY = 5;
const TRANSACTIONS_PER_PHARMACY = 1500; // Total: 45.000

// CPFs válidos para teste (formato: XXX.XXX.XXX-XX)
function generateCPF(): string {
  const random = Math.floor(Math.random() * 10000000000000000);
  const str = String(random).padStart(14, '0');
  return `${str.slice(0, 3)}.${str.slice(3, 6)}.${str.slice(6, 9)}-${str.slice(9, 11)}`;
}

// Gerar ID do PDV (3 dígitos)
function generatePDV(pharmacyId: number): number {
  return 100 + pharmacyId;
}

// Produtos farmacêuticos comuns
const PRODUCTS = [
  { name: 'Dipirona 500mg', basePrice: 5.5 },
  { name: 'Paracetamol 750mg', basePrice: 8.2 },
  { name: 'Amoxicilina 500mg', basePrice: 22.5 },
  { name: 'Ibuprofeno 600mg', basePrice: 12.3 },
  { name: 'Vitamina C 1000mg', basePrice: 15.8 },
  { name: 'Omeprazol 20mg', basePrice: 18.9 },
  { name: 'Atorvastatina 40mg', basePrice: 35.2 },
  { name: 'Losartana 50mg', basePrice: 22.7 },
  { name: 'Metformina 500mg', basePrice: 14.3 },
  { name: 'Levotiroxina 100mcg', basePrice: 19.5 },
];

interface SeedContext {
  db: Database;
  pharmaciesData: Map<
    number,
    {
      id: string;
      pdv: number;
      employees: Array<{ cpf: string; name: string }>;
    }
  >;
}

/**
 * Criar farmácias e funcionários
 */
async function seedPharmaciesAndEmployees(ctx: SeedContext): Promise<void> {
  console.log('🏪 Criando 30 farmácias com 150 funcionários...');

  for (let pharmacyIdx = 1; pharmacyIdx <= PHARMACIES_COUNT; pharmacyIdx++) {
    const pdv = generatePDV(pharmacyIdx);
    const pharmacyEmployees: Array<{ cpf: string; name: string }> = [];

    // Criar 5 funcionários por farmácia
    for (let empIdx = 1; empIdx <= EMPLOYEES_PER_PHARMACY; empIdx++) {
      const cpf = generateCPF();
      const name = `Funcionário ${pharmacyIdx}-${empIdx}`;

      await ctx.db.insert(employees).values({
        cpf,
        name,
        email: `emp${pharmacyIdx}${empIdx}@pharmacy.test`,
        pharmacy: `Farmácia ${pharmacyIdx}`,
        role: empIdx === 1 ? 'GERENTE' : 'OPERADOR',
        status: 'ATIVO',
        hireDate: new Date('2023-01-01'),
      });

      pharmacyEmployees.push({ cpf, name });
    }

    ctx.pharmaciesData.set(pharmacyIdx, {
      id: `FARM_${String(pharmacyIdx).padStart(3, '0')}`,
      pdv,
      employees: pharmacyEmployees,
    });
  }

  console.log('✅ 150 funcionários criados');
}

/**
 * Criar transações de vendas realistas
 */
async function seedSales(ctx: SeedContext): Promise<void> {
  console.log('💰 Criando 45.000 transações de vendas...');

  let totalSales = 0;
  const baseDate = new Date('2024-01-01');

  for (const [pharmacyIdx, pharmacyData] of ctx.pharmaciesData) {
    console.log(
      `   Farmácia ${pharmacyIdx}/${PHARMACIES_COUNT}: ${TRANSACTIONS_PER_PHARMACY} transações...`
    );

    for (let saleIdx = 0; saleIdx < TRANSACTIONS_PER_PHARMACY; saleIdx++) {
      // Distribuir vendas ao longo dos últimos 30 dias
      const daysOffset = Math.floor(Math.random() * 30);
      const hoursOffset = Math.floor(Math.random() * 24);
      const minutesOffset = Math.floor(Math.random() * 60);

      const saleDate = new Date(baseDate);
      saleDate.setDate(saleDate.getDate() - daysOffset);
      saleDate.setHours(6 + hoursOffset); // Aberto das 6:00 às 22:00
      saleDate.setMinutes(minutesOffset);

      // Selecionar operador aleatório
      const operator = pharmacyData.employees[Math.floor(Math.random() * pharmacyData.employees.length)];

      // Gerar quantidade de itens (1-10)
      const itemCount = Math.floor(Math.random() * 10) + 1;
      let totalAmount = 0;

      for (let i = 0; i < itemCount; i++) {
        const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
        const quantity = Math.floor(Math.random() * 5) + 1;
        const price = product.basePrice * (0.8 + Math.random() * 0.4); // Variação de preço
        totalAmount += price * quantity;
      }

      // 50% de chance de ter CPF do cliente
      const customerCpf = Math.random() > 0.5 ? generateCPF() : null;

      await ctx.db.insert(sales).values({
        id: uuidv4(),
        idPdv: String(pharmacyData.pdv),
        idOperator: operator.cpf,
        customerCpf,
        totalAmount: totalAmount.toFixed(2),
        timestampSale: saleDate,
      });

      totalSales++;

      // Simular 10% de chance de devolução
      if (Math.random() < 0.1) {
        // Criar cancelamento
        const cancellationDate = new Date(saleDate);
        // Delay variado: 30s a 5 minutos
        const delaySeconds = Math.floor(Math.random() * 300) + 30;
        cancellationDate.setSeconds(cancellationDate.getSeconds() + delaySeconds);

        const isGhost = delaySeconds > 60; // Marcar se é possível ghost

        await ctx.db.insert(cancellations).values({
          id: uuidv4(),
          idSale: uuidv4(), // Fake reference
          idOperator: operator.cpf,
          reasonCode: ['DEVOLUCAO', 'ERRO_OPERADOR', 'CLIENTE_MUDOU'][
            Math.floor(Math.random() * 3)
          ],
          timestampCancellation: cancellationDate,
          isGhost,
        });
      }
    }
  }

  console.log(`✅ ${totalSales.toLocaleString('pt-BR')} vendas criadas`);
}

/**
 * Criar eventos de POS
 */
async function seedPosEvents(ctx: SeedContext): Promise<void> {
  console.log('🖥️  Criando eventos de POS...');

  let eventCount = 0;
  const baseDate = new Date('2024-01-01');
  const EVENT_TYPES = [
    'SALE_COMPLETED',
    'SALE_CANCELLED',
    'DRAWER_OPEN_NO_SALE',
    'DRAWER_CLOSED',
  ];

  for (const [, pharmacyData] of ctx.pharmaciesData) {
    // Criar ~200 eventos por farmácia
    for (let i = 0; i < 200; i++) {
      const daysOffset = Math.floor(Math.random() * 30);
      const hoursOffset = Math.floor(Math.random() * 24);

      const eventDate = new Date(baseDate);
      eventDate.setDate(eventDate.getDate() - daysOffset);
      eventDate.setHours(6 + hoursOffset);

      const operator = pharmacyData.employees[Math.floor(Math.random() * pharmacyData.employees.length)];
      const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];

      await ctx.db.insert(posEvents).values({
        id: uuidv4(),
        idPdv: String(pharmacyData.pdv),
        idOperator: operator.cpf,
        eventType,
        eventTimestamp: eventDate,
      });

      eventCount++;
    }
  }

  console.log(`✅ ${eventCount.toLocaleString('pt-BR')} eventos POS criados`);
}

/**
 * Criar autorizações PBM
 */
async function seedPbmAuthorizations(ctx: SeedContext): Promise<void> {
  console.log('💳 Criando autorizações PBM...');

  let authCount = 0;
  const baseDate = new Date('2024-01-01');
  const PBM_PLANS = ['UNIMED', 'AMIL', 'BRADESCO', 'SUL_AMERICA', 'ALICE'];

  for (const [, pharmacyData] of ctx.pharmaciesData) {
    // Criar ~100 autorizações por farmácia
    for (let i = 0; i < 100; i++) {
      const daysOffset = Math.floor(Math.random() * 30);
      const hoursOffset = Math.floor(Math.random() * 24);

      const authDate = new Date(baseDate);
      authDate.setDate(authDate.getDate() - daysOffset);
      authDate.setHours(6 + hoursOffset);

      const operator = pharmacyData.employees[Math.floor(Math.random() * pharmacyData.employees.length)];
      const plan = PBM_PLANS[Math.floor(Math.random() * PBM_PLANS.length)];

      // 90% de chance de ser APPROVED
      const status = Math.random() < 0.9 ? 'APPROVED' : 'DENIED';

      const amount = (Math.random() * 500 + 50).toFixed(2);

      await ctx.db.insert(pbmAuthorizations).values({
        id: uuidv4(),
        idPdv: String(pharmacyData.pdv),
        idOperator: operator.cpf,
        plan,
        amount,
        status,
        authTimestamp: authDate,
      });

      authCount++;
    }
  }

  console.log(`✅ ${authCount.toLocaleString('pt-BR')} autorizações PBM criadas`);
}

/**
 * Criar discrepâncias de caixa (10% de chance)
 */
async function seedCashDiscrepancies(ctx: SeedContext): Promise<void> {
  console.log('💸 Criando discrepâncias de caixa...');

  let discrepancyCount = 0;
  const baseDate = new Date('2024-01-01');

  for (const [, pharmacyData] of ctx.pharmaciesData) {
    // Criar ~15 discrepâncias por farmácia (1% de eventos)
    for (let i = 0; i < 15; i++) {
      const daysOffset = Math.floor(Math.random() * 30);

      const discDate = new Date(baseDate);
      discDate.setDate(discDate.getDate() - daysOffset);

      // Distribuição de discrepâncias:
      // 70% pequenas (<R$50), 20% médias (R$50-R$200), 8% grandes (R$200-R$500), 2% críticas (>R$500)
      const rand = Math.random();
      let discrepancy: number;

      if (rand < 0.7) {
        discrepancy = Math.random() * 50;
      } else if (rand < 0.9) {
        discrepancy = Math.random() * 150 + 50;
      } else if (rand < 0.98) {
        discrepancy = Math.random() * 300 + 200;
      } else {
        discrepancy = Math.random() * 500 + 500;
      }

      // 50% negativa, 50% positiva
      if (Math.random() < 0.5) discrepancy *= -1;

      await ctx.db.insert(cashDiscrepancies).values({
        id: uuidv4(),
        idPdv: String(pharmacyData.pdv),
        discrepancy: discrepancy.toFixed(2),
        discrepancyDate: discDate,
      });

      discrepancyCount++;
    }
  }

  console.log(`✅ ${discrepancyCount.toLocaleString('pt-BR')} discrepâncias de caixa criadas`);
}

/**
 * Executar seed completo
 */
export async function runSeed(db: Database): Promise<void> {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🌱 INICIANDO SEED DE DADOS');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  const startTime = Date.now();
  const ctx: SeedContext = {
    db,
    pharmaciesData: new Map(),
  };

  try {
    await seedPharmaciesAndEmployees(ctx);
    await seedSales(ctx);
    await seedPosEvents(ctx);
    await seedPbmAuthorizations(ctx);
    await seedCashDiscrepancies(ctx);

    const duration = (Date.now() - startTime) / 1000;

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ SEED CONCLUÍDO COM SUCESSO');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Tempo total: ${duration.toFixed(2)}s`);
    console.log(`📊 Dados criados:`);
    console.log(`   - 30 farmácias`);
    console.log(`   - 150 funcionários`);
    console.log(`   - ~45.000 transações`);
    console.log(`   - ~6.000 eventos POS`);
    console.log(`   - ~3.000 autorizações PBM`);
    console.log(`   - ~450 discrepâncias de caixa`);
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Erro ao executar seed:', errorMsg);
    process.exit(1);
  }
}
