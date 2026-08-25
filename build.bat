@echo off
rem Compile the gamemode on Windows using the bundled pawncc.exe.
rem On Linux use build.sh instead.
cd /d "%~dp0gamemodes"
..\qawno\pawncc.exe roleplay.pwn -i../qawno/include -oroleplay.amx %*
