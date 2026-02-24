#!/bin/bash

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Auditor Digital - Local Setup${NC}"
echo -e "${BLUE}========================================${NC}"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}❌ Node.js não encontrado. Por favor instale Node.js >= 18.18.0${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v)${NC}"

# Backend setup
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Backend Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd backend

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⏳ Instalando dependências do backend...${NC}"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backend instalado com sucesso${NC}"
    else
        echo -e "${YELLOW}❌ Erro ao instalar backend${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ node_modules do backend já existe${NC}"
fi

cd ..

# Frontend setup
echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🎨 Frontend Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd frontend

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⏳ Instalando dependências do frontend...${NC}"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Frontend instalado com sucesso${NC}"
    else
        echo -e "${YELLOW}❌ Erro ao instalar frontend${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ node_modules do frontend já existe${NC}"
fi

cd ..

echo -e "\n${GREEN}✅ Setup completo!${NC}"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🚀 Para iniciar o app, abra 2 terminais:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "\n${YELLOW}Terminal 1 - Backend:${NC}"
echo -e "  ${GREEN}cd backend && npm run dev${NC}"
echo -e "  ${YELLOW}Porta: http://localhost:3000${NC}"

echo -e "\n${YELLOW}Terminal 2 - Frontend:${NC}"
echo -e "  ${GREEN}cd frontend && npm run dev${NC}"
echo -e "  ${YELLOW}Porta: http://localhost:5173${NC}"

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Aproveite! 🎉${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
