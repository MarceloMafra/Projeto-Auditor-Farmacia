import { router } from './trpc';
import { healthRouter } from './routers/health';
import { auditRouter } from './routers/audit';
import { alertsRouter } from './routers/alerts';
import { operatorsRouter } from './routers/operators';
import { kpisRouter } from './routers/kpis';
import { reportsRouter } from './routers/reports';
import { notificationsRouter } from './routers/notifications';

/**
 * App Router - Agrupa todos os routers da aplicação
 *
 * Routers disponíveis:
 * - health: Status da aplicação e banco de dados
 * - audit: Detecção de fraudes e investigação
 * - alerts: Gerenciamento de alertas
 * - operators: Perfil e histórico de operadores
 * - kpis: Métricas para dashboard
 * - reports: Geração de relatórios
 * - notifications: Preferências e histórico de notificações
 */
export const appRouter = router({
  health: healthRouter,
  audit: auditRouter,
  alerts: alertsRouter,
  operators: operatorsRouter,
  kpis: kpisRouter,
  reports: reportsRouter,
  notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
