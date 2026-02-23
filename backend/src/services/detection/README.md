# Detection Engine Documentation

## Overview

The Detection Engine is a parallel fraud detection system that monitors 5 different types of pharmacy fraud in real-time and calculates aggregated risk scores for operators.

**Total Risk Score Formula:**
```
Risk Score = (Ghost × 30) + (PBM × 40) + (NoSale × 20) + (CPF × 50) + (CashDisc × 35)
```

**Risk Levels:**
- **LOW** (0-50): Green - Normal operations
- **MEDIUM** (51-150): Yellow - Monitor
- **HIGH** (151-300): Orange - Investigation recommended
- **CRITICAL** (301+): Red - Immediate action required

---

## Modules

### 1. Ghost Cancellation Detection

**File:** `ghostCancellation.ts`

**What it detects:** Cancellations that occur more than 60 seconds after the sale was completed, indicating the customer likely left the store before receiving the refund (gaveta cega pattern).

**How it works:**
1. Queries all sales from the last 30 days
2. For each sale, looks for matching cancellations
3. Calculates the delay between sale completion and cancellation
4. Flags any cancellation > 60 seconds as a ghost cancellation
5. Generates fraud alert with risk score +30

**Key Thresholds:**
- DELAY_THRESHOLD: 60 seconds

**Risk Score:** +30 per occurrence

**Example Alert:**
```
Alert Type: GHOST_CANCELLATION
Severity: HIGH
Operator: João Silva (CPF: 123.456.789-00)
Delay: 125 seconds
Sale Amount: R$ 85.50
```

---

### 2. PBM Deviation Detection

**File:** `pbmDeviation.ts`

**What it detects:** PBM (insurance plan) authorizations that are approved but don't have a corresponding sale in the same PDV within a 5-minute window, indicating possible credit deviation or inventory loss.

**How it works:**
1. Queries all approved PBM authorizations from the last 30 days
2. For each authorization, searches for matching sales in the same PDV
3. Checks if a sale exists within 5 minutes of the authorization
4. If no matching sale is found, generates a fraud alert
5. Risk score +40

**Key Thresholds:**
- TIME_WINDOW: 300 seconds (5 minutes)
- Looks for APPROVED status only

**Risk Score:** +40 per occurrence

**Example Alert:**
```
Alert Type: PBM_DEVIATION
Severity: HIGH
Plan: UNIMED
Amount: R$ 250.00
Authorization Time: 2024-01-15 10:30:45
No matching sale found within 5 minutes
```

---

### 3. No Sale / Gaveta Cega Detection

**File:** `noSale.ts`

**What it detects:** Drawer opens without any corresponding transaction, indicating possible cash theft or undeclared sales (gaveta cega - "blind drawer").

**How it works:**
1. Queries all DRAWER_OPEN_NO_SALE events from the last 30 days
2. Groups events by operator, date, and shift:
   - Morning: 06:00-12:00
   - Afternoon: 12:00-18:00
   - Night: 18:00-06:00 (next day)
3. Counts events per shift
4. If count > 3 events per shift, generates a fraud alert
5. Risk score calculation: 20 points per event (max 60 per shift)

**Key Thresholds:**
- RISK_THRESHOLD: 3 events per shift
- MAX_RISK_SCORE: 60 per shift

**Risk Score:** +20 per event (capped at +60)

**Example Alert:**
```
Alert Type: NO_SALE
Severity: MEDIUM
Operator: Maria Santos (CPF: 987.654.321-00)
Shift: Tarde (12:00-18:00)
Event Count: 5 drawer opens
Risk Score: 60
```

---

### 4. CPF Abuse Detection

**File:** `cpfAbuse.ts`

**What it detects:** Same CPF used in multiple sales by the same operator for loyalty point fraud, especially when it's an employee's CPF.

**How it works:**
1. Queries all sales with customer CPF from the last 30 days
2. Groups sales by CPF
3. For each CPF, checks if it belongs to an employee (validation)
4. Groups sales by operator
5. Determines threshold:
   - Employee CPF: >10 sales (CRITICAL severity)
   - Customer CPF: >20 sales (HIGH severity)
6. If threshold exceeded, generates fraud alert
7. Risk score +50

