import React, { useState } from 'react';
import { AlertCircle, Users, TrendingDown, Radio, RefreshCw } from 'lucide-react';
import { KPICard } from '../components/KPICard';
import { AlertsTable } from '../components/AlertsTable';
import { ChartCard } from '../components/ChartCard';
import { DateFilters } from '../components/DateFilters';
import { useKPIs, useAlerts, useHighRiskOperators } from '../hooks/useKPIs';

export default function Dashboard() {
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [refreshing, setRefreshing] = useState(false);

  const kpisQuery = useKPIs(dateFrom, dateTo);
  const alertsQuery = useAlerts(dateFrom, dateTo);
  const operatorsQuery = useHighRiskOperators();

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([kpisQuery.refetch(), alertsQuery.refetch(), operatorsQuery.refetch()]);
    setRefreshing(false);
  };

  const handleDateFilter = (from: Date, to: Date) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const kpiData = kpisQuery.data?.kpis;

  // Preparar dados para gráficos
  const alertTypeData = kpiData
    ? [
        { name: 'Alertas Pendentes', value: kpiData.pendingAlerts || 0 },
        { name: 'Alto Risco', value: kpiData.highRiskOperators || 0 },
      ]
    : [];

  const riskDistributionData = kpiData
    ? [
        { name: 'Baixo Risco', value: Math.max(0, 30 - (kpiData.highRiskOperators || 0)) },
        { name: 'Alto Risco', value: kpiData.highRiskOperators || 0 },
      ]
    : [];

  const alerts = alertsQuery.data?.alerts || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur border-b border-slate-800">
        <div className="px-6 py-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-50">Dashboard</h1>
              <p className="text-slate-400 mt-1">
                Monitoramento de fraudes em tempo real - {alerts.length} alertas recentes
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Filtros de Data */}
        <DateFilters onFilter={handleDateFilter} loading={kpisQuery.isLoading} />

        {/* Loading State */}
        {kpisQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-800 rounded-lg border border-slate-700 p-6 animate-pulse">
                <div className="h-4 bg-slate-700 rounded mb-4 w-1/2"></div>
                <div className="h-8 bg-slate-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* KPI Cards - 4 principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Alertas Pendentes"
                value={kpiData?.pendingAlerts || 0}
                description="Aguardando investigação"
                variant={kpiData?.pendingAlerts ? 'warning' : 'default'}
                icon={<AlertCircle size={24} />}
              />

              <KPICard
                title="Operadores Alto Risco"
                value={kpiData?.highRiskOperators || 0}
                unit={`de 30 operadores`}
                variant={kpiData?.highRiskOperators && kpiData.highRiskOperators > 5 ? 'critical' : 'default'}
                icon={<Users size={24} />}
              />

              <KPICard
                title="Taxa de Cancelamento"
                value={`${kpiData?.cancellationRate || 0}%`}
                description="Benchmark: <3%"
                variant={kpiData?.cancellationRate && kpiData.cancellationRate > 3 ? 'warning' : 'default'}
                icon={<TrendingDown size={24} />}
              />

              <KPICard
                title="Detecções Ativas"
                value={`${kpiData?.detectionsActive || 0}/6`}
                description="Módulos operacionais"
                variant={kpiData?.detectionsActive === 6 ? 'default' : 'warning'}
                icon={<Radio size={24} />}
              />
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard
                title="Distribuição de Alertas"
                data={alertTypeData}
                type="pie"
                dataKey="value"
                nameKey="name"
                colors={['#f59e0b', '#ef4444']}
              />

              <ChartCard
                title="Distribuição de Risco"
                data={riskDistributionData}
                type="pie"
                dataKey="value"
                nameKey="name"
                colors={['#10b981', '#ef4444']}
              />
            </div>

            {/* Tabela de Alertas Recentes */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-slate-50">Alertas Recentes</h2>
              <AlertsTable alerts={alerts} loading={alertsQuery.isLoading} />
            </div>

            {/* KPIs Secundários - 8 totais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Tempo Médio Investigação"
                value={`${kpiData?.avgInvestigationTime || 2}h`}
                description="Entre alerta e resolução"
              />

              <KPICard
                title="Taxa de Acurácia"
                value={`${kpiData?.accuracyRate || 0}%`}
                description="Benchmark: >80%"
                trend={kpiData?.accuracyRate && kpiData.accuracyRate > 80 ? 'up' : 'down'}
                trendValue={kpiData?.accuracyRate ? Math.abs((kpiData.accuracyRate || 0) - 80) : 0}
              />

              <KPICard
                title="Cobertura de Farmácias"
                value={`${kpiData?.pharmaciesCovered || 0}/30`}
                description="Lojas sincronizadas"
                variant={kpiData?.pharmaciesCovered === 30 ? 'default' : 'warning'}
              />

              <KPICard
                title="Valor Recuperado"
                value={`R$ ${(kpiData?.recoveredValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                description="Fraudes prevenidas"
                trend="up"
                trendValue={15}
              />
            </div>
          </>
        )}

        {/* Rodapé com informações */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 text-sm text-slate-400">
          <p>
            Dados atualizados em {new Date().toLocaleTimeString('pt-BR')} • Sistema operacional • Próxima sincronização em
            5 minutos
          </p>
        </div>
      </div>
    </div>
  );
}
