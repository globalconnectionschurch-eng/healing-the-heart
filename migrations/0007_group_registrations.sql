-- Linked registrations for one checkout; original individual registrations are preserved.
CREATE TABLE IF NOT EXISTS group_discount_rules (
  discount_id TEXT PRIMARY KEY REFERENCES discounts(id) ON DELETE CASCADE,
  second_percent_off INTEGER NOT NULL CHECK(second_percent_off >= 1 AND second_percent_off <= 100)
);
CREATE TABLE IF NOT EXISTS registration_groups (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id),
  discount_id TEXT REFERENCES discounts(id) ON DELETE SET NULL,
  discount_code TEXT,
  original_amount_cents INTEGER NOT NULL,
  total_amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','failed')),
  payment_order_no TEXT,
  payment_ticket TEXT,
  payment_transaction_id TEXT,
  paid_at TEXT,
  payment_error TEXT,
  created_at TEXT NOT NULL
);
ALTER TABLE registrations ADD COLUMN group_id TEXT REFERENCES registration_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_registrations_group ON registrations(group_id);