**Key Thresholds:**
- EMPLOYEE_CPF_THRESHOLD: 10 sales
- CUSTOMER_CPF_THRESHOLD: 20 sales

**Risk Score:** +50 per occurrence (CRITICAL if employee CPF)

**Example Alert:**
```
Alert Type: CPF_ABUSE
Severity: CRITICAL
Operator: Pedro Costa (CPF: 111.222.333-44)
CPF Used: 555.666.777-88 (EMPLOYEE - Carlos Alberto)
Sales Count: 35
Total Amount: R$ 1,250.00
```

---

### 5. Cash Discrepancy Detection

**File:** `cashDiscrepancy.ts`

**What it detects:** Significant differences between expected and actual cash in the register, indicating possible theft or miscount.

**How it works:**
1. Queries all cash discrepancies from the last 30 days
2. Calculates absolute discrepancy amount
3. Determines severity based on amount:
   - LOW: < R$ 50
   - MEDIUM: R$ 50 - R$ 200
   - HIGH: R$ 200 - R$ 500
   - CRITICAL: ≥ R$ 500
4. Generates fraud alert with appropriate severity
5. Risk score +35

**Key Thresholds:**
- DISCREPANCY_THRESHOLD: R$ 10 (minimum to flag)
- Severity tiers as shown above

**Risk Score:** +35 per occurrence

**Example Alert:**
```
Alert Type: CASH_DISCREPANCY
Severity: CRITICAL
PDV: 101 (Farmácia 1)
Discrepancy Amount: R$ 650.00 (missing)
Discrepancy Date: 2024-01-15 17:30
```

---

### 6. Risk Score Calculation

**File:** `riskScoreCalculation.ts`

**What it does:** Aggregates all fraud alerts by operator and calculates a total risk score.

**How it works:**
1. Fetches all employees from the database
2. Groups all alerts from the last 30 days by operator
3. For each operator, counts alerts by type:
   - ghostCancellations
   - pbmDeviations
   - noSaleEvents
   - cpfAbuseCount
   - cashDiscrepancies
4. Calculates total risk score using formula above
5. Determines risk level (LOW/MEDIUM/HIGH/CRITICAL)
6. Updates or inserts into `tb_operator_risk_score` table
7. Stores detailed counts for each alert type

**Output:**
```
{
  operatorCpf: "123.456.789-00",
  operatorName: "João Silva",
  ghostCancellations: 2,
  pbmDeviations: 1,
  noSaleEvents: 5,
  cpfAbuseCount: 0,
  cashDiscrepancies: 1,
  totalScore: 185,  // (2×30) + (1×40) + (5×20) + (0×50) + (1×35) = 185
  riskLevel: "HIGH"
}
```

---

## Detection Orchestrator

**File:** `index.ts`

**Main Function:** `runDetectionEngine(db, dateFrom?)`

