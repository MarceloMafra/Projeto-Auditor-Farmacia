/**
 * Mock Data para desenvolvimento sem banco de dados
 * Simula dados reais para testar frontend/backend
 */

export const mockData = {
  // KPIs para Dashboard
  kpis: {
    pendingAlerts: 12,
    highRiskOperators: 3,
    cancellationRate: 2.5,
    activeDetections: 6,
    avgInvestigationTime: 125,
    accuracyRate: 87.5,
    pharmacyCoverage: 30,
    recoveredValue: 125500,
  },

  // Alertas recentes
  alerts: [
    {
      id: 'ALERT-2026-02-001',
      alertType: 'GHOST_CANCELLATION',
      severity: 'HIGH',
      status: 'Pending',
      operatorName: 'João Silva',
      idOperator: '12345678901',
      pdv: 'PDV-001',
      pharmacy: 'Farmácia Centro',
      saleAmount: 245.5,
      riskScore: 35,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2h atrás
    },
    {
      id: 'ALERT-2026-02-002',
      alertType: 'PBM_DEVIATION',
      severity: 'CRITICAL',
      status: 'Pending',
      operatorName: 'Maria Santos',
      idOperator: '98765432109',
      pdv: 'PDV-005',
      pharmacy: 'Farmácia Bom Retiro',
      saleAmount: 180.0,
      riskScore: 55,
      createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1h atrás
    },
    {
      id: 'ALERT-2026-02-003',
      alertType: 'NO_SALE',
      severity: 'MEDIUM',
      status: 'Investigado',
      operatorName: 'Pedro Costa',
      idOperator: '55555555555',
      pdv: 'PDV-003',
      pharmacy: 'Farmácia Sul',
      saleAmount: null,
      riskScore: 20,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5h atrás
    },
    {
      id: 'ALERT-2026-02-004',
      alertType: 'CPF_ABUSE',
      severity: 'HIGH',
      status: 'Pending',
      operatorName: 'Ana Oliveira',
      idOperator: '11111111111',
      pdv: 'PDV-002',
      pharmacy: 'Farmácia Norte',
      saleAmount: 320.75,
      riskScore: 60,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3h atrás
    },
    {
      id: 'ALERT-2026-02-005',
      alertType: 'CASH_DISCREPANCY',
      severity: 'MEDIUM',
      status: 'Falso Positivo',
      operatorName: 'Carlos Mendes',
      idOperator: '22222222222',
      pdv: 'PDV-004',
      pharmacy: 'Farmácia Oeste',
      saleAmount: 150.0,
      riskScore: 15,
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8h atrás
    },
  ],

  // Operadores com scores de risco
  operators: [
    {
      cpf: '98765432109',
      name: 'Maria Santos',
      riskScore: 215,
      riskLevel: 'CRITICAL',
      alertCount: 8,
    },
    {
      cpf: '12345678901',
      name: 'João Silva',
      riskScore: 165,
      riskLevel: 'HIGH',
      alertCount: 5,
    },
    {
      cpf: '11111111111',
      name: 'Ana Oliveira',
      riskScore: 145,
      riskLevel: 'HIGH',
      alertCount: 4,
    },
    {
      cpf: '55555555555',
      name: 'Pedro Costa',
      riskScore: 85,
      riskLevel: 'MEDIUM',
      alertCount: 2,
    },
    {
      cpf: '22222222222',
      name: 'Carlos Mendes',
      riskScore: 45,
      riskLevel: 'LOW',
      alertCount: 1,
    },
  ],

  // Estatísticas por tipo de alerta
  alertsByType: [
    { type: 'GHOST_CANCELLATION', count: 34 },
    { type: 'PBM_DEVIATION', count: 28 },
    { type: 'CPF_ABUSE', count: 22 },
    { type: 'CASH_DISCREPANCY', count: 18 },
    { type: 'NO_SALE', count: 15 },
  ],

  // Distribuição por severidade
  alertsBySeverity: [
    { severity: 'CRITICAL', count: 12 },
    { severity: 'HIGH', count: 28 },
    { severity: 'MEDIUM', count: 35 },
    { severity: 'LOW', count: 42 },
  ],

  // Timeline de sync
  lastSyncs: [
    {
      id: 'SYNC-2026-02-24-001',
      syncId: 'sync_1708876800',
      databaseType: 'mysql',
      syncType: 'INCREMENTAL',
      startTime: new Date(Date.now() - 5 * 60 * 1000),
      endTime: new Date(Date.now() - 4 * 60 * 1000),
      durationMs: 45000,
      recordsFetched: 1230,
      recordsProcessed: 1230,
      recordsInserted: 450,
      recordsUpdated: 780,
      status: 'SUCCESS',
    },
    {
      id: 'SYNC-2026-02-24-002',
      syncId: 'sync_1708873200',
      databaseType: 'mysql',
      syncType: 'INCREMENTAL',
      startTime: new Date(Date.now() - 65 * 60 * 1000),
      endTime: new Date(Date.now() - 64 * 60 * 1000),
      durationMs: 38000,
      recordsFetched: 980,
      recordsProcessed: 980,
      recordsInserted: 380,
      recordsUpdated: 600,
      status: 'SUCCESS',
    },
  ],

  // Timeline de detecções
  lastDetections: [
    {
      id: 'DET-2026-02-24-001',
      detectionId: 'det_1708876800',
      startTime: new Date(Date.now() - 4 * 60 * 1000),
      endTime: new Date(Date.now() - 3 * 60 * 1000),
      durationMs: 32000,
      recordsAnalyzed: 1230,
      alertsGenerated: 5,
      ghostCancellations: 2,
      pbmDeviations: 1,
      noSaleEvents: 1,
      cpfAbuses: 1,
      cashDiscrepancies: 0,
      status: 'SUCCESS',
    },
  ],
};

/**
 * Helper para retornar dados fake estruturados como tRPC response
 */
export function getMockKPIs() {
  return {
    success: true,
    data: mockData.kpis,
    timestamp: new Date(),
  };
}

export function getMockAlerts() {
  return {
    success: true,
    data: mockData.alerts,
    timestamp: new Date(),
  };
}

export function getMockOperators() {
  return {
    success: true,
    data: mockData.operators,
    timestamp: new Date(),
  };
}

export function getMockHighRiskOperators() {
  return {
    success: true,
    data: mockData.operators.filter((op) => op.riskScore > 150),
    timestamp: new Date(),
  };
}
