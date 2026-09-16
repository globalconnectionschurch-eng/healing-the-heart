import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, nowIso } from '../../../lib/server';

export const prerender = false;

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

async function getToken(token: string) {
  await ensureTable();
  return env.DB.prepare(`SELECT t.id,t.student_id,t.expires_at,t.used_at,s.name,s.email,s.phone,s.address,s.date_of_birth,s.marital_status,s.church,s.sr_pastor,s.how_heard,s.goals,s.smoking_drinking,s.anything_else
    FROM profile_update_tokens t JOIN students s ON s.id=t.student_id WHERE t.token_hash=? LIMIT 1`).bind(await hashToken(token)).first<any>();
}

export const GET: APIRoute = async ({ params }) => {
  const token = String(params.token || '').trim();
  if (!token) return json({ error: 'This update link is invalid.' }, 400, { 'cache-control': 'no-store' });
  const row = await getToken(token);
  if (!row) return json({ error: 'This update link is invalid or has already been used.' }, 404, { 'cache-control': 'no-store' });
  if (row.used_at) return json({ error: 'This update link has already been used.' }, 410, { 'cache-control': 'no-store' });
  if (new Date(row.expires_at).getTime() <= Date.now()) return json({ error: 'This update link has expired. Please request a new one.' }, 410, { 'cache-control': 'no-store' });
  return json({
    ok: true,
    student: {
      name: row.name || '', email: row.email || '', phone: row.phone || '', address: row.address || '', date_of_birth: row.date_of_birth || '',
      marital_status: row.marital_status || '', church: row.church || '', sr_pastor: row.sr_pastor || '', how_heard: row.how_heard || '',
      goals: row.goals || '', smoking_drinking: row.smoking_drinking || '', anything_else: row.anything_else || ''
    }
  }, 200, { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
};

export const POST: APIRoute = async ({ request, params }) => {
  const token = String(params.token || '').trim();
  if (!token) return json({ error: 'This update link is invalid.' }, 400, { 'cache-control': 'no-store' });
  const row = await getToken(token);
  if (!row) return json({ error: 'This update link is invalid or has already been used.' }, 404, { 'cache-control': 'no-store' });
  if (row.used_at) return json({ error: 'This update link has already been used.' }, 410, { 'cache-control': 'no-store' });
  if (new Date(row.expires_at).getTime() <= Date.now()) return json({ error: 'This update link has expired. Please request a new one.' }, 410, { 'cache-control': 'no-store' });

  const data = await request.json() as Record<string, any>;
  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  if (!name || !email) return json({ error: 'Name and email address are required.' }, 400);

  const now = nowIso();
  const statements = [
    env.DB.prepare(`UPDATE students SET name=?,email=?,phone=?,address=?,date_of_birth=?,marital_status=?,church=?,sr_pastor=?,how_heard=?,goals=?,smoking_drinking=?,anything_else=?,updated_at=? WHERE id=?`).bind(
      name,email,String(data.phone || '').trim(),String(data.address || '').trim(),String(data.date_of_birth || '').trim(),String(data.marital_status || '').trim(),String(data.church || '').trim(),String(data.sr_pastor || '').trim(),String(data.how_heard || '').trim(),String(data.goals || '').trim(),String(data.smoking_drinking || '').trim(),String(data.anything_else || '').trim(),now,row.student_id
    ),
    env.DB.prepare(`UPDATE profile_update_tokens SET used_at=? WHERE id=? AND used_at IS NULL`).bind(now,row.id)
  ];
  await env.DB.batch(statements);
  const updated = await env.DB.prepare('SELECT name FROM students WHERE id=?').bind(row.student_id).first<any>();
  return json({ ok: true, name: updated?.name || name }, 200, { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' });
};
