import { router } from './trpc';
import { healthRouter } from './routers/health';
import { auditRouter } from './routers/audit';
import { alertsRouter } from './routers/alerts';
import { operatorsRouter } from './routers/operators';
import { kpisRouter } from './routers/kpis';
import { reportsRouter } from './routers/reports';
import { notificationsRouter } from './routers/notifications';
import { detectionRouter } from './routers/detection';
import { erpRouter } from './routers/erp';

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
 * - detection: Execução sob demanda e status dos módulos de detecção
 * - erp: Integração e sincronização com sistemas ERP
 */
export const appRouter = router({
  health: healthRouter,
  audit: auditRouter,
  alerts: alertsRouter,
  operators: operatorsRouter,
  kpis: kpisRouter,
  reports: reportsRouter,
  notifications: notificationsRouter,
  detection: detectionRouter,
  erp: erpRouter,
});

export type AppRouter = typeof appRouter;
