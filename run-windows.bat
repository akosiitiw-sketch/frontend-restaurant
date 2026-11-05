@echo off
cd /d "%~dp0"
where docker >nul 2>nul
if errorlevel 1 (
  echo Docker was not found. Install Docker Desktop or follow README.md for manual setup.
  pause
  exit /b 1
)
docker compose up --build
