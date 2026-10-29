@echo off
cd /d "%~dp0"
echo Servidor em http://localhost:8080  (Ctrl+C para parar)
start "" http://localhost:8080
python -m http.server 8080 2>nul || py -m http.server 8080
pause
