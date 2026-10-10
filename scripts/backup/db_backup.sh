#!/bin/bash
    # ==============================================================================
    # Database Automated Backup Script with Retention & SHA-256 Integrity Hash
    # ==============================================================================
    
    set -euo pipefail
    
    # 1. Definisi path dan variabel
    PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
    BACKUP_DIR="${PROJECT_DIR}/backups/mysql"
    TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"
    SECONDARY_BACKUP_DIR="${HOME}/.secure_backups/samp_db"
    CONTAINER_NAME="ljrp-mysql"
    RETENTION_DAYS=7
    
    # Load konfigurasi dari .env DULUAN (tambahkan |REMOTE_)
    if [ -f "${PROJECT_DIR}/.env" ]; then
        # shellcheck disable=SC1091
        source <(grep -E '^(MYSQL_DATABASE|MYSQL_ROOT_PASSWORD|REMOTE_)' "${PROJECT_DIR}/.env")
    fi

    # Pasang nilai default (jika tidak ada di .env)
    DB_NAME="${MYSQL_DATABASE:-jawa}"
    DB_ROOT_PASS="${MYSQL_ROOT_PASSWORD:-rootpassword}"

    REMOTE_BACKUP_ENABLED="${REMOTE_BACKUP_ENABLED:-false}"
    REMOTE_SSH_USER="${REMOTE_SSH_USER:-}"
    REMOTE_SSH_HOST="${REMOTE_SSH_HOST:-}"
    REMOTE_SSH_PORT="${REMOTE_SSH_PORT:-22}"
    REMOTE_SSH_KEY="${REMOTE_SSH_KEY:-${HOME}/.ssh/id_rsa}"
    REMOTE_BACKUP_DIR="${REMOTE_BACKUP_DIR:-/var/backups/samp_db}"
    
    BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
    CHECKSUM_FILE="${BACKUP_FILE}.sha256"
    
    mkdir -p "${BACKUP_DIR}"
    
    echo "[INFO] [$(date +'%Y-%m-%d %H:%M:%S')] Memulai backup untuk database: ${DB_NAME}..."
    
    # 2. Verifikasi status container MySQL
    if ! docker ps --filter "name=${CONTAINER_NAME}" --filter "status=running" --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "[ERROR] Container '${CONTAINER_NAME}' tidak berjalan! Backup dibatalkan." >&2
        exit 1
    fi
    
    # 3. Eksekusi mysqldump terkompresi gzip
    # --single-transaction: Menjamin konsistensi data InnoDB tanpa locking tabel (zero-downtime)
    # --quick: Streaming per baris agar hemat RAM
    echo "[INFO] Menjalankan mysqldump ke ${BACKUP_FILE}..."
    docker exec -e MYSQL_PWD="${DB_ROOT_PASS}" "${CONTAINER_NAME}" mysqldump \
        -u root \
        --single-transaction \
        --quick \
        --routines \
        --triggers \
        "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"
    
    # 4. Hitung SHA-256 Checksum (Standar Audit Integritas Data Perbankan)
    echo "[INFO] Menghitung checksum SHA-256..."
    sha256sum "${BACKUP_FILE}" > "${CHECKSUM_FILE}"
    
    FILE_SIZE="$(du -h "${BACKUP_FILE}" | cut -f1)"
    echo "[SUCCESS] Backup berhasil dibuat: ${BACKUP_FILE} (${FILE_SIZE})"
    echo "[SUCCESS] SHA256: $(cat "${CHECKSUM_FILE}")"
    
    # 5. Rotasi Backup Otomatis (Retensi 7 hari agar disk tidak penuh)
    echo "[INFO] Menjalankan rotasi backup (menghapus arsip > ${RETENTION_DAYS} hari)..."
    DELETED_COUNT=0
    while IFS= read -r old_file; do
        if [ -n "${old_file}" ]; then
            rm -f "${old_file}" "${old_file}.sha256"
            DELETED_COUNT=$((DELETED_COUNT + 1))
        fi
    done < <(find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}")
    
    echo "[INFO] Rotasi selesai: ${DELETED_COUNT} file lama dibersihkan."
    echo "[INFO] Total backup aktif: $(find "${BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -type f | wc -l) arsip."

    # 6. SINKRONISASI KE LOKASI SEKUNDER (ATURAN 3-2-1 BACKUP)
    echo "[INFO] Menyinkronkan salinan ke direktori sekunder terpisah: ${SECONDARY_BACKUP_DIR}..."
    mkdir -p "${SECONDARY_BACKUP_DIR}"

    # Gunakan rsync untuk transfer aman
    rsync -avh --progress "${BACKUP_FILE}" "${CHECKSUM_FILE}" "${SECONDARY_BACKUP_DIR}/"

    # Rotasi otomatis di direktori sekunder (retensi 7 hari)
    find "${SECONDARY_BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete
    find "${SECONDARY_BACKUP_DIR}" -name "${DB_NAME}_*.sql.gz.sha256" -type f -mtime +"${RETENTION_DAYS}" -delete

    echo "[SUCCESS] Salinan sekunder berhasil disimpan dan terisolasi di ${SECONDARY_BACKUP_DIR}!"

    # 6. SINKRONISASI KE REMOTE SERVER (OFF-SITE BACKUP VIA SSH)
    if [ "${REMOTE_BACKUP_ENABLED}" = "true" ]; then
        if [ -z "${REMOTE_SSH_HOST}" ] || [ -z "${REMOTE_SSH_USER}" ]; then
            echo "[ERROR] REMOTE_BACKUP_ENABLED aktif tetapi REMOTE_SSH_HOST atau REMOTE_SSH_USER belum diisi!" >&2
            exit 1
        fi
    
        echo "[INFO] Mentransfer salinan ke remote server (${REMOTE_SSH_USER}@${REMOTE_SSH_HOST}:${REMOTE_BACKUP_DIR})..."
    
        # 1. Pastikan direktori tujuan tersedia di remote server
        ssh -p "${REMOTE_SSH_PORT}" -i "${REMOTE_SSH_KEY}" -o StrictHostKeyChecking=accept-new \
            "${REMOTE_SSH_USER}@${REMOTE_SSH_HOST}" "mkdir -p '${REMOTE_BACKUP_DIR}'"
    
        # 2. Transfer file backup dan checksum menggunakan rsync over SSH
        rsync -avz --progress -e "ssh -p ${REMOTE_SSH_PORT} -i ${REMOTE_SSH_KEY} -o StrictHostKeyChecking=accept-new" \
            "${BACKUP_FILE}" "${CHECKSUM_FILE}" \
            "${REMOTE_SSH_USER}@${REMOTE_SSH_HOST}:${REMOTE_BACKUP_DIR}/"
    
        # 3. Rotasi di remote server (hapus backup remote yang > RETENTION_DAYS)
        echo "[INFO] Menjalankan rotasi backup di remote server..."
        ssh -p "${REMOTE_SSH_PORT}" -i "${REMOTE_SSH_KEY}" \
            "${REMOTE_SSH_USER}@${REMOTE_SSH_HOST}" \
            "find '${REMOTE_BACKUP_DIR}' -name '${DB_NAME}_*.sql.gz*' -type f -mtime +${RETENTION_DAYS} -delete"
    
        echo "[SUCCESS] Backup off-site ke remote server berhasil diselesaikan!"
    else
        echo "[INFO] Remote SSH backup dinonaktifkan (set REMOTE_BACKUP_ENABLED=true di .env jika ingin mengaktifkan transfer off-site)."
    fi