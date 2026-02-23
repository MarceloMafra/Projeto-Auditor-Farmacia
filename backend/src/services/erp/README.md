# ERP Integration & Sync Service

## Overview

The ERP Sync Service provides seamless integration with multiple enterprise resource planning systems to synchronize transaction data into the audit database. It supports 4 major database platforms with automatic deduplication, error recovery, and comprehensive audit trails.

**Supported Databases:**
- MySQL 5.7+ (MariaDB compatible)
- PostgreSQL 10+
- Oracle Database 11g+
- SQL Server 2016+

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    External ERP System                          │
│         (MySQL/PostgreSQL/Oracle/SQL Server)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                      Database Driver
                             │
┌────────────────────────────▼────────────────────────────────────┐
│           ERP Connector (Platform-Specific)                      │
│                                                                 │
│  ├─ MysqlErpConnector      (mysql2 driver)                      │
│  ├─ PostgresErpConnector   (pg driver)                          │
│  ├─ OracleErpConnector     (oracledb driver)                    │
│  └─ SqlServerErpConnector  (mssql driver)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    Normalizes Data
                             │
┌────────────────────────────▼────────────────────────────────────┐
│              ERP Sync Service Orchestrator                       │
│                                                                 │
│  ├─ Batch Processing (1000 records/batch)                      │
│  ├─ Deduplication (5-minute window)                            │
│  ├─ Retry Logic (exponential backoff)                          │
│  └─ Error Handling & Recovery                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                      Insert/Update
                             │
┌────────────────────────────▼────────────────────────────────────┐
│              Audit Database (MySQL)                             │
│                                                                 │
│  ├─ tb_sales                 (synced transactions)             │
│  ├─ tb_erp_sync_audit        (sync history)                    │
│  └─ tb_sync_dedup_keys       (deduplication tracking)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Base Connector (`connectors/baseConnector.ts`)

Abstract base class defining the connector interface:

```typescript
abstract class BaseErpConnector {
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract testConnection(): Promise<boolean>;
  abstract getLastSyncTimestamp(): Promise<Date | null>;
  abstract fetchTransactions(fromDate?: Date, limit?: number): Promise<ErpTransactionRow[]>;
  abstract getTransactionCount(fromDate?: Date): Promise<number>;
}
```

**Key Methods:**
- `normalizeTransaction()`: Convert ERP data to standard format
- `validateTransaction()`: Validate data integrity
- `formatDateForQuery()`: Standardize date formatting

### 2. Database-Specific Connectors

#### MySQL Connector (`mysqlConnector.ts`)

```typescript
const connector = new MysqlErpConnector({
  type: 'mysql',
  host: 'erp.company.com',
  port: 3306,
  database: 'erp_db',
  username: 'sync_user',
  password: 'secure_password',
});

await connector.connect();
const transactions = await connector.fetchTransactions(new Date('2024-01-01'), 1000);
```

**Features:**
- Connection pooling (10-20 connections)
- Batch fetching with offset
- Automatic connection timeout handling
- MariaDB compatible

#### PostgreSQL Connector (`postgresConnector.ts`)

```typescript
const connector = new PostgresErpConnector({
  type: 'postgresql',
  host: 'erp.company.com',
  port: 5432,
  database: 'erp_db',
  username: 'sync_user',
  password: 'secure_password',
  ssl: true,
});

await connector.connect();
```

**Features:**
- SSL/TLS support
- Parameterized queries ($1, $2)
- Connection pooling with idle timeout
- Supports JSON data types

#### Oracle Connector (`oracleConnector.ts`)

```typescript
const connector = new OracleErpConnector({
  type: 'oracle',
  host: 'erp.company.com',
  port: 1521,
  database: 'ORCL',
  username: 'sync_user',
  password: 'secure_password',
});
```

**Features:**
- Requires `npm install oracledb`
- Connection pooling with increment
- Named binding parameters
- Supports BLOB/CLOB data types

#### SQL Server Connector (`sqlserverConnector.ts`)

```typescript
const connector = new SqlServerErpConnector({
  type: 'sqlserver',
  host: 'erp.company.com',
  port: 1433,
  database: 'erp_db',
  username: 'sync_user',
  password: 'secure_password',
  ssl: true,
});
```

