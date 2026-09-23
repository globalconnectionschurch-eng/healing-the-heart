PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS discounts (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  percent_off INTEGER NOT NULL CHECK (percent_off > 0 AND percent_off <= 100),
  active INTEGER NOT NULL DEFAULT 1,
  starts_at TEXT,
  expires_at TEXT,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_discounts_student ON discounts(student_id);
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code);

ALTER TABLE registrations ADD COLUMN discount_id TEXT REFERENCES discounts(id) ON DELETE SET NULL;
ALTER TABLE registrations ADD COLUMN discount_percent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE registrations ADD COLUMN original_amount_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE registrations ADD COLUMN discount_amount_cents INTEGER NOT NULL DEFAULT 0;
ALTER TABLE registrations ADD COLUMN final_amount_cents INTEGER NOT NULL DEFAULT 0;
