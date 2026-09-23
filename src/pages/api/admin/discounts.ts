import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminRequest, json, nowIso } from '../../../lib/server';

export const prerender = false;

async function ensureDiscountsTable() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS discounts (
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
  )`).run();
}

export const GET: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  await ensureDiscountsTable();
  const { results } = await env.DB.prepare(`SELECT d.*,s.name AS student_name,s.email AS student_email,c.title AS class_title
    FROM discounts d LEFT JOIN students s ON s.id=d.student_id LEFT JOIN classes c ON c.id=d.class_id
    ORDER BY d.created_at DESC`).all<any>();
  return json({ discounts: results ?? [] });
};

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  await ensureDiscountsTable();
  const body = await request.json() as Record<string, any>;
  const universal = body.universal === true || body.universal === 'true';
  const studentId = universal ? null : String(body.studentId ?? '').trim();
  const code = String(body.code ?? '').trim().toUpperCase();
  const percentOff = Number(body.percentOff);
  if ((!universal && !studentId) || !code || !Number.isInteger(percentOff) || percentOff < 1 || percentOff > 100) {
    return json({ error: 'Choose universal or an attendee, plus a code and percentage from 1 to 100.' }, 400);
  }
  if (studentId) {
    const student = await env.DB.prepare('SELECT id FROM students WHERE id=?').bind(studentId).first<any>();
    if (!student) return json({ error: 'Attendee not found.' }, 404);
  }
  const existing = await env.DB.prepare('SELECT id FROM discounts WHERE upper(code)=?').bind(code).first<any>();
  if (existing) return json({ error: 'That discount code already exists.' }, 409);
  const now = nowIso();
  const id = `discount_${crypto.randomUUID()}`;
  await env.DB.prepare(`INSERT INTO discounts (id,student_id,code,percent_off,active,starts_at,expires_at,max_uses,used_count,class_id,created_at,updated_at)
    VALUES (?,?,?,?,1,?,?,?,?,?,?,?)`).bind(
    id, studentId, code, percentOff, body.startsAt || null, body.expiresAt || null,
    body.maxUses ? Number(body.maxUses) : null, 0, body.classId || null, now, now
  ).run();
  return json({ ok: true, id });
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  await ensureDiscountsTable();
  const body = await request.json() as Record<string, any>;
  const id = String(body.id ?? '').trim();
  if (!id) return json({ error: 'Discount ID is required.' }, 400);
  const percentOff = Number(body.percentOff);
  if (!Number.isInteger(percentOff) || percentOff < 1 || percentOff > 100) return json({ error: 'Percentage must be from 1 to 100.' }, 400);
  await env.DB.prepare(`UPDATE discounts SET active=?,percent_off=?,expires_at=?,updated_at=? WHERE id=?`).bind(
    body.active === false ? 0 : 1, percentOff, body.expiresAt || null, nowIso(), id
  ).run();
  return json({ ok: true });
};