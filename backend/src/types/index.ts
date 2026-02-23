/**
 * Tipos compartilhados entre backend e frontend
 */

export enum AlertType {
  GHOST_CANCELLATION = 'GHOST_CANCELLATION',
  PBM_DEVIATION = 'PBM_DEVIATION',
  NO_SALE = 'NO_SALE',
  CPF_ABUSE = 'CPF_ABUSE',
  CASH_DISCREPANCY = 'CASH_DISCREPANCY',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  PENDING = 'Pending',
  INVESTIGATED = 'Investigado',
  FALSE_POSITIVE = 'Falso Positivo',
  FRAUD_CONFIRMED = 'Fraude Confirmada',
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Alert {
  id: string;
  alertType: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  idOperator: string;
  operatorName: string | null;
  pdv: string | null;
  pharmacy: string | null;
  saleId: string | null;
  cancellationId: string | null;
  saleAmount: number | null;
  saleTimestamp: Date | null;
  cancellationTimestamp: Date | null;
  delaySeconds: number | null;
  riskScore: number | null;
  evidence?: {
    cameraAvailable?: boolean;
    cameraUrl?: string;
    relatedAlerts?: number;
  };
  createdAt: Date;
  investigatedBy: number | null;
  investigationNotes: string | null;
}

export interface OperatorRiskProfile {
  idOperator: string;
  name: string;
  riskScore: number;
  riskLevel: RiskLevel;
  ghostCancellations: number;
  pbmDeviations: number;
  noSaleEvents: number;
  cpfAbuseCount: number;
  cashDiscrepancies: number;
  totalAlerts: number;
  calculatedAt: Date;
}

export interface Employee {
  cpf: string;
  name: string;
  hireDate: Date | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: Date;
  updatedAt: Date;
}

export interface KPI {
  pendingAlerts: number;
  highRiskOperators: number;
  cancellationRate: number;
  detectionsActive: number;
  avgInvestigationTime: number; // em horas
  accuracyRate: number; // percentual
  pharmaciesCovered: number;
  recoveredValue: number; // em reais
}

export interface DashboardData {
  kpis: KPI;
  recentAlerts: Alert[];
  topOperators: OperatorRiskProfile[];
  alertDistribution: {
    type: AlertType;
    count: number;
  }[];
}

export interface ExecutiveSummary {
  period: {
    from: Date;
    to: Date;
  };
  totalAlerts: number;
  alertsByType: Record<AlertType, number>;
  alertsBySeverity: Record<AlertSeverity, number>;
  alertsByStatus: Record<AlertStatus, number>;
  topOperators: OperatorRiskProfile[];
  estimatedLoss: number;
  recoveredValue: number;
  kpis: KPI;
  recommendations: string[];
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  smsEnabled: boolean;
  criticalAlertsOnly: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string;   // HH:MM
  };
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'Admin' | 'Analyst';
  createdAt: Date;
  updatedAt: Date;
}
