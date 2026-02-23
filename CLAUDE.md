# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projeto: Auditor Digital de Alta Precisão v2.0

Sistema corporativo de detecção de fraudes para redes de farmácias, implementando auditoria ativa por comportamento usando IA, análise de padrões temporais e machine learning. Escopo: 30 farmácias, 45.160+ transações/dia, 11 analistas de risco.

---

## Stack Tecnológico

### Frontend
- **Framework:** React 19 + TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui components
- **Visualizações:** Recharts (gráficos de dados)
- **Roteamento:** Wouter (SPA routing)
- **Tema:** Dark corporativo futurista (oklch colors)

### Backend
- **Runtime:** Node.js + Express 4
- **API:** tRPC 11 (type-safe RPC)
- **ORM:** Drizzle ORM (queries otimizadas)
- **Testes:** Vitest (unit tests)
- **Validação:** Zod (runtime type checking)

### Database
- **Primary:** MySQL 8+ (9 tabelas core)
- **Conexão:** Connection pooling (10-20 conexões)
- **Particionamento:** Por data em tabelas grandes
- **Índices:** Otimizados em campos críticos

### Infraestrutura
- **Autenticação:** Manus OAuth 2.0 (RBAC com roles Admin/Analyst)
- **Armazenamento:** AWS S3 (evidências, relatórios, backups)
- **Containerização:** Docker (opcional)
- **Versionamento:** Git + GitHub

---

## Arquitetura de Dados

```
ERP Corporativo (SAP/Oracle/Totvs/SQL Server)
    ↓
ERP Sync Service (a cada 5 minutos)
    ↓
Auditor Digital Database (MySQL 8)
    ├─ tb_employees (operadores)
    ├─ tb_sales (vendas)
    ├─ tb_cancellations (cancelamentos)
    ├─ tb_pos_events (eventos do PDV)
    ├─ tb_pbm_auth (autorizações PBM)
    ├─ tb_operator_risk_score (scores de risco)
    ├─ tb_audit_alerts (alertas gerados)
    ├─ tb_cash_discrepancies (discrepâncias)
    └─ tb_users (análistas/admin)
    ↓
Detection Engine (6 módulos paralelos)
    ├─ Ghost Cancellation (+30 pontos)
    ├─ PBM Deviation (+40 pontos)
    ├─ No Sale/Gaveta Cega (+20 pontos)
    ├─ CPF Abuse (+50 pontos)
    ├─ Cash Discrepancies (+35 pontos)
    └─ Risk Score Calculation
    ↓
Frontend + Alertas + Relatórios
```

---

## Fluxo de Processamento

### 1. **Coleta (Tempo Real)**
- ERP Sync Service sincroniza dados a cada 5 minutos
- Insere em: tb_sales, tb_cancellations, tb_pos_events, tb_pbm_auth

### 2. **Enriquecimento (Batch - 03:00 AM)**
- Cruzamento de timestamps, CPFs, autorizações
- Cálculo de métricas agregadas por operador

### 3. **Detecção (Paralelo)**
- 6 módulos SQL executam simultaneamente
- Cada módulo gera registros em tb_audit_alerts com tipo, severidade, risk score

### 4. **Notificação (08:00 AM)**
- Email para analistas (SMTP)
- SMS para alertas críticos (Twilio - opcional)
- Dashboard atualizado em tempo real (WebSocket)

### 5. **Investigação (Manual)**
- Analistas investigam alertas no dashboard
- Drill-down por operador, visualização de transações
- Marcação de status: Investigado, Falso Positivo, Fraude Confirmada

### 6. **Relatório (Diário)**
- Sumário executivo gerado às 08:00 AM
- Exportação em CSV/PDF
- Armazenamento em S3

---

## Módulos de Detecção de Fraude

### 1. Ghost Cancellation
- **Detecta:** Cancelamentos >60s após conclusão da venda
- **Risk Score:** +30 pontos
- **SQL:** Query com TIMESTAMPDIFF e INNER JOIN entre tb_sales e tb_cancellations

### 2. PBM Deviation
- **Detecta:** Autorizações PBM sem cupom fiscal vinculado (5min window)
- **Risk Score:** +40 pontos
- **SQL:** LEFT JOIN entre tb_pbm_auth e tb_sales, COUNT(*) = 0

### 3. No Sale (Gaveta Cega)
- **Detecta:** Aberturas de gaveta sem transação >3 eventos/turno
- **Risk Score:** +20 pontos por evento (máx 60/turno)
- **SQL:** COUNT com GROUP BY em tb_pos_events.eventType = 'DRAWER_OPEN_NO_SALE'

