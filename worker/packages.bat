@echo off
setlocal

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
  echo Node.js is not installed. Please install Node.js from https://nodejs.org/
  pause
  exit /b 1
)

echo Installing Node.js packages...
npm install
echo.
echo Node.js packages installation complete.
pause