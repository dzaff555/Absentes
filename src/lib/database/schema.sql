-- ========================================================
-- Database Schema for Daily Attendance System
-- MySQL 8.0+ / MariaDB
-- ========================================================

CREATE DATABASE IF NOT EXISTS daily_attendance 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE daily_attendance;

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  real_name VARCHAR(100) NULL,
  email VARCHAR(100) NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('USER', 'ADMIN') NOT NULL DEFAULT 'USER',
  status ENUM('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
  attendance_role ENUM('CSOT', 'PPKA', 'MASINIS', 'PKD', 'PJL') NOT NULL DEFAULT 'CSOT',
  profile_photo LONGTEXT NULL,
  roblox_username VARCHAR(100) NULL,
  discord_username VARCHAR(100) NULL,
  profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_username (username),
  INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: attendance
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  attendance_role ENUM('CSOT', 'PPKA', 'MASINIS', 'PKD', 'PJL') NOT NULL DEFAULT 'CSOT',
  discord_username VARCHAR(100) NOT NULL,
  roblox_username VARCHAR(100) NOT NULL,
  attendance_date DATE NOT NULL,
  attendance_time TIME NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Hadir',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_daily_attendance UNIQUE (user_id, attendance_date),
  INDEX idx_attendance_date (attendance_date),
  INDEX idx_attendance_user_date (user_id, attendance_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: staff warnings
CREATE TABLE IF NOT EXISTS staff_warnings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  issued_by INT NULL,
  reason VARCHAR(1000) NOT NULL,
  read_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_staff_warning_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_staff_warning_issuer FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_staff_warnings_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: admin attendance inbox read cursor
CREATE TABLE IF NOT EXISTS admin_attendance_inbox (
  admin_id INT PRIMARY KEY,
  read_through_id INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_admin_attendance_inbox_user FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
