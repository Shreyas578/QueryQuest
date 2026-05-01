-- QueryQuest Database Schema (PostgreSQL)
-- Run this file to initialize the database before starting the backend.

-- Drop types only if you want a complete reset. For auto-init, we use DO blocks.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_status') THEN
        CREATE TYPE room_status AS ENUM ('waiting', 'in_progress', 'finished');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_difficulty') THEN
        CREATE TYPE game_difficulty AS ENUM ('easy', 'medium', 'hard', 'mixed');
    END IF;
END $$;

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL        PRIMARY KEY,
  username      VARCHAR(30)   NOT NULL UNIQUE,
  email         VARCHAR(100)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  elo_rating    INT           NOT NULL DEFAULT 1000,
  avatar_color  VARCHAR(20)   NOT NULL DEFAULT '#00d4ff',
  avatar_url    VARCHAR(255)  NULL,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_elo ON users (elo_rating DESC);

-- ── Rooms ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
  id            SERIAL        PRIMARY KEY,
  code          VARCHAR(10)   NOT NULL UNIQUE,
  host_id       INT           NOT NULL,
  status        room_status   NOT NULL DEFAULT 'waiting',
  max_players   SMALLINT      NOT NULL DEFAULT 4,
  difficulty    game_difficulty NOT NULL DEFAULT 'mixed',
  num_questions SMALLINT      NOT NULL DEFAULT 10,
  created_at    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_host FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms (code);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms (status);

-- ── Room Players ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_players (
  room_id   INT      NOT NULL,
  user_id   INT      NOT NULL,
  is_ready  BOOLEAN  NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id),
  CONSTRAINT fk_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Match History ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_history (
  id        SERIAL      PRIMARY KEY,
  room_id   INT         NOT NULL,
  user_id   INT         NOT NULL,
  score     INT         NOT NULL DEFAULT 0,
  rank      SMALLINT    NOT NULL DEFAULT 1,
  played_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_match_history_user ON match_history (user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_room ON match_history (room_id);
