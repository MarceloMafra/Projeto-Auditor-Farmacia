import React from 'react';
import { useLocation } from 'wouter';
import { LayoutDashboard, AlertCircle, Users, FileText, Settings } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Alertas', path: '/alerts', icon: AlertCircle },
  { label: 'Operadores', path: '/operators', icon: Users },
  { label: 'Relatórios', path: '/reports', icon: FileText },
  { label: 'Configurações', path: '/settings', icon: Settings },
];

export function Navbar() {
  const [location] = useLocation();

  return (
    <nav className="bg-slate-900/80 backdrop-blur border-b border-slate-800 sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div className="flex items-center gap-2 font-bold text-lg text-slate-50 min-w-max">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <AlertCircle size={20} />
            </div>
            Auditor Digital
          </div>

          {/* Nav Items */}
          <div className="flex gap-1 flex-wrap">
            {navItems.map(({ label, path, icon: Icon }) => (
              <a
                key={path}
                href={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium text-sm ${
                  location === path
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-slate-50'
                }`}
              >
                <Icon size={18} />
                {label}
              </a>
            ))}
          </div>

          {/* User Info */}
          <div className="ml-auto flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
              AD
            </div>
            <div className="text-sm">
              <p className="text-slate-50 font-medium">Analista</p>
              <p className="text-slate-400 text-xs">Conectado</p>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
