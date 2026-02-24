import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';

interface DateFiltersProps {
  onFilter: (dateFrom: Date, dateTo: Date) => void;
  loading?: boolean;
}

export function DateFilters({ onFilter, loading = false }: DateFiltersProps) {
  const today = new Date();
  const [activePreset, setActivePreset] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const getDateRange = (preset: string): [Date, Date] => {
    const now = new Date();
    const from = new Date(now);

    switch (preset) {
      case '7d':
        from.setDate(from.getDate() - 7);
        break;
      case '30d':
        from.setDate(from.getDate() - 30);
        break;
      case '90d':
        from.setDate(from.getDate() - 90);
        break;
      default:
        return [from, now];
    }

    return [from, now];
  };

  const handlePreset = (preset: '7d' | '30d' | '90d') => {
    setActivePreset(preset);
    const [from, to] = getDateRange(preset);
    onFilter(from, to);
  };

  const handleCustomFilter = () => {
    if (customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);

      if (from <= to) {
        setActivePreset('custom');
        onFilter(from, to);
      }
    }
  };

  const handleClear = () => {
    setCustomFrom('');
    setCustomTo('');
    setActivePreset('30d');
    const [from, to] = getDateRange('30d');
    onFilter(from, to);
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        {/* Presets */}
        <div className="flex gap-2">
          <button
            onClick={() => handlePreset('7d')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activePreset === '7d'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            disabled={loading}
          >
            Últimos 7 dias
          </button>
          <button
            onClick={() => handlePreset('30d')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activePreset === '30d'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            disabled={loading}
          >
            Últimos 30 dias
          </button>
          <button
            onClick={() => handlePreset('90d')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              activePreset === '90d'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            disabled={loading}
          >
            Últimos 90 dias
          </button>
        </div>

        {/* Custom Date Range */}
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex gap-1 items-center">
            <Calendar size={16} className="text-slate-400" />
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-2 rounded bg-slate-700 border border-slate-600 text-slate-300 text-sm"
              disabled={loading}
            />
          </div>

          <span className="text-slate-400">até</span>

          <div className="flex gap-1 items-center">
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-2 rounded bg-slate-700 border border-slate-600 text-slate-300 text-sm"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleCustomFilter}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            disabled={loading || !customFrom || !customTo}
          >
            Filtrar
          </button>

          {(customFrom || customTo) && (
            <button
              onClick={handleClear}
              className="p-2 rounded hover:bg-slate-700 transition-colors"
              disabled={loading}
            >
              <X size={16} className="text-slate-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
