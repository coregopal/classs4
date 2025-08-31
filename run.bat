@echo off
echo Starting Grade 3 Learning Quiz Application...

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed! Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo npm is not installed! Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Create a temporary directory for the new project
if not exist package.json (
    echo Creating new React project...
    mkdir temp_project
    cd temp_project
    
    :: Initialize new React project
    npx create-react-app .
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to create React project!
        cd ..
        rmdir /s /q temp_project
        pause
        exit /b 1
    )
    
    :: Install additional dependencies
    echo Installing additional dependencies...
    npm install react-router-dom canvas-confetti --save
    
    :: Move all files to parent directory
    echo Moving files to main directory...
    cd ..
    xcopy /E /Y temp_project\* .
    rmdir /s /q temp_project
)

:: Install dependencies if node_modules is missing
if not exist node_modules\ (
    echo Installing dependencies...
    npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install dependencies!
        pause
        exit /b 1
    )
)

:: Create src directory structure if it doesn't exist
if not exist src\components mkdir src\components
if not exist src\styles mkdir src\styles
if not exist src\data mkdir src\data

:: Copy your component files if they don't exist
if not exist src\App.js copy nul src\App.js
if not exist src\components\Home.js copy nul src\components\Home.js
if not exist src\components\Quiz.js copy nul src\components\Quiz.js
if not exist src\styles\App.css copy nul src\styles\App.css
if not exist src\styles\Home.css copy nul src\styles\Home.css
if not exist src\styles\Quiz.css copy nul src\styles\Quiz.css
if not exist src\data\hindi.json copy nul src\data\hindi.json
if not exist src\data\english.json copy nul src\data\english.json
if not exist src\data\math.json copy nul src\data\math.json
if not exist src\data\science.json copy nul src\data\science.json
if not exist src\data\gk.json copy nul src\data\gk.json
if not exist src\data\ict.json copy nul src\data\ict.json
if not exist src\data\english_language.json copy nul src\data\english_language.json
if not exist src\data\english_literature.json copy nul src\data\english_literature.json
if not exist src\data\sst.json copy nul src\data\sst.json

:: Start the application
echo Starting the application...
npm start

pause 