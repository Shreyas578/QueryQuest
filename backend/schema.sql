-- QueryQuest Database Schema
-- Run this file to initialize the database before starting the backend.

CREATE DATABASE IF NOT EXISTS queryquest CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE queryquest;

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT           NOT NULL AUTO_INCREMENT,
  username      VARCHAR(30)   NOT NULL UNIQUE,
  email         VARCHAR(100)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  elo_rating    INT           NOT NULL DEFAULT 1000,
  avatar_color  VARCHAR(20)   NOT NULL DEFAULT '#00d4ff',
  avatar_url    VARCHAR(255)  NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_email (email),
  INDEX idx_elo   (elo_rating DESC)
);

-- ── Rooms ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id            INT           NOT NULL AUTO_INCREMENT,
  `code`          VARCHAR(10)   NOT NULL UNIQUE,
  host_id       INT           NOT NULL,
  `status`        ENUM('waiting','in_progress','finished') NOT NULL DEFAULT 'waiting',
  max_players   TINYINT       NOT NULL DEFAULT 4,
  difficulty    ENUM('easy','medium','hard','mixed')     NOT NULL DEFAULT 'mixed',
  num_questions TINYINT       NOT NULL DEFAULT 10,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_code   (`code`),
  INDEX idx_status (`status`),
  FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Room Players ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_players (
  room_id   INT      NOT NULL,
  user_id   INT      NOT NULL,
  is_ready  BOOLEAN  NOT NULL DEFAULT FALSE,
  joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Match History ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_history (
  id        INT      NOT NULL AUTO_INCREMENT,
  room_id   INT      NOT NULL,
  user_id   INT      NOT NULL,
  score     INT      NOT NULL DEFAULT 0,
  `rank`      TINYINT  NOT NULL DEFAULT 1,
  played_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_user    (user_id),
  INDEX idx_room    (room_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
