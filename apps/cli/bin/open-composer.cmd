@ECHO OFF
SETLOCAL ENABLEDELAYEDEXPANSION

REM -----------------------------------------------------------------------------
REM Determine binary path
REM -----------------------------------------------------------------------------

IF DEFINED OPENCOMPOSER_BIN_PATH (
    SET "resolved=%OPENCOMPOSER_BIN_PATH%"
    GOTO :execute
)

REM -----------------------------------------------------------------------------
REM Get the directory of this script
REM -----------------------------------------------------------------------------

SET "script_dir=%~dp0"
SET "script_dir=%script_dir:~0,-1%"

REM -----------------------------------------------------------------------------
REM Detect platform and architecture
REM -----------------------------------------------------------------------------

SET "platform=win32"
IF "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    SET "arch=x64"
) ELSE IF "%PROCESSOR_ARCHITECTURE%"=="ARM64" (
    SET "arch=arm64"
) ELSE IF "%PROCESSOR_ARCHITECTURE%"=="x86" (
    SET "arch=x86"
) ELSE (
    SET "arch=x64"
)

SET "binary=open-composer.exe"

REM -----------------------------------------------------------------------------
REM Look for binary in multiple locations
REM -----------------------------------------------------------------------------

REM First check if binary exists in the same directory (postinstall places it here)
IF EXIST "%script_dir%\%binary%" (
    SET "resolved=%script_dir%\%binary%"
    GOTO :execute
)

REM Then search upwards for node_modules
SET "name=@open-composer/cli-!platform!-!arch!"
SET "current_dir=%script_dir%"

:search_loop
SET "candidate=%current_dir%\node_modules\%name%\bin\%binary%"
IF EXIST "%candidate%" (
    SET "resolved=%candidate%"
    GOTO :execute
)

REM Move up one directory
FOR %%i IN ("%current_dir%") DO SET "parent_dir=%%~dpi"
SET "parent_dir=%parent_dir:~0,-1%"

REM Check if we've reached the root
IF "%current_dir%"=="%parent_dir%" GOTO :not_found
SET "current_dir=%parent_dir%"
GOTO :search_loop

:not_found
ECHO Error: Binary not found for %name%. Please ensure the correct version is installed. >&2
EXIT /B 1

:execute
REM -----------------------------------------------------------------------------
REM Execute the binary with all arguments
REM -----------------------------------------------------------------------------

"%resolved%" %*
EXIT /B %ERRORLEVEL%