### 4. CPF Abuse
- **Detecta:** Mesmo CPF em múltiplas vendas (>10 vendas com CPF de funcionário)
- **Risk Score:** +50 pontos
- **SQL:** COUNT DISTINCT com GROUP BY customerCpf, validação contra tb_employees

### 5. Risk Score Calculation
- **Fórmula:** (Ghost×30) + (PBM×40) + (NoSale×20) + (CPF×50) + (CashDisc×35)
- **Níveis:** LOW (0-50) | MEDIUM (51-150) | HIGH (151-300) | CRITICAL (301+)
- **Agregação:** Por operador, últimas 30 dias

### 6. Alert Generation
- **Estrutura JSON:** alertType, severity, operatorCpf, pdv, saleId, evidence, riskScore
- **Status inicial:** "Pending"
- **Evidence:** Links para câmeras (S3), transações relacionadas

---

## Routers tRPC Principais

### Audit Module
```typescript
audit.getAlertsByOperator(operatorCpf, dateFrom?, dateTo?, alertType?, status?)
audit.getHighRiskOperators(limit?, minRiskScore?)
audit.calculateRiskScores() // Recalcula todos os scores
```

### Alerts Module
```typescript
alerts.getAll(dateFrom?, dateTo?, status?, severity?, limit?)
alerts.updateStatus(alertId, status, notes?)
alerts.getById(alertId) // Detalhes completos com evidence
```

### Operators Module
```typescript
operators.getProfile(operatorCpf, dateFrom?, dateTo?)
operators.list(sortBy, limit?) // Ranqueado por risk score
```

### KPIs Module
```typescript
kpis.getDashboard(dateFrom?, dateTo?) // 8 KPIs principais
kpis.getTimeSeries(metric, interval) // Para gráficos
```

### Reports Module
```typescript
reports.generateExecutiveSummary(dateFrom, dateTo)
reports.generateAlertReport(dateFrom, dateTo, alertType?, status?)
reports.exportToCSV(reportType, dateFrom, dateTo) // Retorna URL S3
```

### Notifications Module
```typescript
notifications.getPreferences() // Do usuário logado
notifications.updatePreferences(emailEnabled, smsEnabled, quietHours)
notifications.sendTest() // Para validar configuração
```

---

## Páginas Frontend (Rotas)

### `/` - Dashboard Principal
- **Filtros:** Data inicial/final + atalhos (7d, 30d, 90d)
- **KPIs:** 4 cards com métricas críticas (alertas pendentes, operadores alto risco, taxa cancelamento, detecções ativas)
- **Gráficos:** Distribuição de alertas (tipo, severity), Top 5 operadores
- **Tabela:** Alertas recentes com drill-down
- **Actions:** Links para Alertas, Operadores, Relatórios

### `/alerts` - Gerenciamento de Alertas
- **Filtros:** Status, tipo, severidade, período, operador
- **Listagem:** Tabela com paginação
- **Drill-down:** Modal/página detalhes com evidence, transações relacionadas
- **Ações:** updateStatus, exportar selecionados
- **Timeline:** Cronologia de eventos para alert investigado

### `/operators` - Perfil de Operadores
- **Listagem:** Ranqueada por risk score (HIGH→LOW)
- **Perfil Detalhado:** Histórico de alertas, transações, eventos por período
- **Gráficos:** Evolução de risco (tendência), distribuição de fraudes por tipo
- **Timeline:** Eventos suspeitos cronologicamente
- **Ações:** Bloquear operador, exportar relatório individual

### `/reports` - Relatórios
- **Sumário Executivo:** Visão geral (alertas, operadores, valor recuperado)
- **Relatório de Alertas:** Detalhes por tipo, status, severidade
- **Relatório de Operadores:** Ranking de risco com top 10
- **Exportação:** PDF, Excel, CSV (via S3)
- **Agendamento:** Relatórios recorrentes (não implementado em MVP)

### `/settings` - Configurações & Notificações
- **Preferências Notificação:** Email on/off, SMS on/off, quiet hours
- **Filtros:** Apenas alertas críticos, por tipo
- **Histórico:** Log de notificações enviadas (últimos 30 dias)
- **Teste:** Enviar notificação de teste para validar config

---

## Banco de Dados - Detalhes de Implementação

### Tabelas Core (9 total)

**tb_employees**
- PK: cpf (VARCHAR 11)
- Campos: name, hireDate, status (ACTIVE/INACTIVE)
- Índices: idx_status
- Atualizado por: ERP Sync (diário)

**tb_sales**
- PK: id (VARCHAR 50)
- FK: idOperator (cpf)
- Campos: idPdv, totalAmount, timestampSale, customerCpf
- Índices: idx_operator, idx_timestamp, idx_customer
- Volume: ~45.160 registros/dia

