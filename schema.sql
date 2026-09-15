PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  type_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  schedule TEXT,
  capacity INTEGER,
  location_name TEXT,
  location_address TEXT,
  parking TEXT,
  where_to_go TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','upcoming','archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_classes_status_dates ON classes(status, start_date, end_date);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  phone TEXT,
  address TEXT,
  date_of_birth TEXT,
  marital_status TEXT,
  church TEXT,
  sr_pastor TEXT,
  how_heard TEXT,
  goals TEXT,
  smoking_drinking TEXT,
  anything_else TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'online' CHECK (source IN ('online','admin')),
  verification_code TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','waived','unknown')),
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','cancelled','waitlisted')),
  registered_at TEXT NOT NULL,
  UNIQUE(class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_registrations_class ON registrations(class_id, status);
CREATE INDEX IF NOT EXISTS idx_registrations_student ON registrations(student_id);

CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  system_key TEXT UNIQUE,
  name TEXT NOT NULL,
  trigger_description TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  editable INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  template_id TEXT,
  class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent','failed')),
  provider_message_id TEXT,
  error TEXT,
  sent_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_email_logs_class ON email_logs(class_id, sent_at);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions(expires_at);
