CREATE DATABASE IF NOT EXISTS MindMate;
USE MindMate;

-- =====================
-- USERS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS Users (
  user_id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','user','guest') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME DEFAULT NULL,
  avatar VARCHAR(255) DEFAULT NULL,
  dob DATE DEFAULT NULL,
  gender ENUM('male', 'female', 'other') DEFAULT NULL,
  about_me TEXT DEFAULT NULL,
  theme ENUM('light','dark') NOT NULL DEFAULT 'light'
) ENGINE=InnoDB;


-- =====================
-- MOOD ENTRIES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS MoodEntries (
  mood_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  mood_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mood_type ENUM('happy','neutral','sad','anxious','stressed') NOT NULL,
  emoji VARCHAR(10),
  note TEXT,
  -- Optional lifestyle fields (used by the Insights correlations panel)
  sleep_hours TINYINT NULL,
  exercised TINYINT NULL,
  caffeine_cups TINYINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================
-- JOURNAL ENTRIES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS JournalEntries (
  journal_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  mood_id INT NULL,
  entry_date DATE DEFAULT (CURRENT_DATE),
  title VARCHAR(200),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (mood_id) REFERENCES MoodEntries(mood_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =====================
-- BREATHING SESSIONS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS BreathingSessions (
  session_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  session_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  duration INT NOT NULL,
  actual_duration INT NULL,
  status ENUM('completed','incomplete') NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================
-- INSIGHTS TABLE
-- =====================
CREATE TABLE IF NOT EXISTS Insights (
  insight_id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  week_start DATE NOT NULL,
  summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;


CREATE TABLE IF NOT EXISTS FriendRequests (
  request_id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES Users(user_id),
  FOREIGN KEY (receiver_id) REFERENCES Users(user_id)
) ENGINE=InnoDB;

-- =====================
-- ADMIN AUDIT LOG
-- =====================
-- Every privileged admin action (delete a user / journal / mood / role change)
-- writes one row here. Designed for accountability — if anything bad happens
-- to a user's data, we can trace exactly who did what and when.
--
-- Privacy note: this log intentionally does NOT store journal content or
-- mood notes. We log that an entry was deleted, not what it said.
CREATE TABLE IF NOT EXISTS AdminAuditLog (
  log_id INT AUTO_INCREMENT PRIMARY KEY,
  admin_id INT NULL,
  admin_username VARCHAR(50) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_user_id INT NULL,
  target_username VARCHAR(50) NULL,
  target_resource_type VARCHAR(40) NULL,
  target_resource_id INT NULL,
  details TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at DESC),
  INDEX idx_action (action_type, created_at DESC),
  INDEX idx_admin (admin_id, created_at DESC)
) ENGINE=InnoDB;

-- =====================
-- PASSWORD RESETS TABLE
-- =====================
-- Stores hashed reset tokens (SHA-256 hex of the raw token sent in the URL),
-- so even if this table is leaked the raw tokens can't be reused.
CREATE TABLE IF NOT EXISTS PasswordResets (
  reset_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  INDEX idx_token_hash (token_hash),
  INDEX idx_user_active (user_id, used_at)
) ENGINE=InnoDB;

-- =====================
-- MESSAGES TABLE (Friend-only chat)
-- =====================
CREATE TABLE IF NOT EXISTS Messages (
  message_id INT AUTO_INCREMENT PRIMARY KEY,
  sender_id INT NOT NULL,
  recipient_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMP NULL,
  FOREIGN KEY (sender_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (recipient_id) REFERENCES Users(user_id) ON DELETE CASCADE,
  INDEX idx_pair (sender_id, recipient_id, created_at),
  INDEX idx_pair_rev (recipient_id, sender_id, created_at),
  INDEX idx_unread (recipient_id, read_at)
) ENGINE=InnoDB;