**tb_cancellations**
- PK: id (VARCHAR 50)
- FK: idSale
- Campos: timestampCancellation, reason
- Índices: idx_sale, idx_timestamp
- Correlação: 1:1 com tb_sales (via foreign key)

**tb_pos_events**
- PK: id (VARCHAR 50)
- FK: idOperator (cpf)
- Campos: eventType (ENUM), idPdv, eventTimestamp
- Índices: idx_operator, idx_event_type, idx_timestamp
- Filtro de detecção: WHERE eventType = 'DRAWER_OPEN_NO_SALE'

**tb_pbm_auth**
- PK: id (VARCHAR 50)
- FK: idOperator (cpf)
- Campos: authorizationCode, authorizationAmount, status (APPROVED/DECLINED/PENDING)
- Índices: idx_operator, idx_timestamp, idx_status
- Sincronização: Sistema de cartões/convênios

**tb_operator_risk_score**
- PK: id (AUTO_INCREMENT)
- FK: idOperator (cpf)
- Campos: riskScore, riskLevel (ENUM), ghostCancellations, pbmDeviations, noSaleEvents, cpfAbuseCount, cashDiscrepancies
- Índices: idx_operator, idx_risk_level, idx_calculated
- **Frequência atualização:** Diária (batch 03:00 AM)

