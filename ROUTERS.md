# 📡 tRPC Routers - Referência Rápida

Guia rápido de todos os routers implementados no Auditor Digital.

---

## Resumo

**Total:** 7 routers, 25+ procedures, 1.870+ linhas de código

| Router | Procedures | Status | Linhas |
|--------|-----------|--------|--------|
| health | 2 | ✅ | 20 |
| audit | 4 | ✅ | 250 |
| alerts | 6 | ✅ | 350 |
| operators | 3 | ✅ | 280 |
| kpis | 2 | ✅ | 250 |
| reports | 3 | ✅ | 300 |
| notifications | 5 | ✅ | 250 |

---

## 1. Health Router

**Arquivo:** `backend/src/api/routers/health.ts`

```typescript
// Status da aplicação
GET /trpc/health.check
→ { status: 'ok', timestamp, environment }

// Status do banco de dados
GET /trpc/health.database
→ { status: 'connected|disconnected', timestamp }
```

---

## 2. Audit Router

**Arquivo:** `backend/src/api/routers/audit.ts`

Detecção de fraudes e investigação de operadores.

### Procedures

#### `audit.getAlertsByOperator` (Query)
Buscar alertas de um operador com filtros.

```typescript
const alerts = await trpc.audit.getAlertsByOperator.query({
  operatorCpf: '12345678901',
  dateFrom?: new Date(),
  dateTo?: new Date(),
  alertType?: 'GHOST_CANCELLATION',
  status?: 'Pending',
  limit?: 10,
  offset?: 0,
});
// → { alerts[], total, limit, offset }
```

#### `audit.getHighRiskOperators` (Query)
Operadores com score > 150, ranqueados.

```typescript
const ops = await trpc.audit.getHighRiskOperators.query({
  limit?: 10,
  minRiskScore?: 150,
});
// → [{ operatorCpf, operatorName, riskScore, riskLevel, alerts, calculatedAt }]
```

#### `audit.calculateRiskScores` (Mutation)
Recalcular scores para todos (bulk operation).

```typescript
const result = await trpc.audit.calculateRiskScores.mutate();
// → { processed, updated, message }
```

#### `audit.getAlertById` (Query)
Detalhes completos de um alerta.

```typescript
const alert = await trpc.audit.getAlertById.query({
  alertId: 'ALERT-2026-02-001',
});
// → { ...alert, operator, relatedAlerts[] }
```

---

## 3. Alerts Router

**Arquivo:** `backend/src/api/routers/alerts.ts`

Gerenciamento completo de alertas.

### Procedures

#### `alerts.getAll` (Query)
Listar alertas com múltiplos filtros.

```typescript
const result = await trpc.alerts.getAll.query({
  dateFrom?: new Date(),
  dateTo?: new Date(),
  status?: 'Pending|Investigado|Falso Positivo|Fraude Confirmada',
  severity?: 'LOW|MEDIUM|HIGH|CRITICAL',
  alertType?: 'GHOST_CANCELLATION|PBM_DEVIATION|NO_SALE|CPF_ABUSE|CASH_DISCREPANCY',
  operatorCpf?: '12345678901',
  limit?: 10,
  offset?: 0,
});
// → { alerts[], total, limit, offset }
```

#### `alerts.getById` (Query)
Obter alerta específico.

```typescript
const alert = await trpc.alerts.getById.query({
  id: 'ALERT-2026-02-001',
});
```

#### `alerts.updateStatus` (Mutation)
Marcar como investigado, falso positivo ou fraude confirmada.

```typescript
const updated = await trpc.alerts.updateStatus.mutate({
  alertId: 'ALERT-2026-02-001',
  status: 'Investigado|Falso Positivo|Fraude Confirmada',
  notes?: 'Verificado em câmera...',
});
// → updated alert
```

#### `alerts.countByStatus` (Query)
Contar alertas por status (para dashboard).

```typescript
const counts = await trpc.alerts.countByStatus.query();
// → { 'Pending': 5, 'Investigado': 10, ... }
```

#### `alerts.countBySeverity` (Query)
Contar por severidade.

