# 🚀 Quick Start - Rodar Agora (2 minutos)

## 1️⃣ Abra 2 Terminais

### Terminal 1 (Backend - deixa aberto)
```bash
cd backend
npm install  # Primeira vez (leva ~1-2 min)
npm run dev
```

✅ Você verá:
```
Server running at http://localhost:3000
```

### Terminal 2 (Frontend - deixa aberto)
```bash
cd frontend
npm install  # Primeira vez (leva ~1-2 min)
npm run dev
```

✅ Você verá:
```
  ➜  Local:   http://localhost:5173/
```

## 2️⃣ Abra o Navegador

Vá para: **http://localhost:5173**

## 3️⃣ Veja a Mágica! ✨

Você vai ver:
- Dashboard com 8 KPIs
- Gráficos interativos
- Tabela de alertas
- Filtros de data
- Tema dark corporativo

## 🎯 O que Testar

1. ✅ Filtros de data (7, 30, 90 dias)
2. ✅ Gráficos (clique neles)
3. ✅ Tabela (scroll horizontal/vertical)
4. ✅ Botão "Atualizar" (refetch)
5. ✅ Redimensionar navegador (responsividade)
6. ✅ Navegar para outras páginas (Alertas, Operadores, etc)

## ⚡ Atalhos

| Ação | Comando |
|------|---------|
| Recarregar | F5 |
| DevTools | F12 |
| Limpeza cache | Ctrl+Shift+Delete |
| Full screen | F11 |

## 🔧 Se Algo Não Funcionar

### Backend não conecta?
```bash
# Terminal Backend:
Ctrl+C para parar
npm run dev  # Reiniciar
```

### Frontend em branco?
```bash
# DevTools (F12) > Console:
- Ver erro de conexão?
- Verificar se backend está rodando
```

### Porta ocupada?
```bash
# Terminal novo:
netstat -ano | findstr :3000  # Backend
netstat -ano | findstr :5173  # Frontend
taskkill /PID <PID> /F
```

### node_modules corrompido?
```bash
cd backend
rm -r node_modules package-lock.json
npm install
```

## 📊 Dados Que Você Vai Ver

### KPIs (com dados mock se sem DB)
- Alertas Pendentes: 0-5
- Alto Risco: 0-3
- Taxa Cancelamento: 0-5%
- Detecções Ativas: 6/6

### Gráficos
- Pizza: Distribuição de alertas
- Pizza: Distribuição de risco

### Tabela
- Últimos 10 alertas
- Se sem DB: tabela vazia

## 🎨 Tema

- Fundo escuro (slate-950)
- Cores: Azul, laranja, vermelho
- Bem responsivo
- Totalmente dark mode

## 📱 Responsividade

Redimensione a janela:
- **Mobile**: 1 coluna
- **Tablet**: 2 colunas
- **Desktop**: 4 colunas

Veja como adapta em tempo real!

## 🔄 Hot Reload

Se alterar código:
- Frontend: Atualiza automático (Vite)
- Backend: Reinicia automático (tsx watch)

## 🎬 DevTools

Abra F12 para:
- Ver Network requests (tRPC)
- Inspecionar elementos React
- Ver console logs

## 🎉 Pronto!

Agora você tem:
- ✅ Backend rodando (tRPC)
- ✅ Frontend rodando (React)
- ✅ Dashboard com dados
- ✅ Gráficos interativos
- ✅ Tema profissional

---

**Tempo total:** ~3-5 minutos (primeira vez com npm install)

**Próximo:** Explorar, testar, dar feedback! 🚀
