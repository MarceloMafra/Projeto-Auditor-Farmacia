import { useQuery } from '@tanstack/react-query';
import { trpc } from '../lib/trpc';

export interface DashboardKPIs {
  period: {
    from: Date;
    to: Date;
  };
  kpis: {
    pendingAlerts: number;
    highRiskOperators: number;
    cancellationRate: number;
    detectionsActive: number;
    avgInvestigationTime: number;
    accuracyRate: number;
    pharmaciesCovered: number;
    recoveredValue: number;
  };
}

export function useKPIs(dateFrom?: Date, dateTo?: Date) {
  return useQuery<DashboardKPIs>({
    queryKey: ['kpis', dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async () => {
      try {
        const result = await trpc.kpis.getDashboard.query({
          dateFrom,
          dateTo,
        });
        return result;
      } catch (error) {
        console.error('Erro ao buscar KPIs:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

export function useAlerts(dateFrom?: Date, dateTo?: Date) {
  return useQuery({
    queryKey: ['alerts', dateFrom?.toISOString(), dateTo?.toISOString()],
    queryFn: async () => {
      try {
        const result = await trpc.alerts.getAll.query({
          dateFrom,
          dateTo,
          limit: 10,
        });
        return result;
      } catch (error) {
        console.error('Erro ao buscar alertas:', error);
        return { alerts: [], total: 0 };
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });
}

export function useHighRiskOperators() {
  return useQuery({
    queryKey: ['highRiskOperators'],
    queryFn: async () => {
      try {
        const result = await trpc.operators.listHighRisk.query({
          limit: 5,
        });
        return result;
      } catch (error) {
        console.error('Erro ao buscar operadores de alto risco:', error);
        return { operators: [] };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}
