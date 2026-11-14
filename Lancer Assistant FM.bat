@echo off
cd /d "%~dp0"
title Assistant FM 27 - Serveur local
echo ==========================================
echo  Assistant FM 27 - Serveur local
echo  Version 1.0.0-beta (2026-11-11)
echo ==========================================
echo.
echo Demarrage du serveur...
echo.
python server.py
if errorlevel 1 (
    echo.
    echo ERREUR : Le serveur n'a pas pu demarrer.
    echo Verifiez que Python est installe et que server.py est present.
    echo.
    pause
)
