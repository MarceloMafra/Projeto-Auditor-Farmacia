import { Router, Route } from 'wouter';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Navbar } from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Alerts from './pages/Alerts';
import Operators from './pages/Operators';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-slate-950 text-slate-50">
          <Navbar />

          {/* Conteúdo das páginas */}
          <Route path="/" component={Dashboard} />
          <Route path="/alerts" component={Alerts} />
          <Route path="/operators" component={Operators} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />

          {/* 404 - Página não encontrada */}
          <Route>
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-2">404</h1>
                <p className="text-slate-400">Página não encontrada</p>
              </div>
            </div>
          </Route>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
