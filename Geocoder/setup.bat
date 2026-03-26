@echo off
echo ========================================================
echo   CSV Geocoder Setup
echo ========================================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo + Node.js found: %NODE_VERSION%
echo.

REM Install dependencies
echo Installing dependencies...
call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo + Dependencies installed successfully!
    echo.
    echo ========================================================
    echo   Ready to Start!
    echo ========================================================
    echo.
    echo Run the following command to start the proxy server:
    echo.
    echo   node geocode-proxy-server.js
    echo.
    echo Then open CSV_Geocoder.html in your browser.
    echo.
) else (
    echo.
    echo X Installation failed!
    echo.
    pause
    exit /b 1
)

pause
