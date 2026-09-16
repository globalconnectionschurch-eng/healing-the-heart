import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { hasClassAccess, isAdminRequest, json } from '../../../lib/server';

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const classId = String(params.id ?? '');
  const classRow = await env.DB.prepare('SELECT id,title,start_date,end_date,schedule,location_name,location_address,student_link_password_hash FROM classes WHERE id=?').bind(classId).first<any>();
  if (!classRow) return json({ error: 'Class not found.' }, 404);

  // Admins may load any roster from the authenticated admin area. Student-facing
  // access still requires the class-specific password cookie.
  const admin = await isAdminRequest(request);
  const classAccess = classRow.student_link_password_hash
    ? await hasClassAccess(request, classId, classRow.student_link_password_hash)
    : false;
  if (!admin && !classAccess) return json({ error: 'Password required.' }, 401);

  const { results: students } = await env.DB.prepare(`
    SELECT s.name,s.email,s.phone,s.address,s.date_of_birth,s.marital_status,s.church,s.sr_pastor,s.how_heard,s.goals,s.smoking_drinking,s.anything_else,
           s.diagnosis,s.learning_restrictions,s.adopted,s.major_trauma,s.grief,s.in_ministry,s.dietary_restrictions,s.current_crisis,s.self_harm_history,
           r.source,r.payment_status,r.status,r.registered_at,r.verification_code
    FROM registrations r JOIN students s ON s.id=r.student_id
    WHERE r.class_id=? AND r.status IN ('registered','pending_payment') ORDER BY s.name COLLATE NOCASE
  `).bind(classId).all();
  return json({ class: { id: classRow.id, title: classRow.title, startDate: classRow.start_date, endDate: classRow.end_date, schedule: classRow.schedule, locationName: classRow.location_name, locationAddress: classRow.location_address }, students });
};
