# 🚀 Quick Start - Auditor Digital v2.0

Guia rápido para colocar o projeto em funcionamento.

---

## ⚙️ Pré-requisitos

- **Node.js** 18+ ([Download](https://nodejs.org))
- **Docker** & **Docker Compose** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** ([Download](https://git-scm.com))

### Verificar Instalação

```bash
# Verificar versões
node --version          # Deve ser v18 ou superior
docker --version        # v20+
docker-compose --version # v2+
git --version           # v2.30+
```

---

## 1️⃣ Iniciar Banco de Dados

```bash
# Na pasta raiz do projeto
cd "C:\Users\55439\PROJETOS\Projeto Auditor Farmácia"

# Iniciar MySQL com Docker
docker-compose up -d

# Verificar se está rodando
docker ps

# Output esperado:
# CONTAINER ID  IMAGE      NAMES
# abc123...     mysql:8.0  auditor-mysql
```

**Status MySQL:** http://localhost:3306 (não visível no browser, mas conectável)

---

## 2️⃣ Instalar Dependências Backend

```bash
cd backend

# Com npm
npm install

# Ou com pnpm (mais rápido)
pnpm install
```

---

## 3️⃣ Instalar Dependências Frontend

```bash
cd ../frontend

# Com npm
npm install

# Ou com pnpm
pnpm install
```

---

## 4️⃣ Iniciar o Backend

```bash
cd ../backend

# Iniciar em modo desenvolvimento
npm run dev

# Output esperado:
# ╔════════════════════════════════════════════════╗
# ║   🚀 Auditor Digital Backend                   ║
# ║   Environment: development                     ║
# ║   Port: 3000                                   ║
# │   tRPC: http://localhost:3000/trpc             ║
# ╚════════════════════════════════════════════════╝
```

**Endpoints disponíveis:**
- `GET http://localhost:3000/health` - Health check
- `POST http://localhost:3000/trpc/health.check` - tRPC health

---

## 5️⃣ Iniciar o Frontend

**Em outro terminal:**

```bash
cd frontend

# Iniciar em modo desenvolvimento
npm run dev

# Output esperado:
# VITE v5.0.8  ready in 123 ms
# ➜  Local:   http://localhost:5173/
# ➜  Press h + enter to show help
```

**Acesso:** http://localhost:5173

---

## ✅ Verificar Setup

### Backend Health Check

```bash
curl http://localhost:3000/health

# Resposta esperada:
# {
#   "status": "ok",
#   "timestamp": "2026-02-23T...",
#   "environment": "development"
# }
```

### Database Health

```bash
curl http://localhost:3000/trpc/health.database

# Resposta esperada:
# {
#   "status": "connected",
#   "timestamp": "2026-02-23T..."
# }
```

### Frontend Load

Abrir navegador: http://localhost:5173
- Deve carregar com tema dark
- 5 links de navegação (Dashboard, Alerts, Operators, Reports, Settings)

---

## 📝 Usar o Projeto

### Desenvolver Backend

```bash
cd backend

# Modo watch (hot reload)
npm run dev

# Rodar testes
npm run test

# Type checking
npm run build

# Linting
npm run lint
npm run lint:fix
```

### Desenvolver Frontend

```bash
cd frontend

# Modo watch com Vite (muito rápido)
npm run dev

# Type checking
npm run type-check

# Build para produção
npm run build

# Preview da build
npm run preview

# Linting
npm run lint
npm run lint:fix
```

### Database

```bash
cd backend

# Gerar migrations
npm run db:generate

# Aplicar migrations
npm run db:push

# Abrir Drizzle Studio (GUI para database)
npm run db:studio
```

---

## 🔧 Troubleshooting

### "Port 3000 already in use"

```bash
# Matar processo na porta 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Ou usar porta diferente
PORT=3001 npm run dev
```

### "Port 5173 already in use"

```bash
# Similar ao acima, ou deixar Vite escolher porta automaticamente
npm run dev -- --host
```

### "Cannot connect to database"

```bash
# Verificar se MySQL está rodando
docker ps | grep auditor-mysql

# Se não estiver, iniciar novamente
docker-compose up -d

# Ver logs
docker logs auditor-mysql
```

### "Module not found"

```bash
# Limpar node_modules e reinstalar
rm -rf node_modules
npm install
```

### Erro de compilação TypeScript

```bash
# Type check
npm run build

# Ver erros específicos
npm run type-check
```

---

## 📚 Próximos Passos

1. ✅ Setup concluído!
2. 📖 Ler [README.md](./README.md) - Visão geral do projeto
3. 🏗️ Ler [CLAUDE.md](./CLAUDE.md) - Decisões arquiteturais
4. 🎯 Começar Fase 1 - Implementar routers tRPC

---

## 📞 Dúvidas?

- **Documentação técnica:** [CLAUDE.md](./CLAUDE.md)
- **Requisitos do projeto:** [PRD_ATUALIZADO_v2.md](./PRD_ATUALIZADO_v2.md)
- **Estrutura do projeto:** [README.md](./README.md)

---

**Versão:** 1.0.0
**Data:** Fevereiro 2026
