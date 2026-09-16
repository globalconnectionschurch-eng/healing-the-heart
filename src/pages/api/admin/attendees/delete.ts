import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminRequest, json } from '../../../../lib/server';

export const prerender = false;

export const DELETE: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const data = await request.json() as { studentId?: string };
  const studentId = String(data.studentId || '').trim();
  if (!studentId) return json({ error: 'Student ID is required.' }, 400);
  const student = await env.DB.prepare('SELECT id,name FROM students WHERE id=?').bind(studentId).first<any>();
  if (!student) return json({ error: 'Attendee not found.' }, 404);
  await env.DB.prepare('DELETE FROM students WHERE id=?').bind(studentId).run();
  return json({ ok: true, deletedId: studentId, name: student.name });
};