**Features:**
- Requires `npm install mssql`
- Encryption support
- Batch operations optimization
- Named parameters with @prefix

### 3. Sync Service (`syncService.ts`)

Main orchestrator for synchronization:

```typescript
const syncService = new ErpSyncService(db, erpConfig);

const result = await syncService.sync({
  batchSize: 1000,
  maxRecords: 50000,
  daysBack: 30,
  fullSync: false,
  deduplicationEnabled: true,
  deduplicationWindowMinutes: 5,
  maxRetries: 3,
  retryDelayMs: 1000,
});
```

**Sync Process:**
1. Connect to ERP database
2. Calculate sync period (full or incremental)
3. Count total records
4. Load existing deduplication keys
5. Fetch records in batches
6. Normalize and validate each record
7. Check for duplicates
8. Insert/update in audit database
9. Record audit trail
10. Disconnect from ERP

**Result:**
```typescript
{
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;  // milliseconds
  databaseType: DatabaseType;
  recordsFetched: number;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;  // Duplicates
  errors: SyncError[];
}
```

---

## Deduplication Strategy

Prevents importing the same transaction multiple times using a 5-minute time window:

```typescript
interface DuplicationKey {
  pdv: string;
  operator: string;
  amount: number;
  timestampBucket: number;  // Rounded to 5-minute window
  reference?: string;
}
```

**Example:**
```typescript
const key = generateDuplicationKey({
  pdv: '101',
  operator: '12345678900',
  amount: 85.50,
  timestamp: new Date('2024-01-15 10:23:45'),
});

// Generates:
{
  pdv: '101',
  operator: '12345678900',
  amount: 85.50,
  timestampBucket: 1705314600000,  // 10:20:00
  reference: undefined
}
```

**How It Works:**
1. Group transactions by 5-minute window
2. Store deduplication keys in cache (in-memory)
3. Skip any transaction with existing key
4. Persist keys to database for next sync

---

## Sync Modes

### Incremental Sync (Default)

**When to use:** Regular scheduled syncs (hourly, daily)

```typescript
// Fetch last 24 hours
const result = await syncService.sync({
  fullSync: false,
  daysBack: 1,  // Last 24 hours
  batchSize: 1000,
  maxRecords: 50000,
});
```

**Output:**
- Only new/updated records since last sync
- Faster execution (~2-5 seconds)
- Lower bandwidth usage
- Suitable for hourly runs

### Full Sync

**When to use:** Nightly or weekly reconciliation

```typescript
// Fetch entire history
const result = await syncService.sync({
  fullSync: true,  // No date filter
  batchSize: 1000,
  maxRecords: null,  // No limit
});
```

**Output:**
- All records from ERP
- Comprehensive audit trail
- Takes longer (~2-10 minutes depending on volume)
- Good for reconciliation

---

## Error Handling

### Retry Logic

Automatic retry with exponential backoff:

```typescript
for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    return await fetchTransactions();
  } catch (error) {
    if (attempt < maxRetries - 1) {
      const delay = retryDelayMs * (attempt + 1);
      await sleep(delay);  // 1000ms, 2000ms, 3000ms
    } else {
      throw error;
    }
  }
}
```

### Error Classification

```typescript
interface SyncError {
  record?: ErpTransactionRow;
  error: string;
  severity: 'WARNING' | 'ERROR' | 'CRITICAL';
  recoverable: boolean;
}
```

**Examples:**
- Missing required fields → ERROR (recoverable)
- Invalid timestamp format → WARNING (skip record)
- Connection timeout → CRITICAL (retry entire batch)
- Database constraint violation → ERROR (log and continue)

### Partial Sync Status

Even if some records fail, sync returns partial results:

```typescript
{
  success: false,  // 1 or more errors
  recordsInserted: 1245,
  recordsSkipped: 50,
  errors: [
    {
      error: 'Invalid transaction amount',
      severity: 'ERROR',
      recoverable: true
    }
  ]
}
```

---

## Performance Optimization

### Batch Processing

Process records in configurable batches to manage memory:

```typescript
// Default: 1000 records/batch
// Fetching: ~100-300ms per batch
// Processing: ~50-100ms per batch
// Inserting: ~200-500ms per batch
```

