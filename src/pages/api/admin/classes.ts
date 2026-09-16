import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { classTypePresets } from '../../../data/class-types';
import { hashClassPassword, isAdminRequest, id, json, nowIso } from '../../../lib/server';

export const prerender = false;

const validTime = (value: unknown, fallback = '12:00') => String(value ?? '').match(/^([01]\d|2[0-3]):[0-5]\d$/)?.[0] ?? fallback;

const tableColumns = async (table: string) => {
  const { results } = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
  return new Set((results as Array<{ name?: string }>).map((row) => String(row.name ?? '')));
};

const saveSessions = async (classId: string, typeId: string, startDate: string, endDate: string, startTime: string | null, endTime: string | null) => {
  await env.DB.prepare('DELETE FROM class_sessions WHERE class_id=?').bind(classId).run();
  if (typeId !== 'eight-week-in-person') return;
  const start = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  let number = 1;
  for (let cursor = new Date(start); cursor <= end && number <= 8; cursor.setUTCDate(cursor.getUTCDate() + 7), number++) {
    await env.DB.prepare(`INSERT INTO class_sessions (id,class_id,session_number,session_date,start_time,end_time) VALUES (?,?,?,?,?,?)`).bind(
      id('session'), classId, number, cursor.toISOString().slice(0, 10), startTime, endTime
    ).run();
  }
};

const validate = (data: Record<string, any>) => {
  const required = ['typeId', 'title', 'startDate', 'endDate'];
  if (required.some((key) => !String(data[key] ?? '').trim())) return { error: 'Type, title, start date, and end date are required.' };
  const startDate = String(data.startDate).slice(0, 10);
  const endDate = String(data.endDate).slice(0, 10);
  if (endDate < startDate) return { error: 'End date cannot be before the start date.' };
  const preset = classTypePresets.find((item) => item.id === String(data.typeId));
  const rawPrice = String(data.price ?? '').trim();
  const priceCents = rawPrice ? Math.round(Number(rawPrice) * 100) : (preset?.defaultPriceCents ?? 0);
  if (!Number.isFinite(priceCents) || priceCents < 0) return { error: 'Enter a valid price.' };
  return { startDate, endDate, priceCents };
};

export const GET: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const { results } = await env.DB.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM registrations r WHERE r.class_id = c.id AND r.status IN ('registered','pending_payment')) AS student_count,
      (SELECT cs.start_time FROM class_sessions cs WHERE cs.class_id=c.id ORDER BY cs.session_number ASC LIMIT 1) AS start_time,
      (SELECT cs.end_time FROM class_sessions cs WHERE cs.class_id=c.id ORDER BY cs.session_number ASC LIMIT 1) AS end_time
    FROM classes c ORDER BY c.end_date < date('now'), c.start_date ASC
  `).all();
  return json({ classes: results });
};

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const data = await request.json() as Record<string, any>;

  if (data.action === 'set-student-link-password') {
    const classId = String(data.classId ?? '').trim();
    const password = String(data.password ?? '').trim();
    if (!classId || password.length < 6) return json({ error: 'Choose a class and use a password of at least 6 characters.' }, 400);
    const classRow = await env.DB.prepare('SELECT id FROM classes WHERE id=?').bind(classId).first();
    if (!classRow) return json({ error: 'Class not found.' }, 404);
    const columns = await tableColumns('classes');
    if (!columns.has('student_link_password_hash')) return json({ error: 'The database is missing the student-link password field. Run the latest database migrations.' }, 500);
    const passwordHash = await hashClassPassword(password);
    await env.DB.prepare('UPDATE classes SET student_link_password_hash=?,updated_at=? WHERE id=?').bind(passwordHash, nowIso(), classId).run();
    return json({ ok: true });
  }

  const checked = validate(data);
  if (checked.error) return json(checked, 400);
  const { startDate, endDate, priceCents } = checked;
  const isEightWeek = data.typeId === 'eight-week-in-person';
  const autoReminders = isEightWeek && data.autoReminders === true;
  const reminderTime = validTime(data.autoReminderTime);
  const now = nowIso();
  const columns = await tableColumns('classes');
  const reminderFieldsAvailable = columns.has('auto_reminders_enabled') && columns.has('auto_reminder_time');

  if (data.action === 'update') {
    const classId = String(data.classId ?? '').trim();
    if (!classId) return json({ error: 'Class not found.' }, 404);
    const existing = await env.DB.prepare('SELECT id FROM classes WHERE id=?').bind(classId).first();
    if (!existing) return json({ error: 'Class not found.' }, 404);
    const setParts = ['type_id=?','title=?','description=?','start_date=?','end_date=?','price_cents=?','capacity=?','schedule=?','location_name=?','location_address=?','parking=?','where_to_go=?','what_to_bring=?','notes=?','payment_url=?'];
    const values: any[] = [data.typeId, data.title, data.description ?? '', startDate, endDate, priceCents, data.capacity ? Number(data.capacity) : null,
      data.schedule ?? '', data.locationName ?? '', data.locationAddress ?? '', data.parking ?? '', data.whereToGo ?? '', data.whatToBring ?? '', data.notes ?? '', data.paymentUrl ?? ''];
    if (reminderFieldsAvailable) {
      setParts.push('auto_reminders_enabled=?','auto_reminder_time=?');
      values.push(autoReminders ? 1 : 0, reminderTime);
    }
    setParts.push('updated_at=?');
    values.push(now, classId);
    await env.DB.prepare(`UPDATE classes SET ${setParts.join(',')} WHERE id=?`).bind(...values).run();
    await saveSessions(classId, String(data.typeId), startDate, endDate, data.startTime ?? null, data.endTime ?? null);
    return json({ ok: true, id: classId });
  }

  const classId = id('class');
  const insertFields = ['id','type_id','title','description','start_date','end_date','price_cents','capacity','schedule','location_name','location_address','parking','where_to_go','what_to_bring','notes','payment_url'];
  const insertValues: any[] = [classId, data.typeId, data.title, data.description ?? '', startDate, endDate, priceCents, data.capacity ? Number(data.capacity) : null,
    data.schedule ?? '', data.locationName ?? '', data.locationAddress ?? '', data.parking ?? '', data.whereToGo ?? '', data.whatToBring ?? '', data.notes ?? '', data.paymentUrl ?? ''];
  if (reminderFieldsAvailable) {
    insertFields.push('auto_reminders_enabled','auto_reminder_time');
    insertValues.push(autoReminders ? 1 : 0, reminderTime);
  }
  insertFields.push('created_at','updated_at');
  insertValues.push(now, now);
  const placeholders = insertFields.map(() => '?').join(',');
  await env.DB.prepare(`INSERT INTO classes (${insertFields.join(',')}) VALUES (${placeholders})`).bind(...insertValues).run();
  await saveSessions(classId, String(data.typeId), startDate, endDate, data.startTime ?? null, data.endTime ?? null);
  return json({ ok: true, id: classId }, 201);
};
