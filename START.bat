@echo off
title DealMind AI - Startup

echo.
echo  ============================================
echo    DealMind AI - Starting all services...
echo  ============================================
echo.

set ROOT=%~dp0

REM ── 1. Start Backend ─────────────────────────────────────────────────────
echo [1/3] Starting Backend API on http://localhost:8000 ...
start "DealMind Backend" cmd /k "cd /d %ROOT%backend && .venv\Scripts\uvicorn.exe app.main:app --port 8000 --reload"

REM Give backend 3 seconds to start
timeout /t 3 /nobreak >nul

REM ── 2. Start Frontend ────────────────────────────────────────────────────
echo [2/3] Starting Frontend on http://localhost:5173 ...
start "DealMind Frontend" cmd /k "cd /d %ROOT%frontend && npm run dev"

REM Give frontend 5 seconds to start
timeout /t 5 /nobreak >nul

REM ── 3. Open Browser ──────────────────────────────────────────────────────
echo [3/3] Opening browser...
start "" "http://localhost:5173"

echo.
echo  ============================================
echo    DealMind AI is running!
echo    Open: http://localhost:5173
echo  ============================================
echo.
echo  To stop: close the two command windows.
echo.
pause