**Performance Metrics (per batch of 1000):**
| Operation | MySQL | PostgreSQL | Oracle | SQL Server |
|-----------|-------|-----------|--------|-----------|
| Fetch | 150ms | 200ms | 300ms | 250ms |
| Process | 80ms | 80ms | 80ms | 80ms |
| Insert | 300ms | 350ms | 400ms | 380ms |
| Total | ~530ms | ~630ms | ~780ms | ~710ms |

### Connection Pooling

Reuse connections to reduce overhead:

```typescript
MySQL:     10-20 connections
PostgreSQL: 10 connections
Oracle:     2-10 connections (min/max)
SQL Server: 10 connections
```

### Index Strategy

Ensure these indices exist in ERP for fast queries:

```sql
-- Minimal required indices
CREATE INDEX idx_timestamp ON sale_transactions(timestamp);
CREATE INDEX idx_pdv ON sale_transactions(pdv);
CREATE INDEX idx_operator ON sale_transactions(operator);
CREATE INDEX idx_date_pdv ON sale_transactions(timestamp, pdv);
```

---

## Integration Points

### tRPC Router

**File:** `backend/src/api/routers/erp.ts`

#### `erp.testConnection`

Test connection to ERP before configuring sync:

```typescript
const result = await client.erp.testConnection.mutate({
  type: 'mysql',
  host: 'erp.company.com',
  port: 3306,
  database: 'erp_db',
  username: 'sync_user',
  password: 'password',
});

// Response
{
  success: true,
  message: "✅ Conexão com mysql ERP estabelecida com sucesso"
}
```

#### `erp.syncNow`

Trigger manual synchronization (admin only):

```typescript
const result = await client.erp.syncNow.mutate({
  type: 'mysql',
  host: 'erp.company.com',
  port: 3306,
  database: 'erp_db',
  username: 'sync_user',
  password: 'password',
  fullSync: false,
  daysBack: 30,
  batchSize: 1000,
  maxRecords: 50000,
});

// Response
{
  success: true,
  message: "Sincronização concluída: 1250 inseridos, 50 duplicados",
  data: {
    syncId: 'SYNC-2024-01-15',
    recordsFetched: 1300,
    recordsProcessed: 1300,
    recordsInserted: 1250,
    recordsUpdated: 0,
    recordsSkipped: 50,
    duration: 3500,
    errorCount: 0
  }
}
```

#### `erp.getStatus`

Check current sync status:

```typescript
const status = await client.erp.getStatus.query();

// Response
{
  running: false,
  lastSync: {
    timestamp: "2024-01-15T03:00:00Z",
    recordsInserted: 1250,
    recordsSkipped: 50,
    duration: 3500
  },
  nextScheduledSync: {
    time: "Hourly",
    description: "Sincronização automática a cada hora"
  },
  supportedDatabases: ['mysql', 'postgresql', 'oracle', 'sqlserver']
}
```

#### `erp.getSyncHistory`

View sync audit trail:

```typescript
const history = await client.erp.getSyncHistory.query({ limit: 10 });

// Response
{
  syncs: [
    {
      syncId: 'SYNC-2024-01-15',
      databaseType: 'mysql',
      timestamp: "2024-01-15T03:00:00Z",
      duration: 3500,
      recordsProcessed: 1300,
      recordsInserted: 1250,
      recordsSkipped: 50,
      status: 'SUCCESS',
      triggeredBy: 'system',
      isManual: false
    }
  ]
}
```

### Batch Job

**File:** `backend/src/jobs/erpSyncJob.ts`

Automatically sync on schedule:

```typescript
const config: ErpSyncJobConfig = {
  enabled: true,
  interval: 60,  // Every 60 minutes
  fullSyncInterval: 24,  // Full sync every 24 hours
  configs: [
    {
      type: 'mysql',
      host: 'erp1.company.com',
      port: 3306,
      // ...
    },
    {
      type: 'postgresql',
      host: 'erp2.company.com',
      port: 5432,
      // ...
    },
  ],
};

scheduleErpSyncJob(db, config);
```

---

## Setup Guide

### Installation

```bash
# Install base dependencies
npm install mysql2 pg

# Optional: For Oracle support
npm install oracledb

# Optional: For SQL Server support
npm install mssql
```

### Environment Configuration

