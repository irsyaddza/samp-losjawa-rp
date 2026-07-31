-- ─────────────────────────────────────────────────────────────────────────────
--  Init SQL — dijalankan otomatis saat MySQL container pertama kali dibuat
--  Letakkan file .sql dump database Anda di folder ini (mysql/init/)
--  File dieksekusi secara urut berdasarkan nama (01_xxx.sql, 02_xxx.sql, dst.)
-- ─────────────────────────────────────────────────────────────────────────────

-- Pastikan database dan charset sudah benar
CREATE DATABASE IF NOT EXISTS `jawa`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE `jawa`;

-- ─── Contoh: Buat tabel minimal agar server tidak crash saat start ───────────
-- (Hapus atau ganti bagian ini dengan dump database asli Anda)

-- Jika Anda punya file dump SQL, taruh di folder mysql/init/ dengan nama:
--   01_schema.sql  → struktur tabel
--   02_data.sql    → data awal (opsional)
-- MySQL akan menjalankannya secara otomatis saat container pertama dibuat.
