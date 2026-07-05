#!/bin/bash
set -e

# ─────────────────────────────────────────────────────────────────────────────
#  Entrypoint SA-MP Server
#  Menunggu MySQL siap, lalu jalankan samp-server
# ─────────────────────────────────────────────────────────────────────────────

MYSQL_HOST="${MYSQL_HOST:-mysql}"
MYSQL_PORT="${MYSQL_PORT:-3306}"

echo "[ENTRYPOINT] Menunggu MySQL di ${MYSQL_HOST}:${MYSQL_PORT}..."

# Tunggu sampai port MySQL terbuka (max 60 detik)
TIMEOUT=60
ELAPSED=0
until nc -z "$MYSQL_HOST" "$MYSQL_PORT" 2>/dev/null; do
    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo "[ENTRYPOINT] ERROR: MySQL tidak merespons setelah ${TIMEOUT}s. Keluar."
        exit 1
    fi
    echo "[ENTRYPOINT] MySQL belum siap... mencoba lagi dalam 2 detik (${ELAPSED}s/${TIMEOUT}s)"
    sleep 2
    ELAPSED=$((ELAPSED + 2))
done

echo "[ENTRYPOINT] MySQL siap! Memulai open.mp server..."

# Jalankan open.mp server
exec ./omp-server
