import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { createClassAccessCookie, json, verifyClassPassword } from '../../../../lib/server';

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
  const classId = String(params.id ?? '');
  const password = String((await request.json() as Record<string, unknown>).password ?? '').trim();
  if (!classId || !password) return json({ error: 'Password is required.' }, 400);
  const row = await env.DB.prepare('SELECT id,student_link_password_hash FROM classes WHERE id=?').bind(classId).first<any>();
  if (!row || !row.student_link_password_hash) return json({ error: 'This private class page is not configured yet.' }, 404);
  if (!(await verifyClassPassword(password, row.student_link_password_hash))) return json({ error: 'That password is not correct.' }, 401);
  const cookie = await createClassAccessCookie(classId, row.student_link_password_hash);
  return json({ ok: true }, 200, { 'set-cookie': cookie });
};
