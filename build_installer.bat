@echo off
cd /d "%~dp0"
title Assistant FM 27 - Build Installateur

set BUILD_DIR=%~dp0dist
set OUTPUT_FILE=%~dp0AssistantFM-27-Setup.exe

echo ==========================================
echo  Assistant FM 27 - Build Installateur NSIS
echo ==========================================
echo.
echo BUILD_DIR : %BUILD_DIR%
echo OUTPUT_FILE : %OUTPUT_FILE%
echo.

if not exist "%BUILD_DIR%" (
    echo ERREUR : Le dossier %BUILD_DIR% n'existe pas.
    echo Lancez d'abord le build de l'application (PyInstaller) pour generer les executables.
    echo.
    pause
    exit /b 1
)

if not exist "%BUILD_DIR%\AssistantFM.exe" (
    echo ERREUR : AssistantFM.exe introuvable dans %BUILD_DIR%
    echo Lancez d'abord le build de l'application.
    echo.
    pause
    exit /b 1
)

if not exist "%BUILD_DIR%\AssistantFM-extracteur.exe" (
    echo ERREUR : AssistantFM-extracteur.exe introuvable dans %BUILD_DIR%
    echo Lancez d'abord le build de l'application.
    echo.
    pause
    exit /b 1
)

echo Compilation NSIS en cours...
makensis /DBUILD_DIR="%BUILD_DIR%" /DOUTPUT_FILE="%OUTPUT_FILE%" assistant_installateur_nsis.nsi

if errorlevel 1 (
    echo.
    echo ERREUR : La compilation NSIS a echoue.
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo  Installateur cree avec succes !
echo  %OUTPUT_FILE%
echo ==========================================
echo.
pause