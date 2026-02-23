import { router } from './trpc';
import { healthRouter } from './routers/health';

/**
 * App Router - Agrupa todos os routers
 */
export const appRouter = router({
  health: healthRouter,
  // Adicionar mais routers aqui na Fase 1:
  // audit: auditRouter,
  // alerts: alertsRouter,
  // operators: operatorsRouter,
  // kpis: kpisRouter,
  // reports: reportsRouter,
  // notifications: notificationsRouter,
});

export type AppRouter = typeof appRouter;
