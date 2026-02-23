import { z } from 'zod';
import { AlertType, AlertSeverity, AlertStatus, RiskLevel } from '@/types';

/**
 * Schemas de validação reutilizáveis
 */

// Date range
export const dateRangeSchema = z.object({
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

// Alert filters
export const alertFiltersSchema = dateRangeSchema.extend({
  status: z.enum(['Pending', 'Investigado', 'Falso Positivo', 'Fraude Confirmada']).optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  alertType: z.enum(['GHOST_CANCELLATION', 'PBM_DEVIATION', 'NO_SALE', 'CPF_ABUSE', 'CASH_DISCREPANCY']).optional(),
  operatorCpf: z.string().length(11).optional(),
  limit: z.number().int().min(1).max(100).default(10),
  offset: z.number().int().min(0).default(0),
});

// Update alert status
export const updateAlertStatusSchema = z.object({
  alertId: z.string().min(1),
  status: z.enum(['Pending', 'Investigado', 'Falso Positivo', 'Fraude Confirmada']),
  notes: z.string().max(500).optional(),
});

// Operator profile
export const operatorProfileSchema = z.object({
  operatorCpf: z.string().length(11),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

// High risk operators filter
export const highRiskOperatorsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10),
  minRiskScore: z.number().int().min(0).default(150),
});

// Dashboard date filter
export const dashboardFiltersSchema = z.object({
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
});

// Report generation
export const reportGenerationSchema = z.object({
  dateFrom: z.date(),
  dateTo: z.date(),
  alertType: z.enum(['GHOST_CANCELLATION', 'PBM_DEVIATION', 'NO_SALE', 'CPF_ABUSE', 'CASH_DISCREPANCY']).optional(),
  status: z.enum(['Pending', 'Investigado', 'Falso Positivo', 'Fraude Confirmada']).optional(),
});

// Export CSV
export const exportCsvSchema = z.object({
  reportType: z.enum(['alerts', 'operators', 'kpis']),
  dateFrom: z.date(),
  dateTo: z.date(),
});

// Validate date range (dateTo must be after dateFrom)
export function validateDateRange(dateFrom?: Date, dateTo?: Date): boolean {
  if (!dateFrom || !dateTo) return true;
  return dateFrom < dateTo;
}
