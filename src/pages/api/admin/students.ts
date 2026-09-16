import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { emailTemplates } from '../../../data/email-templates';
import { fillTemplate, id, isAdminRequest, json, nowIso, sendEmail } from '../../../lib/server';

export const prerender = false;

async function addStudent(data: Record<string, any>) {
  const name = String(data.name ?? '').trim();
  const email = String(data.email ?? '').trim().replace(/\\@/g, '@').toLowerCase();
  const classId = String(data.classId ?? '').trim();
  const emailAction = String(data.emailAction ?? 'registration').trim();
  if (!name || !email || !classId) throw new Error('Name, email, and class are required.');
  if (!['registration', 'custom', 'none'].includes(emailAction)) throw new Error('Invalid email action.');

  const classRow = await env.DB.prepare('SELECT * FROM classes WHERE id=?').bind(classId).first<any>();
  if (!classRow) throw new Error('Class not found.');

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

  if (emailAction === 'none') return { studentId, verificationCode, emailSent: false, emailAction };

  let subject = '';
  let body = '';
  let templateId: string | null = null;
  const vars = {
    firstName: name.split(/\s+/)[0], classTitle: classRow.title ?? '', verificationCode,
    registrationLink: `${env.SITE_URL}/register`, contactEmail: env.CONTACT_EMAIL, siteUrl: env.SITE_URL,
    locationName: classRow.location_name ?? '', locationAddress: classRow.location_address ?? '',
    schedule: classRow.schedule ?? '', dateRange: `${classRow.start_date ?? ''} – ${classRow.end_date ?? ''}`,
    parking: classRow.parking ?? '', whereToGo: classRow.where_to_go ?? '', classTime: classRow.schedule ?? '', weekday: ''
  };

  if (emailAction === 'registration') {
    const saved = await env.DB.prepare('SELECT * FROM email_templates WHERE system_key=?').bind('manual-add-registration-required').first<any>();
    const fallback = emailTemplates.find((item) => item.id === 'manual-add-registration-required')!;
    templateId = saved?.id ?? fallback.id;
    subject = fillTemplate(saved?.subject ?? fallback.subject, vars);
    body = fillTemplate(saved?.body ?? fallback.body, vars);
  } else {
    subject = fillTemplate(String(data.subject ?? '').trim(), vars);
    body = fillTemplate(String(data.body ?? '').trim(), vars);
    if (!subject || !body) throw new Error('Subject and message are required for a customer email.');
  }

  const sent = await sendEmail(email, subject, body);
  await env.DB.prepare(`INSERT INTO email_logs (id,template_id,class_id,student_id,recipient_email,subject,status,provider_message_id,error,sent_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
    id('email'), templateId, classId, studentId, email, subject, sent.sent ? 'sent' : 'failed', sent.messageId ?? null, sent.error ?? null, now
  ).run();
  return { studentId, verificationCode, emailSent: sent.sent, emailAction };
}

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
  try {
    const data = await request.json() as Record<string, any>;
    if (Array.isArray(data.students)) {
      const items = data.students as Record<string, any>[];
      if (!items.length) return json({ error: 'Paste at least one student.' }, 400);
      const emailAction = String(data.emailAction ?? 'none');
      if (!['registration', 'custom', 'none'].includes(emailAction)) return json({ error: 'Invalid email action.' }, 400);
      if (emailAction === 'custom' && (!String(data.subject ?? '').trim() || !String(data.body ?? '').trim())) {
        return json({ error: 'Subject and message are required for a customer email.' }, 400);
      }
      const results = [];
      for (const student of items) {
        try {
          results.push({ name: student.name, email: student.email, ok: true, ...(await addStudent({ ...student, emailAction, subject: data.subject, body: data.body })) });
        } catch (error) {
          results.push({ name: student.name, email: student.email, ok: false, error: error instanceof Error ? error.message : 'Unable to add student.' });
        }
      }
      return json({ ok: results.every((item) => item.ok), results, addedCount: results.filter((item) => item.ok).length, failedCount: results.filter((item) => !item.ok).length });
    }

    const result = await addStudent(data);
    return json({ ok: true, ...result });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to add student.' }, 400);
  }
};
