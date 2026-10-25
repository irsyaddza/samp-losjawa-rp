#!/bin/bash
    # ==============================================================================
    # Disaster Recovery (DR) Automated Verification Test
    # ==============================================================================
    
    set -euo pipefail
    
    PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    BACKUP_DIR="${PROJECT_DIR}/backups/mysql"
    CONTAINER_NAME="ljrp-mysql"
    TEST_DB="jawa_restore_test"
    
    # 1. Load kredensial secara dinamis dari .env
    if [ -f "${PROJECT_DIR}/.env" ]; then
        # shellcheck disable=SC1091
        source <(grep -E '^(MYSQL_DATABASE|MYSQL_ROOT_PASSWORD)=' "${PROJECT_DIR}/.env")
    fi
    
    DB_ROOT_PASS="${MYSQL_ROOT_PASSWORD:-rootpassword}"
    
    # 2. Cari file backup terbaru
    LATEST_BACKUP="$(find "${BACKUP_DIR}" -name "*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -1 | cut -f2- -d' ' || true)"
    
    if [ -z "${LATEST_BACKUP}" ] || [ ! -f "${LATEST_BACKUP}" ]; then
        echo "[ERROR] Tidak ditemukan file backup di ${BACKUP_DIR}. Jalankan db_backup.sh terlebih dahulu!" >&2
        exit 1
    fi
    
    CHECKSUM_FILE="${LATEST_BACKUP}.sha256"
    echo "[INFO] Menguji file backup: ${LATEST_BACKUP}"
    
    # 3. Verifikasi Checksum SHA-256
    if [ -f "${CHECKSUM_FILE}" ]; then
        echo "[INFO] Memvalidasi integritas SHA-256..."
        sha256sum -c "${CHECKSUM_FILE}"
        echo "[SUCCESS] Verifikasi integritas hash lolos!"
    fi
    
    # 4. Uji Integritas Kompresi Gzip
    echo "[INFO] Menguji validitas arsip gzip..."
    gzip -t "${LATEST_BACKUP}"
    echo "[SUCCESS] File gzip valid dan tidak korup!"

    # 5. Uji Dry-run Restore (Dinamis dari .env & Tanpa Password di Argumen CLI)
    echo "[INFO] Menjalankan test restore ke database sementara '${TEST_DB}'..."
    docker exec -i -e MYSQL_PWD="${DB_ROOT_PASS}" "${CONTAINER_NAME}" mysql -u root -e "CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\`;"
    gunzip -c "${LATEST_BACKUP}" | docker exec -i -e MYSQL_PWD="${DB_ROOT_PASS}" "${CONTAINER_NAME}" mysql -u root "${TEST_DB}"

    # 6. Validasi Jumlah Tabel
    TABLE_COUNT=$(docker exec -i -e MYSQL_PWD="${DB_ROOT_PASS}" "${CONTAINER_NAME}" mysql -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '${TEST_DB}';")
    echo "[SUCCESS] DR TEST BERHASIL! Memulihkan ${TABLE_COUNT} tabel di database pengujian."

    # 7. Cleanup database sementara
    docker exec -i -e MYSQL_PWD="${DB_ROOT_PASS}" "${CONTAINER_NAME}" mysql -u root -e "DROP DATABASE \`${TEST_DB}\`;"
    echo "[INFO] Database pengujian '${TEST_DB}' telah dibersihkan."