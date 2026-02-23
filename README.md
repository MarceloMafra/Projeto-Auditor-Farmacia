# 🚀 Auditor Digital de Alta Precisão v2.0

Sistema corporativo de detecção de fraudes para redes de farmácias, implementando auditoria ativa por comportamento usando IA, análise de padrões temporais e machine learning.

**Status:** Fase 0 - Setup Inicial ✅
**Próximo:** Fase 1 - MVP Backend

---

## 📋 Visão Geral

- **Objetivo:** Detectar 6 tipos de fraude interna em tempo real
- **Escopo:** 30 farmácias, 45.160+ transações/dia, 11 analistas de risco
- **Redução de Fraude:** -40% em 6 meses
- **Tempo de Investigação:** <2 horas por alerta

---

## 🏗️ Arquitetura

```
Frontend (React 19)
    ↓↑
Backend (Node.js + Express + tRPC)
    ↓↑
Database (MySQL 8)
    ↓
ERP Corporativo (SAP/Oracle/Totvs/SQL Server)
```

---

## 📁 Estrutura de Pastas

```
.
├── backend/
│   ├── src/
│   │   ├── api/          # tRPC routers
│   │   ├── db/           # Drizzle ORM + schema
│   │   ├── services/     # Business logic
│   │   ├── config/       # Configuration
│   │   └── types/        # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── pages/        # Route pages
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   ├── utils/        # Utilities
│   │   └── styles/       # CSS
│   ├── package.json
│   ├── vite.config.ts
│   └── .env
│
├── docker-compose.yml    # MySQL container
├── .env.example          # Environment template
├── CLAUDE.md             # Development guide
└── README.md             # This file
```

---

## 🚀 Quick Start

### 1. **Clone e Setup**

```bash
# Já estamos no diretório correto
cd "C:\Users\55439\PROJETOS\Projeto Auditor Farmácia"

# Copiar .env example
cp .env.example .env
```

### 2. **Iniciar Database (Docker)**

```bash
# Iniciar MySQL
docker-compose up -d

# Verificar se está rodando
docker ps | grep auditor-mysql
```

### 3. **Setup Backend**

```bash
cd backend

# Instalar dependências (requer Node.js 18+)
npm install
# ou com pnpm
pnpm install

# Iniciar servidor em desenvolvimento
npm run dev
# Acesso em http://localhost:3000
```

### 4. **Setup Frontend**

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar dev server
npm run dev
# Acesso em http://localhost:5173
```

---

## 📝 Principais Endpoints

### Backend (tRPC)

```
GET  http://localhost:3000/health              - Health check
POST http://localhost:3000/trpc/health.check   - tRPC health
POST http://localhost:3000/trpc/health.database - DB health
```

### Frontend

```
/              - Dashboard (KPIs, alertas recentes)
/alerts        - Gerenciamento de alertas
/operators     - Perfil de operadores
/reports       - Relatórios executivos
/settings      - Preferências de notificação
```

---

## 🛠️ Desenvolvimento

### Executar Testes

```bash
cd backend
npm run test              # Rodar testes
npm run test:coverage     # Com coverage
```

### Linting

```bash
# Backend
cd backend
npm run lint              # Verificar
npm run lint:fix          # Auto-fix

# Frontend
cd frontend
npm run lint
npm run lint:fix
```

### Type Checking

```bash
cd backend
npm run build             # Compile TypeScript

cd frontend
npm run type-check        # Type check sem build
```

---

## 🗄️ Database

### Criar Schema

```bash
cd backend

# Gerar migrations (Drizzle)
npm run db:generate

# Executar migrations
npm run db:push

# Abrir Drizzle Studio (interface visual)
npm run db:studio
```

### Seed Data (em desenvolvimento)

```bash
# Será criado script para popular dados de teste
npm run db:seed
```

---

## 📚 Documentação

- **[CLAUDE.md](./CLAUDE.md)** - Guia técnico completo e decisões arquiteturais
- **[PRD_ATUALIZADO_v2.md](./PRD_ATUALIZADO_v2.md)** - Documento de requisitos do produto
- **[.env.example](./.env.example)** - Variáveis de ambiente necessárias

---

## 🔐 Segurança

- OAuth 2.0 com Manus
- Session timeout: 30 minutos
- RBAC: Admin, Analyst roles
- TLS 1.2+ em trânsito
- Backup automático diário

---

## 📊 Fases de Desenvolvimento

### ✅ Fase 0: Setup Inicial (CONCLUÍDO)
- [x] Estrutura de pastas
- [x] Configuração Node.js + Express
- [x] Drizzle ORM + Schema MySQL
- [x] Setup React + Tailwind
- [x] Docker MySQL

### 🔄 Fase 1: MVP Backend (PRÓXIMO)
- [ ] tRPC routers (audit, alerts, operators, kpis)
- [ ] Módulos de detecção de fraude
- [ ] Sincronização ERP
- [ ] Testes unitários

### 📅 Fase 2: MVP Frontend (DEPOIS)
- [ ] Dashboard principal
- [ ] Alerts page
- [ ] Operators page
- [ ] Reports & Settings

### 📢 Fase 3: Notificações
- [ ] Email notifications
- [ ] SMS (Twilio)
- [ ] WebSocket real-time

### 🤖 Fase 4: Agentes n8n
- [ ] ERP Sync Agent
- [ ] Detection Agents (5)
- [ ] Risk Aggregator
- [ ] Notification Agent
- [ ] Reports Agent

---

## 🤝 Contribuindo

1. Criar branch: `git checkout -b feature/sua-feature`
2. Fazer commit: `git commit -am 'Add feature'`
3. Push: `git push origin feature/sua-feature`
4. Abrir Pull Request

---

## 📞 Suporte

Para dúvidas sobre setup, arquitetura ou features:
- Consulte [CLAUDE.md](./CLAUDE.md)
- Revise [PRD_ATUALIZADO_v2.md](./PRD_ATUALIZADO_v2.md)
- Crie uma issue no GitHub

---

## 📄 License

MIT

---

**Versão:** 1.0.0
**Última Atualização:** Fevereiro 2026
**Mantido por:** Arquiteto de Soluções - Auditor Digital
