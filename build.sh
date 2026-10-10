#!/bin/sh
# Compile the gamemode natively on Linux (no wine needed).
# On Windows use build.bat instead.
cd "$(dirname "$0")/gamemodes" || exit 1
LD_LIBRARY_PATH="$(cd ../qawno && pwd)${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
    exec ../qawno/pawncc roleplay.pwn -i../qawno/include -oroleplay.amx "$@"
