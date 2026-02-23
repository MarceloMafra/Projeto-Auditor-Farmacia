# tRPC API Documentation

Documentação dos routers tRPC disponíveis no Auditor Digital.

---

## Routers

### 1. Health Router
Status da aplicação e conexão com banco de dados.

```typescript
// GET http://localhost:3000/trpc/health.check
GET /trpc/health.check
// Response: { status: 'ok', timestamp, environment }

// GET http://localhost:3000/trpc/health.database
GET /trpc/health.database
// Response: { status: 'connected' | 'disconnected', timestamp }
```

---

### 2. Audit Router
Detecção de fraudes e investigação de operadores.

#### `audit.getAlertsByOperator`
Obter alertas de um operador específico.

```typescript
input: {
  operatorCpf: string        // 11 dígitos
  dateFrom?: Date
  dateTo?: Date
  alertType?: string         // GHOST_CANCELLATION | PBM_DEVIATION | ...
  status?: string            // Pending | Investigado | ...
  limit?: number             // 1-100, default: 10
  offset?: number            // default: 0
}

// Exemplo
const alerts = await trpc.audit.getAlertsByOperator.query({
  operatorCpf: '12345678901',
  dateFrom: new Date('2026-01-01'),
  dateTo: new Date('2026-02-23'),
  limit: 20,
});
```

#### `audit.getHighRiskOperators`
Obter operadores com alto risco (risk score > 150).

```typescript
input: {
  limit?: number             // 1-100, default: 10
  minRiskScore?: number      // default: 150
}

// Exemplo
const operators = await trpc.audit.getHighRiskOperators.query({
  limit: 5,
  minRiskScore: 200,
});
```

#### `audit.calculateRiskScores`
Recalcular risk scores para todos os operadores (mutation).

```typescript
// Exemplo
const result = await trpc.audit.calculateRiskScores.mutate();
// Response: { processed: number, updated: number }
```

#### `audit.getAlertById`
Obter detalhes completos de um alerta.

```typescript
input: {
  alertId: string            // ID do alerta (ALERT-YYYY-MM-###)
}

// Exemplo
const alert = await trpc.audit.getAlertById.query({
  alertId: 'ALERT-2026-02-001',
});
// Response: { ...alert, operator, relatedAlerts[] }
```

---

### 3. Alerts Router
Gerenciamento de alertas gerados pelo sistema.

#### `alerts.getAll`
Listar alertas com filtros.

```typescript
input: {
  dateFrom?: Date
  dateTo?: Date
  status?: 'Pending' | 'Investigado' | 'Falso Positivo' | 'Fraude Confirmada'
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  alertType?: 'GHOST_CANCELLATION' | 'PBM_DEVIATION' | ...
  operatorCpf?: string
  limit?: number             // 1-100, default: 10
  offset?: number
}

// Exemplo
const result = await trpc.alerts.getAll.query({
  status: 'Pending',
  severity: 'CRITICAL',
  limit: 50,
});
```

#### `alerts.getById`
Obter alerta por ID.

```typescript
input: {
  id: string
}
```

#### `alerts.updateStatus`
Atualizar status de investigação (mutation).

```typescript
input: {
  alertId: string
  status: 'Pending' | 'Investigado' | 'Falso Positivo' | 'Fraude Confirmada'
  notes?: string             // até 500 caracteres
}

// Exemplo
const updated = await trpc.alerts.updateStatus.mutate({
  alertId: 'ALERT-2026-02-001',
  status: 'Investigado',
  notes: 'Verificado em câmera. Confirmado fraude.',
});
```

#### `alerts.countByStatus`
Contar alertas por status (para dashboard).

```typescript
// Exemplo
const counts = await trpc.alerts.countByStatus.query();
// Response: { Pending: 5, Investigado: 10, 'Falso Positivo': 2, ... }
```

#### `alerts.countBySeverity`
Contar alertas por severidade.

```typescript
// Exemplo
const counts = await trpc.alerts.countBySeverity.query();
// Response: { LOW: 5, MEDIUM: 10, HIGH: 15, CRITICAL: 3 }
```

#### `alerts.countByType`
Contar alertas por tipo de fraude.

```typescript
// Exemplo
const counts = await trpc.alerts.countByType.query();
// Response: { GHOST_CANCELLATION: 5, PBM_DEVIATION: 10, ... }
```

---

### 4. Operators Router
Perfil e histórico de operadores.

#### `operators.getProfile`
Obter perfil completo de um operador.

```typescript
input: {
  operatorCpf: string
  dateFrom?: Date
  dateTo?: Date
}

// Exemplo
const profile = await trpc.operators.getProfile.query({
  operatorCpf: '12345678901',
  dateFrom: new Date('2026-01-01'),
  dateTo: new Date('2026-02-23'),
});
// Response: { operator, riskProfile, alerts }
```

#### `operators.listWithRiskScores`
Listar operadores com risk scores (ranqueados).

```typescript
input: {
  limit?: number             // 1-100, default: 20
  offset?: number            // default: 0
  sortBy?: 'riskScore' | 'name'  // default: riskScore
}

// Exemplo
const list = await trpc.operators.listWithRiskScores.query({
  limit: 10,
  sortBy: 'riskScore',
});
```

