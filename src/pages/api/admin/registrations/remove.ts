import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminRequest, json } from '../../../../lib/server';

export const prerender = false;

// Unenroll from one class without deleting the attendee or registration history.
export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const data = await request.json().catch(() => ({})) as { registrationId?: string; classId?: string };
  const registrationId = String(data.registrationId ?? '').trim();
  const classId = String(data.classId ?? '').trim();
  if (!registrationId || !classId) return json({ error: 'Registration and class are required.' }, 400);

  const registration = await env.DB.prepare(
    'SELECT r.id,r.status,s.name FROM registrations r JOIN students s ON s.id=r.student_id WHERE r.id=? AND r.class_id=?'
  ).bind(registrationId, classId).first<{id:string;status:string;name:string}>();
  if (!registration) return json({ error: 'Registration not found for this class.' }, 404);
  if (registration.status === 'cancelled') return json({ error: 'This student has already been removed from the class.' }, 409);

  const changed = await env.DB.prepare(
    "UPDATE registrations SET status='cancelled' WHERE id=? AND class_id=? AND status IN ('registered','pending_payment')"
  ).bind(registrationId, classId).run();
  if (!Number(changed.meta?.changes ?? 0)) return json({ error: 'Registration could not be removed. Refresh and try again.' }, 409);

  return json({ ok: true, name: registration.name, registrationId, retainedInDirectory: true });
};