**What it does:**
1. Executes all 5 detection modules in **parallel** using `Promise.all()`
2. Handles errors from each module gracefully (doesn't stop others)
3. Calls `calculateRiskScores()` after all detections complete
4. Consolidates results into a single report
5. Returns comprehensive execution metrics

**Return Value:**
```typescript
{
  success: boolean;
  totalDuration: number;  // milliseconds
  timestamp: Date;
  results: DetectionResult[];
  totalAlertsGenerated: number;
  summary: {
    ghostCancellations: number;
    pbmDeviations: number;
    noSale: number;
    cpfAbuse: number;
    cashDiscrepancies: number;
    riskScoreUpdate: number;  // operators updated
  };
  errors?: string[];
}
```

**Performance:**
- Runs all modules in parallel (much faster than sequential)
- Typical execution time: 2-5 seconds for 30 pharmacies
- Handles graceful degradation (if one module fails, others continue)

---

## Integration Points

### 1. Batch Job (Scheduled)

**File:** `backend/src/jobs/enrichmentJob.ts`

Runs automatically at **03:00 AM daily** via cron job.

```typescript
// Scheduled via node-schedule or similar
schedule.scheduleJob('0 3 * * *', async () => {
  const result = await runEnrichmentJob(db);
});
```

### 2. tRPC Router (On-Demand)

**File:** `backend/src/api/routers/detection.ts`

Provides 3 API endpoints:

#### `detection.runNow`
Manually trigger detection (admin only)
```typescript
// Request
{
  daysBack: 30  // Optional, default 30
}

// Response
{
  success: true,
  message: "Detecção concluída com 42 fraudes detectadas",
  data: {
    totalAlertsGenerated: 42,
    totalDuration: 3421,
    summary: {...},
    timestamp: "2024-01-15T10:30:00Z"
  }
}
```

#### `detection.getLastRun`
Get results from last execution
```typescript
// Response
{
  result: {
    totalAlertsGenerated: 42,
    totalDuration: 3421,
    summary: {...},
    timestamp: "2024-01-15T03:00:00Z",
    success: true
  },
  triggeredBy: "user-id",
  triggeredAt: "2024-01-15T03:00:00Z",
  isManual: false
}
```

#### `detection.getStatus`
Get current detection system status
```typescript
// Response
{
  running: false,
  lastRun: {
    timestamp: "2024-01-15T03:00:00Z",
    isManual: false
  },
  nextScheduledRun: {
    time: "03:00 AM",
    timezone: "America/Sao_Paulo",
    frequency: "Diariamente"
  },
  modules: [
    {
      name: "Ghost Cancellation",
      description: "Detecção de devoluções fantasma",
      status: "active",
      riskScore: 30
    },
    // ... other modules
  ]
}
```

---

## Usage Examples

### Manual Execution in Backend Code

```typescript
import { Database } from '@/db';
import { runDetectionEngine } from '@/services/detection';

const db = await getDb();

// Run for last 30 days
const result = await runDetectionEngine(db);

// Run for specific date range
const dateFrom = new Date('2024-01-01');
const result = await runDetectionEngine(db, dateFrom);

if (result.success) {
  console.log(`Detectadas ${result.totalAlertsGenerated} fraudes`);
  console.log(`Operadores críticos: ${result.summary.riskScoreUpdate}`);
}
```

### Via tRPC Frontend

```typescript
// Request
const result = await client.detection.runNow.mutate({
  daysBack: 7  // Last week
});

// Response
{
  success: true,
  message: "Detecção concluída com 42 fraudes detectadas",
  data: {
    totalAlertsGenerated: 42,
    totalDuration: 3421,
    ...
  }
}

// Get status
const status = await client.detection.getStatus.query();
console.log(`Sistema rodando: ${status.running}`);
```

---

## Performance Notes

- **Parallel Execution:** All 5 modules run simultaneously, reducing total time from ~10s to ~3s
- **Database Queries:** Uses efficient Drizzle ORM queries with proper indices
- **Memory:** Streams large result sets instead of loading all at once
- **Scalability:** Can handle 50+ pharmacies with thousands of daily transactions

---

## Testing

To test the detection modules with real data:

```bash
# 1. Seed database with realistic test data
npx ts-node backend/scripts/seed.ts

# 2. Run detection manually
npx ts-node -e "
  import { getDb } from '@/db';
  import { runDetectionEngine } from '@/services/detection';
  const db = await getDb();
  const result = await runDetectionEngine(db);
  console.log(JSON.stringify(result, null, 2));
"

# 3. Verify results in database
# SELECT * FROM tb_operator_risk_score WHERE risk_level = 'CRITICAL';
```

---

## Error Handling

Each module has graceful error handling:

```typescript
// Module fails but doesn't crash orchestrator
try {
  const result = await detectGhostCancellations(db);
} catch (error) {
  // Returns error object instead of throwing
  return {
    detectionType: 'GHOST_CANCELLATION',
    alertsGenerated: 0,
    errors: [error.message]
  };
}
```

Errors are collected in the orchestrator response:
```typescript
{
  success: false,
  errors: [
    "Ghost Cancellation: Connection timeout",
    "PBM Deviation: Query error"
  ]
}
```

---

## Future Enhancements

1. **Machine Learning:** Train models to detect anomaly patterns
2. **Real-time Alerts:** Stream detection results via WebSocket
3. **Custom Thresholds:** Allow per-pharmacy configuration
4. **Detailed Audit Trail:** Store all detection steps for investigation
5. **Integration with n8n:** Automate remediation workflows
6. **SMS/Email Notifications:** Alert stakeholders immediately
