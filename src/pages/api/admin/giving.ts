import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminRequest, json, nowIso } from '../../../lib/server';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const studentId = String(url.searchParams.get('studentId') ?? '').trim();
  const rows = studentId
    ? await env.DB.prepare(`SELECT g.*,s.name,s.email FROM giving_transactions g JOIN students s ON s.id=g.student_id WHERE g.student_id=? ORDER BY g.occurred_at DESC`).bind(studentId).all<any>()
    : await env.DB.prepare(`SELECT g.*,s.name,s.email FROM giving_transactions g JOIN students s ON s.id=g.student_id ORDER BY g.occurred_at DESC LIMIT 500`).all<any>();
  return json({ transactions: rows.results ?? [] });
};

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
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
