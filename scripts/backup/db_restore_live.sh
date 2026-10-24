#!/bin/bash
# ==============================================================================
# Restore Live Database from a Selected Backup
# DESTRUCTIVE: drops and recreates the live database.
#
# Usage:
#   ./scripts/backup/db_restore_live.sh
#   ./scripts/backup/db_restore_live.sh backups/mysql/jawa_YYYYMMDD_HHMMSS.sql.gz
# ==============================================================================

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
BACKUP_DIR="${PROJECT_DIR}/backups/mysql"
CONTAINER_NAME="ljrp-mysql"
SERVICE_CONTAINERS=("ljrp-samp" "ljrp-web")
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"

# 1. Load kredensial dari .env
if [ ! -f "${PROJECT_DIR}/.env" ]; then
    echo "[ERROR] .env tidak ditemukan: ${PROJECT_DIR}/.env" >&2
    exit 1
fi

# shellcheck disable=SC1091
source <(grep -E '^(MYSQL_DATABASE|MYSQL_ROOT_PASSWORD)=' "${PROJECT_DIR}/.env" | tr -d '\r')

DB_NAME="${MYSQL_DATABASE:-jawa}"
DB_ROOT_PASS="${MYSQL_ROOT_PASSWORD:-}"

if [ -z "${DB_ROOT_PASS}" ]; then
    echo "[ERROR] MYSQL_ROOT_PASSWORD tidak diset di .env" >&2
    exit 1
fi

if [[ ! "${DB_NAME}" =~ ^[A-Za-z0-9_]+$ ]]; then
    echo "[ERROR] Nama database tidak valid: ${DB_NAME}" >&2
    exit 1
fi

if ! docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "[ERROR] Container '${CONTAINER_NAME}' tidak berjalan." >&2
    exit 1
fi

if [ ! -d "${BACKUP_DIR}" ]; then
    echo "[ERROR] Folder backup tidak ditemukan: ${BACKUP_DIR}" >&2
    exit 1
fi

# 2. Pilih backup: argumen opsional, atau menu interaktif
if [ "$#" -gt 1 ]; then
    echo "Usage: $0 [backup-file.sql.gz]" >&2
    exit 2
fi

