import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminRequest, json, nowIso } from '../../../../lib/server';

export const prerender = false;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function tokenValue(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hashToken(token: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return tokenValue(new Uint8Array(bytes));
}

async function ensureTable() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS profile_update_tokens (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE INDEX IF NOT EXISTS idx_profile_update_tokens_student ON profile_update_tokens(student_id)`).run();
}

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  await ensureTable();
  const data = await request.json() as { studentId?: string };
  const studentId = String(data.studentId || '').trim();
  if (!studentId) return json({ error: 'Student ID is required.' }, 400);
  const student = await env.DB.prepare('SELECT id,name FROM students WHERE id=?').bind(studentId).first<any>();
  if (!student) return json({ error: 'Attendee not found.' }, 404);

  await env.DB.prepare(`UPDATE profile_update_tokens SET used_at=? WHERE student_id=? AND used_at IS NULL`).bind(nowIso(), studentId).run();
  const token = tokenValue(crypto.getRandomValues(new Uint8Array(32)));
  const now = Date.now();
  const expiresAt = new Date(now + TTL_MS).toISOString();
  await env.DB.prepare(`INSERT INTO profile_update_tokens (id,student_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)`).bind(
    `profile_${crypto.randomUUID()}`, studentId, await hashToken(token), expiresAt, new Date(now).toISOString()
  ).run();
  return json({ ok: true, name: student.name, url: `${env.SITE_URL}/profile-update/${token}`, expiresAt });
};