```typescript
const counts = await trpc.alerts.countBySeverity.query();
// → { 'LOW': 5, 'MEDIUM': 10, 'HIGH': 15, 'CRITICAL': 3 }
```

#### `alerts.countByType` (Query)
Contar por tipo de fraude.

```typescript
const counts = await trpc.alerts.countByType.query();
// → { 'GHOST_CANCELLATION': 5, 'PBM_DEVIATION': 10, ... }
```

---

## 4. Operators Router

**Arquivo:** `backend/src/api/routers/operators.ts`

Perfil e histórico de operadores.

### Procedures

#### `operators.getProfile` (Query)
Perfil completo com risco e histórico de alertas.

```typescript
const profile = await trpc.operators.getProfile.query({
  operatorCpf: '12345678901',
  dateFrom?: new Date(),
  dateTo?: new Date(),
});
// → { operator, riskProfile, alerts }
```

#### `operators.listWithRiskScores` (Query)
Listar todos os operadores ranqueados.

```typescript
const list = await trpc.operators.listWithRiskScores.query({
  limit?: 20,
  offset?: 0,
  sortBy?: 'riskScore|name',
});
// → { operators[], total, limit, offset }
```

#### `operators.search` (Query)
Buscar por CPF ou nome.

```typescript
const results = await trpc.operators.search.query({
  query: '12345678901', // ou 'João Silva'
});
// → [{ cpf, name, status }]
```

---

## 5. KPIs Router

**Arquivo:** `backend/src/api/routers/kpis.ts`

Métricas para dashboard.

### Procedures

#### `kpis.getDashboard` (Query)
8 KPIs principais para visão executiva.

```typescript
const kpis = await trpc.kpis.getDashboard.query({
  dateFrom?: new Date(),
  dateTo?: new Date(),
});
// → {
//   period: { from, to },
//   kpis: {
//     pendingAlerts: number,
//     highRiskOperators: number,
//     cancellationRate: number,
//     detectionsActive: number,
//     avgInvestigationTime: number,
//     accuracyRate: number,
//     pharmaciesCovered: number,
//     recoveredValue: number
//   }
// }
```

#### `kpis.getTimeSeries` (Query)
Série temporal de um KPI (últimos 30 dias).

```typescript
const series = await trpc.kpis.getTimeSeries.query({
  metric: 'alertsCreated|fraudConfirmed|investigationTime|riskScoreEvolution',
  interval?: 'daily|weekly',
});
// → { metric, interval, data[] }
```

---

## 6. Reports Router

**Arquivo:** `backend/src/api/routers/reports.ts`

Geração de relatórios e exportações.

### Procedures

#### `reports.generateExecutiveSummary` (Query)
Sumário executivo com recomendações.

```typescript
const summary = await trpc.reports.generateExecutiveSummary.query({
  dateFrom: new Date(),
  dateTo: new Date(),
  alertType?: 'GHOST_CANCELLATION',
  status?: 'Fraude Confirmada',
});
// → {
//   period,
//   summary: { totalAlerts, alertsByType, alertsBySeverity, ... },
//   topOperators[],
//   recommendations[],
//   generatedAt
// }
```

#### `reports.generateAlertReport` (Query)
Relatório detalhado de alertas (até 1000).

```typescript
const report = await trpc.reports.generateAlertReport.query({
  dateFrom: new Date(),
  dateTo: new Date(),
  alertType?: 'PBM_DEVIATION',
  status?: 'Investigado',
});
// → { period, alerts[], totalCount, generatedAt }
```

#### `reports.exportToCSV` (Mutation)
Exportar para CSV no S3.

```typescript
const export = await trpc.reports.exportToCSV.mutate({
  reportType: 'alerts|operators|kpis',
  dateFrom: new Date(),
  dateTo: new Date(),
});
// → { success, url, filename, message }
```

---

## 7. Notifications Router

**Arquivo:** `backend/src/api/routers/notifications.ts`

Preferências e gerenciamento de notificações.

### Procedures

#### `notifications.getPreferences` (Query)
Preferências do usuário logado.