Create `.env.erp`:

```env
# Primary ERP Configuration
ERP_TYPE=mysql
ERP_HOST=erp.company.com
ERP_PORT=3306
ERP_DATABASE=erp_db
ERP_USERNAME=sync_user
ERP_PASSWORD=secure_password
ERP_SSL=false

# Secondary ERP (PostgreSQL)
ERP2_TYPE=postgresql
ERP2_HOST=erp2.company.com
ERP2_PORT=5432
ERP2_DATABASE=erp_db
ERP2_USERNAME=sync_user
ERP2_PASSWORD=secure_password
ERP2_SSL=true
```

### Database Requirements

ERP must have a `sale_transactions` table with these columns:

```sql
CREATE TABLE sale_transactions (
  id VARCHAR(36) PRIMARY KEY,
  pdv VARCHAR(10) NOT NULL,
  operator VARCHAR(20) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  timestamp DATETIME NOT NULL,
  type ENUM('SALE', 'CANCELLATION', 'REFUND', 'ADJUSTMENT'),
  reference VARCHAR(50),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_timestamp (timestamp),
  INDEX idx_pdv (pdv),
  INDEX idx_operator (operator),
  INDEX idx_date_pdv (timestamp, pdv)
);
```

### Testing Connection

```bash
# Via tRPC (frontend)
client.erp.testConnection.mutate({
  type: 'mysql',
  host: 'erp.company.com',
  port: 3306,
  database: 'erp_db',
  username: 'sync_user',
  password: 'password',
})

# Via Node.js
npx ts-node -e "
  import { createErpConnector } from '@/services/erp';
  const connector = createErpConnector({
    type: 'mysql',
    host: 'erp.company.com',
    port: 3306,
    database: 'erp_db',
    username: 'sync_user',
    password: 'password'
  });
  const result = await connector.testConnection();
  console.log('Connected:', result);
"
```

---

## Monitoring & Audit

### Sync Audit Trail

All syncs are recorded in `tb_erp_sync_audit`:

```sql
SELECT
  sync_id,
  database_type,
  sync_type,
  start_time,
  end_time,
  duration_ms,
  records_processed,
  records_inserted,
  records_skipped,
  status,
  errors
FROM tb_erp_sync_audit
ORDER BY start_time DESC
LIMIT 10;
```

### Metrics to Monitor

```
- Sync Duration: Target <5 seconds for incremental
- Records/Second: Should be >500 for healthy sync
- Error Rate: Target <0.1%
- Duplicate Rate: Usually 2-5% for incremental syncs
- Last Sync Time: Should be recent (within sync interval)
```

### Alerts

Configure alerts if:

```
- Sync duration > 10 seconds
- Error rate > 1%
- Last sync > 2 hours ago
- Duplicate rate > 10%
- Connection failures
```

---

## Troubleshooting

### Connection Refused

```
Error: ECONNREFUSED 192.168.1.100:3306

Solution:
1. Check ERP host/port are correct
2. Verify firewall allows connection
3. Test: telnet host port
4. Check ERP database is running
```

### Timeout Errors

```
Error: Query timeout

Solution:
1. Increase requestTimeout in config
2. Reduce batchSize (1000 → 500)
3. Check ERP database performance
4. Check network latency
```

### Deduplication Issues

```
Problem: Same records imported multiple times

Solution:
1. Enable deduplicationEnabled: true
2. Increase deduplicationWindowMinutes if needed
3. Ensure unique reference IDs in ERP
4. Check clocks are synchronized
```

### Memory Issues

```
Error: Out of memory

Solution:
1. Reduce batchSize (1000 → 100)
2. Reduce maxRecords (50000 → 10000)
3. Disable large metadata fields
4. Use full sync less frequently
```

---

## Future Enhancements

1. **Bi-directional Sync** - Update ERP with audit results
2. **Conflict Resolution** - Handle record conflicts automatically
3. **Data Transformation** - Custom field mapping per ERP
4. **Real-time Streaming** - CDC (Change Data Capture) from ERP
5. **Data Quality Validation** - Pre-sync data quality checks
6. **Multi-tenant Support** - Separate audit trails per company
7. **Incremental Backups** - Archive historical syncs
8. **API-based Integration** - REST API sync as alternative to DB direct
