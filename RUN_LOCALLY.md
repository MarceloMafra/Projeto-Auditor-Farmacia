# 🚀 Como Rodar o Auditor Digital Localmente

## ⚡ Quick Start (2 terminais)

### Terminal 1 - Backend (Express + tRPC)
```bash
cd backend
npm install          # Instalar dependências (primeira vez)
npm run dev         # Roda em http://localhost:3000
```

**Output esperado:**
```
Server running at http://localhost:3000
tRPC listening at http://localhost:3000/trpc
```

### Terminal 2 - Frontend (React + Vite)
```bash
cd frontend
npm install          # Instalar dependências (primeira vez)
npm run dev         # Roda em http://localhost:5173
```

**Output esperado:**
```
  VITE v5.0.8  ready in 245 ms

  ➜  Local:   http://localhost:5173/
```

## 🌐 Acessar o App

Abra seu navegador em:
```
http://localhost:5173
```

## 📋 Requisitos

- ✅ Node.js >= 18.18.0
- ✅ npm ou pnpm
- ✅ MySQL (se tiver dados reais, senão UI usa mock)
- ✅ Porta 3000 livre (backend)
- ✅ Porta 5173 livre (frontend)

## 🎯 O que você verá

### Dashboard
```
┌─────────────────────────────────────┐
│  🔔 Dashboard | Alertas | ...       │
├─────────────────────────────────────┤
│  [Filtros de Data]                  │
├─────────────────────────────────────┤
│  ┌─────┬─────┬──────┬──────────┐   │
│  │ 5   │ 3   │ 2.5% │ 6/6      │   │
│  │ Pend│Alto │Taxa  │ Detecção │   │
│  └─────┴─────┴──────┴──────────┘   │
├─────────────────────────────────────┤
│  [Gráficos de Pizza]                │
├─────────────────────────────────────┤
│  [Tabela de Alertas Recentes]       │
├─────────────────────────────────────┤
│  ┌─────┬─────┬──────┬────────┐     │
│  │ 2h  │ 85% │ 30/30│R$12.5k │     │
│  │ Inv │ Acu │ Farm │ Recup  │     │
│  └─────┴─────┴──────┴────────┘     │
└─────────────────────────────────────┘
```

## 🎨 Navegação

- **Dashboard** - Principal hub (8 KPIs)
- **Alertas** - Listagem de alertas (em desenvolvimento)
- **Operadores** - Perfis de operadores (em desenvolvimento)
- **Relatórios** - Exportação de dados (em desenvolvimento)
- **Configurações** - Preferências (em desenvolvimento)

## 💡 Features Implementadas

### ✅ Fase 1.5 (Agora)
- Dashboard com 8 KPIs
- 2 gráficos interativos (Recharts)
- Tabela de alertas
- Filtros de data
- Tema dark corporativo
- Responsividade (mobile/tablet/desktop)

### 🚧 Fases Futuras
- [x] Backend completo (Fases 1.0-1.4)
- [x] Frontend Dashboard (Fase 1.5)
- [ ] Modal de alertas (Fase 1.6)
- [ ] Página de operadores (Fase 1.7)
- [ ] Notificações (Fase 1.8)

## 🔧 Troubleshooting

### Porta 3000 já em uso?
```bash
# Kill o processo na porta 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Porta 5173 já em uso?
```bash
# Vite vai sugerir a próxima porta disponível (5174, 5175, etc)
```

### Erro "Cannot find module"?
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Frontend não consegue conectar ao backend?
- Verificar se backend está rodando (`http://localhost:3000`)
- Verificar arquivo `frontend/.env`
- Abrir DevTools (F12) e ver erro no Console

### Database não conecta?
- Backend usa MySQL
- Se não tiver dados, UI mostra valores mock/vazios
- Verificar `backend/.env` com credenciais MySQL

## 📱 Responsividade

O app está totalmente responsivo:

- **Mobile** (< 640px): 1 coluna, navegação compacta
- **Tablet** (640px - 1024px): 2 colunas
- **Desktop** (> 1024px): 4 colunas (KPI Cards)

Redimensione a janela do navegador para ver!

## 🎬 Ctrl+Shift+I (DevTools)

Use o DevTools para:
- Ver Network requests (tRPC queries)
- Inspecionar componentes (React)
- Ver erros no Console
- Network tab para debitar API calls

## 📊 Mock Data

Se não tiver MySQL, o frontend:
- ✅ Carrega interface normalmente
- ✅ Mostra KPIs zerados (0, 0%, etc)
- ✅ Tabela vazia de alertas
- ⚠️ Gráficos vazios
- ✅ Filtros funcionam (sem dados)

## 🔄 Recarregar

- `F5` ou `Ctrl+R` - Recarregar página
- `Ctrl+Shift+R` - Recarregar sem cache
- Botão "Atualizar" no Dashboard - Refetch de dados

## 📝 Logs

### Backend
```
📝 Registrando sincronização ERP: AUDIT-...
✅ Sincronização registrada com sucesso
```

### Frontend Console (DevTools)
```
Error ao buscar KPIs: ...
```

## 🚀 Próximos Passos

Depois de rodar:

1. ✅ Veja o Dashboard carregando
2. ✅ Teste filtros de data
3. ✅ Clique nos gráficos
4. ✅ Veja a tabela de alertas
5. ✅ Navegue para outras páginas (placeholders)
6. ✅ Abra DevTools para ver API calls

## 📞 Suporte

Se algo não funcionar:

1. Verificar se ambos os servidores estão rodando
2. Ver console do navegador (F12)
3. Ver terminal do backend para erros
4. Limpar cache: `npm install` + `npm run dev`

---

**Tempo Estimado:** 5 minutos para setup + 2 minutos para ver tudo rodando

**Aproveite! 🎉**
