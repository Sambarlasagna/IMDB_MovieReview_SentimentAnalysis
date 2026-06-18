@echo off
chcp 65001 >nul
echo Starting CineScope backend...
echo Make sure PostgreSQL is running and backend\.env credentials are correct.
echo.
set PYTHONUTF8=1
d:\Programming\Projects\ml-venv\Scripts\uvicorn.exe backend.app:app --host 0.0.0.0 --port 8000 --reload
