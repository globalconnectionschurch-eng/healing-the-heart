import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { emailTemplates } from '../../../data/email-templates';
import { fillTemplate, id, isAdminRequest, json, nowIso, sendEmail } from '../../../lib/server';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const classId = url.searchParams.get('classId');
  if (!classId) return json({ students: [] });
  const { results } = await env.DB.prepare(`SELECT s.*, r.id AS registration_id, r.source, r.payment_status, r.status, r.registered_at, r.verification_code
    FROM registrations r JOIN students s ON s.id=r.student_id WHERE r.class_id=? ORDER BY s.name`).bind(classId).all();
  return json({ students: results });
};

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const data = await request.json() as Record<string, any>;
  const name = String(data.name ?? '').trim();
  const email = String(data.email ?? '').trim().toLowerCase();
  const classId = String(data.classId ?? '').trim();
  const emailAction = String(data.emailAction ?? 'registration').trim();
  if (!name || !email || !classId) return json({ error: 'Name, email, and class are required.' }, 400);
  if (!['registration', 'custom', 'none'].includes(emailAction)) return json({ error: 'Invalid email action.' }, 400);

  const classRow = await env.DB.prepare('SELECT * FROM classes WHERE id=?').bind(classId).first<any>();
  if (!classRow) return json({ error: 'Class not found.' }, 404);

  const now = nowIso();
  const existing = await env.DB.prepare('SELECT id FROM students WHERE lower(email)=?').bind(email).first<{id:string}>();
  const studentId = existing?.id ?? id('student');
  if (existing) {
    await env.DB.prepare('UPDATE students SET name=?,updated_at=? WHERE id=?').bind(name, now, studentId).run();
  } else {
    await env.DB.prepare('INSERT INTO students (id,name,email,created_at,updated_at) VALUES (?,?,?,?,?)').bind(studentId,name,email,now,now).run();
  }

  const verificationCode = `HTH-${crypto.randomUUID().replace(/-/g,'').slice(0,8).toUpperCase()}`;
  await env.DB.prepare(`INSERT OR REPLACE INTO registrations (id,class_id,student_id,source,verification_code,payment_status,status,registered_at) VALUES (?,?,?,?,?,?,?,?)`).bind(
    id('registration'), classId, studentId, 'admin', verificationCode, 'pending', 'registered', now
  ).run();

  if (emailAction === 'none') {
    return json({ ok: true, studentId, verificationCode, emailSent: false, emailAction });
  }

  let subject = '';
  let body = '';
  let templateId: string | null = null;

  if (emailAction === 'registration') {
    const saved = await env.DB.prepare('SELECT * FROM email_templates WHERE system_key=?').bind('manual-add-registration-required').first<any>();
    const fallback = emailTemplates.find((item) => item.id === 'manual-add-registration-required')!;
    templateId = saved?.id ?? fallback.id;
    subject = saved?.subject ?? fallback.subject;
    body = fillTemplate(saved?.body ?? fallback.body, {
      firstName: name.split(/\s+/)[0], classTitle: classRow.title ?? '', verificationCode,
      registrationLink: `${env.SITE_URL}/register`, contactEmail: env.CONTACT_EMAIL, siteUrl: env.SITE_URL
    });
  } else {
    subject = String(data.subject ?? '').trim();
    body = String(data.body ?? '').trim();
    if (!subject || !body) return json({ error: 'Subject and message are required for a customer email.' }, 400);
    body = fillTemplate(body, {
      firstName: name.split(/\s+/)[0], classTitle: classRow.title ?? '', verificationCode,
      registrationLink: `${env.SITE_URL}/register`, contactEmail: env.CONTACT_EMAIL, siteUrl: env.SITE_URL,
      locationName: classRow.location_name ?? '', locationAddress: classRow.location_address ?? '',
      schedule: classRow.schedule ?? '', dateRange: `${classRow.start_date ?? ''} – ${classRow.end_date ?? ''}`,
      parking: classRow.parking ?? '', whereToGo: classRow.where_to_go ?? '', classTime: classRow.schedule ?? '', weekday: ''
    });
    subject = fillTemplate(subject, { firstName: name.split(/\s+/)[0], classTitle: classRow.title ?? '', classTime: classRow.schedule ?? '' });
  }

  const sent = await sendEmail(email, subject, body);
  await env.DB.prepare(`INSERT INTO email_logs (id,template_id,class_id,student_id,recipient_email,subject,status,provider_message_id,error,sent_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
    id('email'), templateId, classId, studentId, email, subject, sent.sent ? 'sent' : 'failed', sent.messageId ?? null, sent.error ?? null, now
  ).run();

  return json({ ok: true, studentId, verificationCode, emailSent: sent.sent, emailAction });
};