**tb_audit_alerts**
- PK: id (VARCHAR 50, formato ALERT-YYYY-MM-###)
- FK: idOperator, investigatedBy (users.id)
- Campos: alertType (ENUM), severity, status, pdv, pharmacy, saleId, evidence (JSON), investigationNotes
- Índices: idx_operator, idx_status, idx_created, idx_severity
- **Particionamento:** Por data (1 partição/mês recomendado)

**tb_cash_discrepancies**
- PK: id (AUTO_INCREMENT)
- Campos: idPdv, expectedAmount, actualAmount, discrepancy, discrepancyDate
- Índices: idx_pdv, idx_date
- Fonte: Sincronização de fechamento de caixa

**tb_users** (não no PRD, assumido existir)
- PK: id
- Campos: email, name, role (Admin/Analyst), createdAt
- FK: Referenciado por investigatedBy em tb_audit_alerts

---

## Otimizações de Performance

### Índices Críticos
```sql
-- Ghost Cancellation detection
CREATE INDEX idx_sales_operator_timestamp ON tb_sales(idOperator, timestampSale);
CREATE INDEX idx_cancellations_timestamp ON tb_cancellations(timestampCancellation);

-- Risk Score calculation
CREATE INDEX idx_alerts_operator_created ON tb_audit_alerts(idOperator, createdAt);

-- Dashboard queries
CREATE INDEX idx_alerts_status_created ON tb_audit_alerts(status, createdAt DESC);
```

### Particionamento (por implementar)
```sql
-- Particionar tb_audit_alerts por data (1 partição/mês)
PARTITION BY RANGE (YEAR_MONTH(createdAt))
```

### Caching (opcional com Redis)
- Dashboard KPIs (TTL: 5 min)
- Operator risk scores (TTL: 1 hour)
- High-risk operators list (TTL: 30 min)

### Connection Pooling
- Min: 10, Max: 20 conexões
- Timeout: 30 segundos
- Idle timeout: 5 minutos

---

## Integração com ERP Corporativo

### Suporte
- MySQL, PostgreSQL, Oracle, SQL Server
- Conexão direta, API REST, ou ETL
- Sincronização: A cada 5 minutos
- Mapeamento automático de campos

### Tabelas Sincronizadas
- `tb_sales` ← ERP.vendas
- `tb_cancellations` ← ERP.cancelamentos
- `tb_employees` ← ERP.operadores
- `tb_pbm_auth` ← ERP.autorizacoes_pbm
- `tb_pos_events` ← ERP.eventos_pdv

### Guia Completo
- Arquivo: `GUIA_INTEGRACAO_ERP.md` (a ser criado)
- Documentar: Mappping de campos, tratamento de erros, sincronização incremental

---

## KPIs e Métricas (8 no Dashboard)

| KPI | Descrição | Fórmula | Benchmark |
|-----|-----------|---------|-----------|
| Alertas Pendentes | Aguardando investigação | COUNT(status='Pending') | <10 |
| Operadores Alto Risco | Risk score >150 | COUNT(riskScore>150) | <5 |
| Taxa Cancelamento | % de vendas canceladas | (Cancelamentos/Vendas)*100 | <3% |
| Detecções Ativas | Módulos operacionais | COUNT(active_modules) | 6/6 |
| Tempo Médio Investigação | Entre alerta e resolução | AVG(investigatedAt-createdAt) | <2h |
| Taxa Acurácia | % alertas = fraude real | Fraudes/Total Alertas | >80% |
| Cobertura de Farmácias | Lojas sincronizadas | COUNT(pharmacies_synced) | 30/30 |
| Valor Recuperado | Fraudes prevenidas | SUM(fraud_amounts) | >R$50k/mês |

---

## Segurança

### Autenticação
- OAuth 2.0 com Manus
- Session timeout: 30 minutos
- RBAC: Admin, Analyst roles

### Proteção de Dados
- TLS 1.2+ em trânsito
- Senhas: bcrypt (não aplicável, OAuth)
- Dados sensíveis mascarados (CPF parcial, valores)
- Backup automático diário

### Conformidade
- LGPD (Lei Geral de Proteção de Dados)
- PCI DSS (para dados de pagamento)
- Audit log imutável por 2 anos
- Auditoria externa trimestral

---

## Testes

### Unitários
- **Framework:** Vitest
- **Coverage:** 100% (target)
- **Escopo:** Funções de cálculo, validações, transformações

### Integração
- Sincronização ERP (mock database)
- Cálculo de risk scores (dados reais)
- Geração de alertas

### E2E (não implementado em MVP)
- Fluxos de investigação completos
- Exportação de relatórios

### Dados de Teste
- 30 farmácias simuladas
- 45.160 transações de vendas
- 2.256 cancelamentos
- 3.590 eventos POS
- 6.748 autorizações PBM
- 10+ alertas de demonstração

---

## Decisões Arquiteturais Importantes

### 1. tRPC vs REST
**Por quê tRPC?** Type-safe entre frontend/backend, autocompletar no editor, zero latência de geração de tipos.

### 2. Drizzle vs Sequelize
**Por quê Drizzle?** Queries são SQL puro (performático), type-safe, autocomplete, melhor para analytics.

### 3. Detecção em SQL vs Node.js
**Por quê SQL?** Processamento paralelo nativo, performance com 45k+ registros, índices otimizados.

### 4. Batch 03:00 AM para enriquecimento
**Por quê?** Evita processamento em horário de pico (8:00-18:00), permite agregações caras (DISTINCT, JOINs múltiplos).

### 5. Notificações às 08:00 AM
**Por quê?** Concentra alertas para que analistas comecem dia com contexto completo, evita notificação/fadiga.

### 6. S3 para evidências
**Por quê?** Videos de câmeras são pesados, oferece permalink permanente, facilita auditoria externa.

---

## Roadmap Futuro (Fases)

### MVP (Q1 2026) - BASE
- [ ] Setup projeto (React + Express)
- [ ] Schema database (9 tabelas)
- [ ] ERP Sync Service
- [ ] 6 módulos de detecção (SQL puro)
- [ ] Dashboard com KPIs
- [ ] Sistema de alertas
- [ ] Notificações (Email + SMS)
- [ ] Testes unitários
- [ ] Documentação completa

### Phase 2 (Q2 2026) - INTELIGÊNCIA
- [ ] Integração com câmeras CCTV (upload automático S3)
- [ ] Machine learning para scoring preditivo (modelo TBD)
- [ ] Alertas em tempo real via WebSocket
- [ ] Mobile app (React Native) para analistas
- [ ] Dashboard de produtividade (analistas)

### Phase 3 (Q3 2026) - AUTOMAÇÃO
- [ ] Detecção de fraude em estoque
- [ ] Análise comportamental de clientes
- [ ] Integração com sistema de RH (ausências/demissões)
- [ ] Automação de ações (bloqueio operador)
- [ ] Power BI ou Tableau integration

### Phase 4 (Q4 2026) - CERTIFICAÇÃO
- [ ] IA generativa para análise de evidências
- [ ] Previsão de fraudes avançada
- [ ] Integração com auditores externos (API)
- [ ] ISO 27001 certification

---

## Próximos Passos Imediatos

1. **Inicializar projeto Node.js** com Express, tRPC, Drizzle
2. **Criar schema MySQL** (9 tabelas com índices)
3. **Implementar ERP Sync Service** (mock inicial)
4. **Desenvolver 6 módulos detecção** (SQL puro, testes)
5. **Build frontend** (Dashboard, Alerts, Operators, Reports)
6. **Sistema de notificações** (Email/SMS)
7. **Deploy staging** e testes com dados reais

---

## Referências

- **PRD:** `PRD_ATUALIZADO_v2.md` (este projeto)
- **Demo:** `GUIA_DEMONSTRACAO.md` (4 casos práticos)
- **ERP Integration:** `GUIA_INTEGRACAO_ERP.md` (a criar)
- **Skills reutilizáveis:** `SKILL.md` (fraud-detection-system)

---

**Status:** Documentação Inicial
**Versão:** 1.0
**Última Atualização:** Fevereiro 2026
