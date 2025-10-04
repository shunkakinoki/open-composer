@ECHO OFF
SETLOCAL ENABLEDELAYEDEXPANSION

REM -----------------------------------------------------------------------------
REM Determine binary path
REM -----------------------------------------------------------------------------

IF DEFINED OPEN_COMPOSER_BIN_PATH (
    SET "resolved=%OPEN_COMPOSER_BIN_PATH%"
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

SET "name=@open-composer/cli-!platform!-!arch!"
SET "binary=open-composer.exe"

REM -----------------------------------------------------------------------------
REM Search for the binary starting from script location
REM -----------------------------------------------------------------------------

SET "resolved="
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
ECHO It seems that your package manager failed to install the right version of the open-composer CLI for your platform. You can try manually installing the "%name%" package >&2
EXIT /B 1

:execute
REM -----------------------------------------------------------------------------
REM Execute the binary with all arguments
REM -----------------------------------------------------------------------------

"%resolved%" %*
EXIT /B %ERRORLEVEL%
