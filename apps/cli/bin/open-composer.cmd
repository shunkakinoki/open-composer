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
REM Detect architecture
REM -----------------------------------------------------------------------------

SET "platform=windows"
IF "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    SET "arch=x64"
) ELSE IF "%PROCESSOR_ARCHITECTURE%"=="ARM64" (
    SET "arch=arm64"
) ELSE IF "%PROCESSOR_ARCHITECTURE%"=="x86" (
    SET "arch=x86"
) ELSE (
    SET "arch=x64"
)

REM -----------------------------------------------------------------------------
REM Set binary path
REM -----------------------------------------------------------------------------

SET "binary=open-composer.exe"
SET "resolved=%~dp0..\node_modules\@open-composer\cli-windows-!arch!\bin\!binary!"

REM -----------------------------------------------------------------------------
REM Check if binary exists
REM -----------------------------------------------------------------------------

IF NOT EXIST "!resolved!" (
    ECHO Error: Binary not found for @open-composer/cli-windows-!arch!. Please ensure the correct version is installed. >&2
    EXIT /B 1
)

:execute
REM -----------------------------------------------------------------------------
REM Execute the binary with all arguments in the current console window
REM -----------------------------------------------------------------------------

START /B /WAIT "" "!resolved!" %*
EXIT /B %ERRORLEVEL%
