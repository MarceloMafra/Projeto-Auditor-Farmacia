import React from 'react';
import { AlertCircle, TrendingUp, Eye } from 'lucide-react';

interface Alert {
  id: string;
  alertType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  operatorName?: string;
  operatorCpf?: string;
  pdv?: string;
  status: string;
  createdAt: Date | string;
  riskScore?: number;
}

interface AlertsTableProps {
  alerts: Alert[];
  loading?: boolean;
  onAlertClick?: (alert: Alert) => void;
}

const severityColor = {
  LOW: 'text-blue-400 bg-blue-500/10',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10',
  HIGH: 'text-orange-400 bg-orange-500/10',
  CRITICAL: 'text-red-400 bg-red-500/10',
};

const alertTypeLabel = {
  GHOST_CANCELLATION: 'Cancelamento Fantasma',
  PBM_DEVIATION: 'Desvio PBM',
  NO_SALE: 'Sem Venda',
  CPF_ABUSE: 'Abuso de CPF',
  CASH_DISCREPANCY: 'Discrepância de Caixa',
};

export function AlertsTable({ alerts, loading = false, onAlertClick }: AlertsTableProps) {
  if (loading) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 text-center">
        <AlertCircle className="mx-auto text-slate-400 mb-2" size={32} />
        <p className="text-slate-400">Nenhum alerta encontrado</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <table className="w-full">
        <thead className="border-b border-slate-700 bg-slate-900/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Tipo</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Operador</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">PDV</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Severidade</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Risk Score</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Data</th>
            <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase">Ação</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700">
          {alerts.map((alert) => (
            <tr
              key={alert.id}
              className="hover:bg-slate-700/50 transition-colors"
            >
              <td className="px-6 py-4 text-sm text-slate-300">
                {alertTypeLabel[alert.alertType as keyof typeof alertTypeLabel] || alert.alertType}
              </td>
              <td className="px-6 py-4 text-sm text-slate-300">
                {alert.operatorName || '-'}
                {alert.operatorCpf && <div className="text-xs text-slate-500">{alert.operatorCpf}</div>}
              </td>
              <td className="px-6 py-4 text-sm text-slate-300">{alert.pdv || '-'}</td>
              <td className="px-6 py-4 text-sm">
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${severityColor[alert.severity]}`}>
                  {alert.severity}
                </span>
              </td>
              <td className="px-6 py-4 text-sm">
                <div className="flex items-center gap-1 text-slate-300">
                  <TrendingUp size={16} className="text-orange-400" />
                  {alert.riskScore || 0}
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-slate-400">
                {new Date(alert.createdAt).toLocaleDateString('pt-BR', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </td>
              <td className="px-6 py-4 text-center">
                <button
                  onClick={() => onAlertClick?.(alert)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded bg-slate-700 hover:bg-slate-600 transition-colors text-sm text-slate-300"
                >
                  <Eye size={16} />
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
