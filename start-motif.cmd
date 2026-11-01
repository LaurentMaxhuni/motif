@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.13 or newer, then run this launcher again.
  pause
  exit /b 1
)
if not exist "node_modules\cheerio" (
  echo Dependencies missing. Run npm ci in this folder first.
  pause
  exit /b 1
)
echo Open http://127.0.0.1:3333 in your browser. Press Ctrl+C to stop.
call npm start
pause
