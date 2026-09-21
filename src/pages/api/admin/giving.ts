import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminRequest, json, nowIso } from '../../../lib/server';

export const prerender = false;

async function ensureGivingTable() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS giving_transactions (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    source TEXT NOT NULL CHECK (source IN ('online','terminal','cash','other')),
    method TEXT NOT NULL CHECK (method IN ('credit_card','debit','cash','etransfer','other')),
    purpose TEXT NOT NULL DEFAULT 'ministry_support',
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    currency TEXT NOT NULL DEFAULT 'CAD',
    transaction_id TEXT UNIQUE,
    external_reference TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','failed','refunded','voided')),
    occurred_at TEXT NOT NULL,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`).run();
}

export const GET: APIRoute = async ({ request, url }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  await ensureGivingTable();
  const studentId = String(url.searchParams.get('studentId') ?? '').trim();
  const rows = studentId
    ? await env.DB.prepare(`SELECT g.*,s.name,s.email FROM giving_transactions g JOIN students s ON s.id=g.student_id WHERE g.student_id=? ORDER BY g.occurred_at DESC`).bind(studentId).all<any>()
    : await env.DB.prepare(`SELECT g.*,s.name,s.email FROM giving_transactions g JOIN students s ON s.id=g.student_id ORDER BY g.occurred_at DESC LIMIT 500`).all<any>();
  return json({ transactions: rows.results ?? [] });
};

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  await ensureGivingTable();
  const d = await request.json() as Record<string, any>;
  const studentId = String(d.studentId ?? '').trim();
  const amountCents = Math.round(Number(d.amount ?? 0) * 100);
  if (!studentId || !amountCents || amountCents < 1) return json({ error: 'Person and a valid amount are required.' }, 400);
  const student = await env.DB.prepare('SELECT id FROM students WHERE id=?').bind(studentId).first<any>();
  if (!student) return json({ error: 'Attendee not found.' }, 404);
  const now = nowIso();
  const id = crypto.randomUUID();
  const occurredAt = String(d.occurredAt ?? now).trim() || now;
  const source = ['terminal','cash','other','online'].includes(d.source) ? d.source : 'terminal';
  const method = ['credit_card','debit','cash','etransfer','other'].includes(d.method) ? d.method : 'debit';
  const status = ['pending','completed','failed','refunded','voided'].includes(d.status) ? d.status : 'completed';
  try {
    await env.DB.prepare(`INSERT INTO giving_transactions (id,student_id,source,method,purpose,amount_cents,currency,transaction_id,external_reference,status,occurred_at,notes,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,studentId,source,method,String(d.purpose||'ministry_support'),amountCents,'CAD',String(d.transactionId||'').trim()||null,String(d.externalReference||'').trim()||null,status,occurredAt,String(d.notes||''), 'admin', now, now).run();
    return json({ ok: true, id });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to record transaction.' }, 400);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  await ensureGivingTable();
  const d = await request.json() as Record<string, any>;
  const transactionId = String(d.transactionId ?? '').trim();
  const studentId = String(d.studentId ?? '').trim();
  if (!transactionId) return json({ error: 'Transaction ID is required.' }, 400);
  const existing = await env.DB.prepare(`SELECT id,student_id,status FROM giving_transactions WHERE transaction_id=?`).bind(transactionId).first<any>();
  if (!existing) return json({ error: 'Transaction not found.' }, 404);
  if (studentId) {
    const student = await env.DB.prepare('SELECT id FROM students WHERE id=?').bind(studentId).first<any>();
    if (!student) return json({ error: 'Attendee not found.' }, 404);
  }
  const status = ['pending','completed','failed','refunded','voided'].includes(d.status) ? d.status : 'completed';
  const now = nowIso();
  const note = String(d.note ?? '').trim();
  await env.DB.prepare(`UPDATE giving_transactions SET status=?, student_id=COALESCE(?,student_id), notes=CASE WHEN ?='' THEN notes WHEN notes IS NULL OR notes='' THEN ? ELSE notes || '\n' || ? END, updated_at=? WHERE transaction_id=?`).bind(status, studentId || null, note, note, note, now, transactionId).run();
  return json({ ok: true, transactionId, status });
};
