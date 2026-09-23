PRAGMA foreign_keys = OFF;

CREATE TABLE discounts_universal (
  id TEXT PRIMARY KEY,
  student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
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

INSERT INTO discounts_universal (id,student_id,code,percent_off,active,starts_at,expires_at,max_uses,used_count,class_id,created_at,updated_at)
SELECT id,student_id,code,percent_off,active,starts_at,expires_at,max_uses,used_count,class_id,created_at,updated_at FROM discounts;

DROP TABLE discounts;
ALTER TABLE discounts_universal RENAME TO discounts;
CREATE INDEX IF NOT EXISTS idx_discounts_student ON discounts(student_id);
CREATE INDEX IF NOT EXISTS idx_discounts_code ON discounts(code);
PRAGMA foreign_keys = ON;