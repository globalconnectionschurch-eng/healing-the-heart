import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminRequest, json, nowIso } from '../../../../lib/server';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const q = `%${(url.searchParams.get('q') || '').trim()}%`;
  const { results } = await env.DB.prepare(`
    SELECT s.*, COUNT(r.id) AS registration_count, MAX(r.registered_at) AS last_registered_at
    FROM students s LEFT JOIN registrations r ON r.student_id=s.id
    WHERE s.name LIKE ? OR s.email LIKE ? OR COALESCE(s.phone,'') LIKE ?
    GROUP BY s.id ORDER BY s.name COLLATE NOCASE ASC LIMIT 500
  `).bind(q,q,q).all<any>();
  return json({ students: results });
};

export const PUT: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const data = await request.json() as Record<string, any>;
  const studentId = String(data.id || '').trim();
  if (!studentId) return json({ error: 'Student ID is required.' }, 400);
  const now = nowIso();
  await env.DB.prepare(`UPDATE students SET name=?,email=?,phone=?,address=?,date_of_birth=?,marital_status=?,church=?,sr_pastor=?,how_heard=?,goals=?,smoking_drinking=?,anything_else=?,updated_at=? WHERE id=?`).bind(
    data.name||'',data.email||'',data.phone||'',data.address||'',data.date_of_birth||'',data.marital_status||'',data.church||'',data.sr_pastor||'',data.how_heard||'',data.goals||'',data.smoking_drinking||'',data.anything_else||'',now,studentId
  ).run();
  return json({ ok: true });
};
