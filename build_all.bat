@echo off
cd /d "%~dp0"
title Assistant FM 27 - Build Complet

echo ==========================================
echo  Assistant FM 27 - Build Complet (PyInstaller + NSIS)
echo ==========================================
echo.

:: --- Nettoyage precedent ---
if exist "dist" rmdir /s /q "dist"
if exist "build" rmdir /s /q "build"

echo [1/2] Build PyInstaller...
python -m pyinstaller assistant_desktop.spec --clean --noconfirm

if errorlevel 1 (
    echo.
    echo ERREUR : PyInstaller a echoue.
    echo.
    pause
    exit /b 1
)

echo.
echo Generating license files...
python licences_desktop.py dist\Licences-tierces.txt
copy "C:\Program Files (x86)\NSIS\COPYING" dist\Licences-NSIS.txt >nul

echo.
echo [2/2] Build Installateur NSIS...
call build_installer.bat

if errorlevel 1 (
    echo.
    echo ERREUR : Build installateur a echoue.
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo  BUILD TERMINE AVEC SUCCES !
echo ==========================================
echo.
pause