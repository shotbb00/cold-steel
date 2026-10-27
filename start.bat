@echo off
rem Development start: installs the libraries on the first run, then starts Vite's dev server
rem (hot reload) and opens the game in the browser. Needs Node.js (nodejs.org, LTS).
rem For sharing, `npm run build` makes a dist\ folder that any static host can serve.
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed - get the LTS version from https://nodejs.org and run this again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo First run: installing libraries...
  call npm install || (pause & exit /b 1)
)
call npm run dev
