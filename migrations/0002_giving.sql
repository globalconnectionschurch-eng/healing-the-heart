PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS giving_transactions (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  source TEXT NOT NULL CHECK (source IN ('online','terminal','cash','other')),
  method TEXT NOT NULL CHECK (method IN ('credit_card','debit','cash','etransfer','other')),
  purpose TEXT NOT NULL DEFAULT 'ministry_support',
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'CAD',
  transaction_id TEXT,
  external_reference TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','refunded','voided')),
  occurred_at TEXT NOT NULL,
  notes TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_giving_student_date ON giving_transactions(student_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_giving_status_date ON giving_transactions(status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_giving_purpose ON giving_transactions(purpose);
