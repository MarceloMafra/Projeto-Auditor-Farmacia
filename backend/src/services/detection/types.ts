/**
 * Tipos compartilhados para módulos de detecção
 */

export interface DetectionResult {
  detectionType: string;
  alertsGenerated: number;
  processedRecords: number;
  duration: number; // em ms
  timestamp: Date;
  errors?: string[];
}

export interface FraudAlert {
  id: string;
  alertType: 'GHOST_CANCELLATION' | 'PBM_DEVIATION' | 'NO_SALE' | 'CPF_ABUSE' | 'CASH_DISCREPANCY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  operatorCpf: string;
  operatorName: string | null;
  pdv: string | null;
  pharmacy: string | null;
  saleId: string | null;
  cancellationId: string | null;
  saleAmount: number | null;
  saleTimestamp: Date | null;
  cancellationTimestamp: Date | null;
  delaySeconds: number | null;
  riskScore: number;
  evidence?: {
    cameraAvailable?: boolean;
    cameraUrl?: string;
    relatedAlerts?: number;
  };
}

export interface RiskScoreDetails {
  operatorCpf: string;
  ghostCancellations: number;
  pbmDeviations: number;
  noSaleEvents: number;
  cpfAbuseCount: number;
  cashDiscrepancies: number;
  totalScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// Constantes de scoring
export const RISK_SCORES = {
  GHOST_CANCELLATION: 30,
  PBM_DEVIATION: 40,
  NO_SALE: 20,
  CPF_ABUSE: 50,
  CASH_DISCREPANCY: 35,
};

export const RISK_LEVELS = {
  LOW: { min: 0, max: 50 },
  MEDIUM: { min: 51, max: 150 },
  HIGH: { min: 151, max: 300 },
  CRITICAL: { min: 301, max: Infinity },
};

export function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score <= RISK_LEVELS.LOW.max) return 'LOW';
  if (score <= RISK_LEVELS.MEDIUM.max) return 'MEDIUM';
  if (score <= RISK_LEVELS.HIGH.max) return 'HIGH';
  return 'CRITICAL';
}

export function getSeverityFromScore(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score <= 30) return 'LOW';
  if (score <= 50) return 'MEDIUM';
  if (score <= 80) return 'HIGH';
  return 'CRITICAL';
}
