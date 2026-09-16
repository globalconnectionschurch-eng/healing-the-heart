import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { emailTemplates } from '../../../../data/email-templates';
import { fillTemplate, id, isAdminRequest, json, nowIso, sendEmail } from '../../../../lib/server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const data = await request.json() as { studentId?: string; templateId?: string; subject?: string; body?: string };
  const studentId = String(data.studentId || '').trim();
  if (!studentId) return json({ error: 'Student ID is required.' }, 400);
  const student = await env.DB.prepare('SELECT * FROM students WHERE id=?').bind(studentId).first<any>();
  if (!student) return json({ error: 'Attendee not found.' }, 404);
  if (!student.email || !String(student.email).trim()) return json({ error: 'This attendee does not have an email address.' }, 400);

  const latest = await env.DB.prepare(`SELECT c.* FROM registrations r JOIN classes c ON c.id=r.class_id WHERE r.student_id=? ORDER BY r.registered_at DESC LIMIT 1`).bind(studentId).first<any>();
  const template = data.templateId
    ? await env.DB.prepare('SELECT * FROM email_templates WHERE id=?').bind(data.templateId).first<any>() ?? emailTemplates.find((item) => item.id === data.templateId)
    : null;
  if (data.templateId && !template) return json({ error: 'Saved template not found.' }, 404);

  const vars = {
    firstName: String(student.name || '').trim().split(/\s+/)[0] || '',
    classTitle: latest?.title ?? '',
    locationName: latest?.location_name ?? '',
    locationAddress: latest?.location_address ?? '',
    schedule: latest?.schedule ?? '',
    dateRange: latest ? `${latest.start_date ?? ''} – ${latest.end_date ?? ''}` : '',
    parking: latest?.parking ?? '',
    whereToGo: latest?.where_to_go ?? '',
    classTime: latest?.schedule ?? '',
    weekday: '',
    verificationCode: '',
    registrationLink: `${env.SITE_URL}/register`,
    contactEmail: env.CONTACT_EMAIL,
    siteUrl: env.SITE_URL,
  };

  const subject = fillTemplate(String(template?.subject ?? data.subject ?? '').trim(), vars);
  const body = fillTemplate(String(template?.body ?? data.body ?? '').trim(), vars);
  if (!subject || !body) return json({ error: 'Choose a saved template or enter a subject and message.' }, 400);

  const result = await sendEmail(student.email, subject, body);
  await env.DB.prepare(`INSERT INTO email_logs (id,template_id,class_id,student_id,recipient_email,subject,status,provider_message_id,error,sent_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
    id('email'), template?.id ?? null, latest?.id ?? null, student.id, student.email, subject, result.sent ? 'sent' : 'failed', result.messageId ?? null, result.error ?? null, nowIso()
  ).run();
  if (!result.sent) return json({ error: result.error || 'Email could not be sent.' }, 502);
  return json({ ok: true, recipient: student.email, subject });
};