```typescript
const prefs = await trpc.notifications.getPreferences.query();
// → {
//   userId,
//   emailEnabled: boolean,
//   smsEnabled: boolean,
//   criticalAlertsOnly: boolean,
//   quietHours: { enabled, start: 'HH:MM', end: 'HH:MM' },
//   notificationFilters: { onlyAlertTypes[], onlySeverity[] }
// }
```

#### `notifications.updatePreferences` (Mutation)
Atualizar preferências.

```typescript
const updated = await trpc.notifications.updatePreferences.mutate({
  emailEnabled?: boolean,
  smsEnabled?: boolean,
  criticalAlertsOnly?: boolean,
  quietHours?: { enabled: boolean, start: 'HH:MM', end: 'HH:MM' },
});
// → { success, message, preferences }
```

#### `notifications.sendTest` (Mutation)
Enviar notificação de teste.

```typescript
const result = await trpc.notifications.sendTest.mutate({
  channels?: ['email', 'sms'],
});
// → { success, results[], timestamp }
```

#### `notifications.getHistory` (Query)
Histórico de notificações (últimas 20).

```typescript
const history = await trpc.notifications.getHistory.query({
  limit?: 20,
  offset?: 0,
});
// → { notifications[], total, limit, offset }
```

#### `notifications.markAsRead` (Mutation)
Marcar notificação como lida.

```typescript
const result = await trpc.notifications.markAsRead.mutate({
  notificationId: 'NOT-001',
});
// → { success, message }
```

---

## Validações Zod

**Arquivo:** `backend/src/api/validations.ts`

Schemas reutilizáveis para todas as validações:

- `dateRangeSchema` - Data inicial e final
- `alertFiltersSchema` - Filtros completos de alertas
- `updateAlertStatusSchema` - Atualizar status
- `operatorProfileSchema` - Buscar operador
- `highRiskOperatorsSchema` - Filtro de alto risco
- `dashboardFiltersSchema` - Filtros do dashboard
- `reportGenerationSchema` - Parâmetros de relatório
- `exportCsvSchema` - Parâmetros de exportação

---

## Uso no Frontend

### Com React Query

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../backend/src/api/router';

const trpc = createTRPCReact<AppRouter>();

function DashboardPage() {
  // Query com hook
  const { data: kpis, isLoading, error } = trpc.kpis.getDashboard.useQuery({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  });

  // Mutation com hook
  const { mutate: updateAlert } = trpc.alerts.updateStatus.useMutation({
    onSuccess: (data) => console.log('Alerta atualizado:', data),
  });

  return (
    <>
      {isLoading && <p>Carregando...</p>}
      {error && <p>Erro: {error.message}</p>}
      {kpis && <KPICards kpis={kpis.kpis} />}

      <button onClick={() => updateAlert({
        alertId: 'ALERT-001',
        status: 'Investigado',
      })}>
        Marcar como Investigado
      </button>
    </>
  );
}
```

---

## Error Handling

Todos os routers retornam erros estruturados:

```typescript
try {
  const result = await trpc.alerts.getAll.query(filter);
} catch (error) {
  if (error.code === 'BAD_REQUEST') {
    // Validação falhou
  } else if (error.code === 'UNAUTHORIZED') {
    // Usuário não autenticado
  } else if (error.code === 'NOT_FOUND') {
    // Recurso não encontrado
  } else if (error.code === 'INTERNAL_SERVER_ERROR') {
    // Erro no servidor
  }
}
```

---

## Performance

- ✅ Queries otimizadas com Drizzle ORM
- ✅ Índices em campos críticos
- ✅ Joins eficientes
- ✅ Aggregações com GROUP BY
- ✅ Paginação para grandes datasets
- ✅ Connection pooling (10-20 conexões)

---

## Documentação Completa

Para documentação detalhada de cada router, veja:
- `backend/src/api/README.md` - Documentação completa com exemplos

---

**Versão:** 1.0.0
**Data:** Fevereiro 2026
**Status:** ✅ Implementação Completa (85% da Fase 1)
