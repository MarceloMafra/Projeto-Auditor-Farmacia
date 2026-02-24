@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    Auditor Digital - Local Setup
echo ========================================
echo.

REM Verificar se Node.js está instalado
node -v >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js nao encontrado. Por favor instale Node.js ^>= 18.18.0
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo OK Node.js %NODE_VERSION%

REM Backend setup
echo.
echo ========================================
echo Backend Setup
echo ========================================
cd backend

if not exist "node_modules" (
    echo.
    echo Instalando dependencias do backend...
    call npm install
    if errorlevel 1 (
        echo ERROR ao instalar backend
        cd ..
        pause
        exit /b 1
    )
    echo OK Backend instalado com sucesso
) else (
    echo OK node_modules do backend ja existe
)

cd ..

REM Frontend setup
echo.
echo ========================================
echo Frontend Setup
echo ========================================
cd frontend

if not exist "node_modules" (
    echo.
    echo Instalando dependencias do frontend...
    call npm install
    if errorlevel 1 (
        echo ERROR ao instalar frontend
        cd ..
        pause
        exit /b 1
    )
    echo OK Frontend instalado com sucesso
) else (
    echo OK node_modules do frontend ja existe
)

cd ..

echo.
echo OK Setup completo!
echo.
echo ========================================
echo Para iniciar o app, abra 2 terminais:
echo ========================================
echo.
echo Terminal 1 - Backend:
echo   cd backend ^&^& npm run dev
echo   Porta: http://localhost:3000
echo.
echo Terminal 2 - Frontend:
echo   cd frontend ^&^& npm run dev
echo   Porta: http://localhost:5173
echo.
echo ========================================
echo Aproveite!
echo ========================================
echo.

pause
