import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminRequest, id, json, nowIso } from '../../../lib/server';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const { results } = await env.DB.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM registrations r WHERE r.class_id = c.id AND r.status='registered') AS student_count
    FROM classes c ORDER BY c.end_date < date('now'), c.start_date ASC
  `).all();
  return json({ classes: results });
};

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const data = await request.json() as Record<string, any>;
  const required = ['typeId','title','startDate','endDate'];
  if (required.some((key) => !String(data[key] ?? '').trim())) return json({ error: 'Type, title, start date, and end date are required.' }, 400);
  const classId = id('class');
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO classes (id,type_id,title,description,start_date,end_date,price_cents,capacity,schedule,location_name,location_address,parking,where_to_go,what_to_bring,notes,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
    classId, data.typeId, data.title, data.description ?? '', data.startDate, data.endDate, Math.round(Number(data.price ?? 0) * 100), data.capacity ? Number(data.capacity) : null,
    data.schedule ?? '', data.locationName ?? '', data.locationAddress ?? '', data.parking ?? '', data.whereToGo ?? '', data.whatToBring ?? '', data.notes ?? '', now, now
  ).run();

  if (data.typeId === 'eight-week-in-person') {
    const start = new Date(`${data.startDate}T12:00:00Z`);
    const end = new Date(`${data.endDate}T12:00:00Z`);
    let number = 1;
    for (let cursor = new Date(start); cursor <= end && number <= 8; cursor.setUTCDate(cursor.getUTCDate() + 7), number++) {
      await env.DB.prepare(`INSERT INTO class_sessions (id,class_id,session_number,session_date,start_time,end_time) VALUES (?,?,?,?,?,?)`).bind(
        id('session'), classId, number, cursor.toISOString().slice(0,10), data.startTime ?? null, data.endTime ?? null
      ).run();
    }
  }
  return json({ ok: true, id: classId }, 201);
};