#### `operators.search`
Buscar operador por nome ou CPF.

```typescript
input: {
  query: string              // CPF (11 dígitos) ou nome
}

// Exemplo
const results = await trpc.operators.search.query({
  query: '12345678901',  // ou 'João Silva'
});
```

---

### 5. KPIs Router
Métricas para dashboard.

#### `kpis.getDashboard`
Obter 8 KPIs principais.

```typescript
input: {
  dateFrom?: Date            // default: últimos 30 dias
  dateTo?: Date
}

// Exemplo
const kpis = await trpc.kpis.getDashboard.query({
  dateFrom: new Date('2026-02-01'),
  dateTo: new Date('2026-02-23'),
});
// Response: {
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

#### `kpis.getTimeSeries`
Obter série temporal de um KPI.

```typescript
input: {
  metric: 'alertsCreated' | 'fraudConfirmed' | 'investigationTime' | 'riskScoreEvolution'
  interval?: 'daily' | 'weekly'  // default: daily
}
```

---

### 6. Reports Router
Geração de relatórios.

#### `reports.generateExecutiveSummary`
Gerar sumário executivo.

```typescript
input: {
  dateFrom: Date
  dateTo: Date
  alertType?: string
  status?: string
}

// Exemplo
const summary = await trpc.reports.generateExecutiveSummary.query({
  dateFrom: new Date('2026-02-01'),
  dateTo: new Date('2026-02-23'),
});
```

#### `reports.generateAlertReport`
Gerar relatório detalhado de alertas.

```typescript
input: {
  dateFrom: Date
  dateTo: Date
  alertType?: string
  status?: string
}
```

#### `reports.exportToCSV`
Exportar dados em CSV (mutation).

```typescript
input: {
  reportType: 'alerts' | 'operators' | 'kpis'
  dateFrom: Date
  dateTo: Date
}

// Exemplo
const export = await trpc.reports.exportToCSV.mutate({
  reportType: 'alerts',
  dateFrom: new Date('2026-02-01'),
  dateTo: new Date('2026-02-23'),
});
// Response: { success, url, filename }
```

---

### 7. Notifications Router
Preferências e notificações.

#### `notifications.getPreferences`
Obter preferências do usuário.

```typescript
// Exemplo
const prefs = await trpc.notifications.getPreferences.query();
```

#### `notifications.updatePreferences`
Atualizar preferências (mutation).

```typescript
input: {
  emailEnabled?: boolean
  smsEnabled?: boolean
  criticalAlertsOnly?: boolean
  quietHours?: { enabled, start, end }  // HH:MM format
}
```

#### `notifications.sendTest`
Enviar notificação de teste (mutation).

```typescript
input: {
  channels?: ['email'] | ['sms'] | ['email', 'sms']
}
```

#### `notifications.getHistory`
Obter histórico de notificações.

```typescript
input: {
  limit?: number             // 1-100, default: 20
  offset?: number
}
```

---

## Autenticação

Todos os routers (exceto `health`) requerem autenticação OAuth 2.0.

```typescript
// Middleware automático em protectedProcedure
// Sessão deve conter user: { id, email, role }
```

---

## Tratamento de Erros

Todos os routers retornam erros estruturados tRPC:

```typescript
// Erro esperado
{
  code: 'BAD_REQUEST',
  message: 'Descrição do erro',
  data: { /* contexto adicional */ }
}

// Exemplos de códigos:
// - BAD_REQUEST (400)
// - UNAUTHORIZED (401)
// - FORBIDDEN (403)
// - NOT_FOUND (404)
// - INTERNAL_SERVER_ERROR (500)
```

---

## Exemplo de Uso no Frontend

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../backend/src/api/router';

const trpc = createTRPCReact<AppRouter>();

function Dashboard() {
  // Query: Obter KPIs
  const { data: kpis, isLoading } = trpc.kpis.getDashboard.useQuery({
    dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  });

  // Mutation: Atualizar status de alerta
  const { mutate: updateStatus } = trpc.alerts.updateStatus.useMutation();

  return (
    <div>
      {isLoading ? <p>Carregando...</p> : <p>KPIs: {JSON.stringify(kpis)}</p>}
      <button
        onClick={() =>
          updateStatus({
            alertId: 'ALERT-001',
            status: 'Investigado',
            notes: 'Verificado',
          })
        }
      >
        Marcar como Investigado
      </button>
    </div>
  );
}
```

---

## Status da Implementação

| Router | Status | Notas |
|--------|--------|-------|
| health | ✅ Completo | Basic implementation |
| audit | ✅ 90% | `calculateRiskScores` precisa lógica real |
| alerts | ✅ Completo | |
| operators | ✅ 90% | Busca por nome ainda é placeholder |
| kpis | ✅ 80% | Alguns KPIs ainda são placeholders |
| reports | ✅ 80% | Exportação real precisa S3 integration |
| notifications | ✅ 60% | Placeholder completo, necessita integração email/SMS |

---

**Última atualização:** Fevereiro 2026
**Versão:** 1.0.0
