PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  type_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  payment_url TEXT,
  capacity INTEGER,
  schedule TEXT,
  location_name TEXT,
  location_address TEXT,
  parking TEXT,
  where_to_go TEXT,
  what_to_bring TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS class_sessions (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  session_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  reminder_sent_at TEXT,
  UNIQUE(class_id, session_number)
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'online',
  verification_code TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  status TEXT NOT NULL DEFAULT 'registered',
  registered_at TEXT NOT NULL,
  UNIQUE(class_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_registrations_class ON registrations(class_id);

CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_description TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  system_key TEXT UNIQUE,
  editable INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY,
  template_id TEXT,
  class_id TEXT,
  student_id TEXT,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_message_id TEXT,
  error TEXT,
  sent_at TEXT NOT NULL,
  FOREIGN KEY(template_id) REFERENCES email_templates(id) ON DELETE SET NULL,
  FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE SET NULL,
  FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_email_logs_class ON email_logs(class_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_classes_dates ON classes(end_date, start_date);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON class_sessions(session_date);
