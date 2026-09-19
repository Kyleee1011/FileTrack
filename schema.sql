-- ============================================================
-- FileTrack Database Schema
-- Sensitive Document Repository & LAN Scanner Management
-- ============================================================

CREATE DATABASE IF NOT EXISTS filetrack
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE filetrack;

-- 1. Users Table (Single-Admin Authentication)
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Folders Table (Virtual Directory Hierarchy)
CREATE TABLE IF NOT EXISTS folders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    parent_id INT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_folder_parent (parent_id),
    CONSTRAINT fk_folders_parent
        FOREIGN KEY (parent_id)
        REFERENCES folders(id)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Files Table (Uploaded & Scanned Document Metadata)
CREATE TABLE IF NOT EXISTS files (
    id INT PRIMARY KEY AUTO_INCREMENT,
    folder_id INT NULL,
    display_name VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL UNIQUE,
    mime_type VARCHAR(100),
    file_format VARCHAR(10),
    size_bytes BIGINT DEFAULT 0,
    source VARCHAR(20) DEFAULT 'upload',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_files_folder (folder_id),
    INDEX idx_files_display_name (display_name),
    CONSTRAINT fk_files_folder
        FOREIGN KEY (folder_id)
        REFERENCES folders(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Access Logs Table (Audit Trail for Views & Downloads)
CREATE TABLE IF NOT EXISTS access_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    file_id INT NULL,
    action VARCHAR(50) NOT NULL,
    details VARCHAR(255) NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_logs_file (file_id),
    CONSTRAINT fk_logs_file
        FOREIGN KEY (file_id)
        REFERENCES files(id)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Default Admin User Seed
-- Default credentials:
-- Username: admin
-- Password: admin123
-- (Uses OWASP-recommended PBKDF2-HMAC-SHA256 with 260,000 iterations)
INSERT INTO users (id, username, password_hash)
VALUES (
    1,
    'admin',
    'pbkdf2_sha256$260000$4a8e2b9c1f7d5e3a8c2f1e4b9a7c5d3e$7102b17b01a72285b9d562c14af39c25ce695a302b0e332331fddc6252333b58'
)
ON DUPLICATE KEY UPDATE username=username;