if [ "$#" -eq 1 ]; then
    BACKUP="$(realpath -e "$1" 2>/dev/null || true)"
    if [ -z "${BACKUP}" ] || [ ! -f "${BACKUP}" ]; then
        echo "[ERROR] File backup tidak ditemukan: $1" >&2
        exit 1
    fi
    case "${BACKUP}" in
        "${BACKUP_DIR}"/*) ;;
        *)
            echo "[ERROR] Backup harus berada di ${BACKUP_DIR}" >&2
            exit 1
            ;;
    esac
else
    mapfile -t BACKUPS < <(
        find "${BACKUP_DIR}" -maxdepth 1 -type f -name '*.sql.gz' -printf '%T@\t%p\n' \
            | sort -nr \
            | cut -f2-
    )

    if [ "${#BACKUPS[@]}" -eq 0 ]; then
        echo "[ERROR] Tidak ada backup *.sql.gz di ${BACKUP_DIR}" >&2
        exit 1
    fi

    echo "Backup tersedia:"
    for i in "${!BACKUPS[@]}"; do
        printf '  %2d) %s (%s)\n' \
            "$((i + 1))" \
            "$(basename "${BACKUPS[$i]}")" \
            "$(du -h "${BACKUPS[$i]}" | cut -f1)"
    done

    read -r -p "Pilih nomor backup: " CHOICE
    if ! [[ "${CHOICE}" =~ ^[0-9]+$ ]]; then
        echo "[ERROR] Pilihan tidak valid." >&2
        exit 1
    fi
    CHOICE=$((10#${CHOICE}))
    if [ "${CHOICE}" -lt 1 ] || [ "${CHOICE}" -gt "${#BACKUPS[@]}" ]; then
        echo "[ERROR] Pilihan tidak valid." >&2
        exit 1
    fi

    BACKUP="${BACKUPS[$((CHOICE - 1))]}"
fi

CHECKSUM_FILE="${BACKUP}.sha256"

echo
echo "[INFO] Database live : ${DB_NAME}"
echo "[INFO] Backup dipilih: ${BACKUP}"

# 3. Verifikasi checksum dan gzip sebelum menyentuh database live
if [ -f "${CHECKSUM_FILE}" ]; then
    EXPECTED_HASH="$(awk 'NR==1 {print $1}' "${CHECKSUM_FILE}")"
    ACTUAL_HASH="$(sha256sum "${BACKUP}" | awk '{print $1}')"
    if [ "${EXPECTED_HASH}" != "${ACTUAL_HASH}" ]; then
        echo "[ERROR] Checksum SHA-256 tidak cocok. Restore dibatalkan." >&2
        exit 1
    fi
    echo "[SUCCESS] Checksum SHA-256 cocok."
else
    echo "[WARN] File checksum tidak ditemukan: ${CHECKSUM_FILE}"
fi

echo "[INFO] Menguji integritas gzip..."
gzip -t "${BACKUP}"
echo "[SUCCESS] Arsip gzip valid."

CURRENT_TABLES="$(
    docker exec -e MYSQL_PWD="${DB_ROOT_PASS}" "${CONTAINER_NAME}" \
        mysql -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${DB_NAME}';"
)"
CURRENT_TABLES="${CURRENT_TABLES:-0}"

# 4. Konfirmasi eksplisit
echo
echo "PERINGATAN: database live '${DB_NAME}' (${CURRENT_TABLES} tabel) akan DIHAPUS dan diganti."
echo "Backup: $(basename "${BACKUP}")"
echo "Service yang dihentikan sementara: ${SERVICE_CONTAINERS[*]}"
read -r -p "Ketik nama database '${DB_NAME}' untuk melanjutkan: " CONFIRM

if [ "${CONFIRM}" != "${DB_NAME}" ]; then
    echo "[INFO] Dibatalkan."
    exit 1
fi

# 5. Catat service yang sedang berjalan, lalu hentikan agar tidak ada write saat restore
declare -A WAS_RUNNING=()
for SERVICE in "${SERVICE_CONTAINERS[@]}"; do
    if [ "$(docker inspect -f '{{.State.Running}}' "${SERVICE}" 2>/dev/null || echo false)" = "true" ]; then
        WAS_RUNNING["${SERVICE}"]=1
        echo "[INFO] Menghentikan ${SERVICE}..."
        if ! docker stop "${SERVICE}" >/dev/null; then
            echo "[ERROR] Gagal menghentikan ${SERVICE}. Restore dibatalkan." >&2
            for STARTED_SERVICE in "${SERVICE_CONTAINERS[@]}"; do
                if [ "${WAS_RUNNING["${STARTED_SERVICE}"]:-0}" = "1" ]; then
                    docker start "${STARTED_SERVICE}" >/dev/null || true
                fi
            done
            exit 1
        fi
    fi
done

start_services() {
    for SERVICE in "${SERVICE_CONTAINERS[@]}"; do
        if [ "${WAS_RUNNING["${SERVICE}"]:-0}" = "1" ]; then
            echo "[INFO] Menjalankan kembali ${SERVICE}..."
            docker start "${SERVICE}" >/dev/null || echo "[ERROR] Gagal menjalankan ${SERVICE}" >&2
        fi
    done
}

reset_database() {
    docker exec -e MYSQL_PWD="${DB_ROOT_PASS}" "${CONTAINER_NAME}" \
        mysql -u root -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`; CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
}

restore_from_file() {
    local FILE="$1"
    gunzip -c "${FILE}" | docker exec -i -e MYSQL_PWD="${DB_ROOT_PASS}" "${CONTAINER_NAME}" \
        mysql -u root --default-character-set=utf8mb4 --max-allowed-packet=64M "${DB_NAME}"
}

# 6. Safety backup database live sebelum drop
SAFETY_DIR="${BACKUP_DIR}/pre_restore"
SAFETY_BACKUP="${SAFETY_DIR}/${DB_NAME}_pre_restore_${TIMESTAMP}.sql.gz"
if ! mkdir -p "${SAFETY_DIR}"; then
    echo "[ERROR] Gagal membuat folder safety backup: ${SAFETY_DIR}" >&2
    start_services
    exit 1
fi

echo "[INFO] Membuat safety backup: ${SAFETY_BACKUP}"
if ! docker exec -e MYSQL_PWD="${DB_ROOT_PASS}" "${CONTAINER_NAME}" \
    mysqldump -u root \
        --single-transaction \
        --quick \
        --routines \
        --triggers \
        --default-character-set=utf8mb4 \
        "${DB_NAME}" | gzip -9 > "${SAFETY_BACKUP}"; then
    rm -f "${SAFETY_BACKUP}"
    echo "[ERROR] Safety backup gagal. Restore dibatalkan." >&2
    start_services
    exit 1
fi

if ! gzip -t "${SAFETY_BACKUP}"; then
    rm -f "${SAFETY_BACKUP}"
    echo "[ERROR] Safety backup tidak valid. Restore dibatalkan." >&2
    start_services
    exit 1
fi

if ! sha256sum "${SAFETY_BACKUP}" > "${SAFETY_BACKUP}.sha256"; then
    echo "[ERROR] Gagal membuat checksum safety backup. Restore dibatalkan." >&2
    start_services
    exit 1
fi
echo "[SUCCESS] Safety backup siap: ${SAFETY_BACKUP}"

# 7. Drop, recreate, dan import
echo "[INFO] Menghapus dan membuat ulang database '${DB_NAME}'..."
if ! reset_database; then
    echo "[ERROR] Gagal reset database. Mencoba rollback..." >&2
    if reset_database && restore_from_file "${SAFETY_BACKUP}"; then
        echo "[SUCCESS] Rollback berhasil. Database live kembali seperti sebelumnya."
        start_services
    else
        echo "[CRITICAL] Rollback gagal. Service dibiarkan berhenti. Safety backup: ${SAFETY_BACKUP}" >&2
    fi
    exit 1
fi

echo "[INFO] Mengimpor backup..."
if ! restore_from_file "${BACKUP}"; then
    echo "[ERROR] Import gagal. Mengembalikan safety backup..." >&2
    if reset_database && restore_from_file "${SAFETY_BACKUP}"; then
        echo "[SUCCESS] Rollback berhasil. Database live kembali seperti sebelumnya."
        start_services
    else
        echo "[CRITICAL] Rollback gagal. Service dibiarkan berhenti. Safety backup: ${SAFETY_BACKUP}" >&2
    fi
    exit 1
fi

TABLE_COUNT="$(
    docker exec -e MYSQL_PWD="${DB_ROOT_PASS}" "${CONTAINER_NAME}" \
        mysql -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${DB_NAME}';"
)"
TABLE_COUNT="${TABLE_COUNT:-0}"

if [ "${TABLE_COUNT}" -lt 1 ]; then
    echo "[ERROR] Import selesai tetapi tidak ada tabel. Mengembalikan safety backup..." >&2
    if reset_database && restore_from_file "${SAFETY_BACKUP}"; then
        echo "[SUCCESS] Rollback berhasil. Database live kembali seperti sebelumnya."
        start_services
    else
        echo "[CRITICAL] Rollback gagal. Service dibiarkan berhenti. Safety backup: ${SAFETY_BACKUP}" >&2
    fi
    exit 1
fi

echo "[SUCCESS] Restore selesai: ${TABLE_COUNT} tabel di database '${DB_NAME}'."
echo "[INFO] Safety backup sebelum restore: ${SAFETY_BACKUP}"

start_services
echo "[SUCCESS] Service sudah dijalankan kembali."
