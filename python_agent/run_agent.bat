@echo off
title OmniAgent Launcher for Windows
echo ========================================================
echo        Starting OmniAgent Personal Assistant
echo ========================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python is not installed or not added to PATH!
    echo Please install Python from https://www.python.org/downloads/
    echo --------------------------------------------------------
    echo IMPORTANT: Remember to check the box:
    echo            [X] "Add python.exe to PATH"
    echo --------------------------------------------------------
    pause
    exit /b
)

echo [1/3] Python detected!
echo [2/3] Checking and installing required packages (this only takes a moment)...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies. Check your internet connection.
    pause
    exit /b
)

echo [3/3] Launching OmniAgent Web App in your browser...
echo.
streamlit run app.py
pause
