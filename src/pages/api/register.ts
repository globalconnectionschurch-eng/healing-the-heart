import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { emailTemplates } from '../../data/email-templates';
import { fillTemplate, id, json, nowIso, sendEmail } from '../../lib/server';

export const prerender = false;
const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

async function sendEightWeekEmail(classRow: any, student: any, registrationId: string, now: string) {
  if (classRow.type_id !== 'eight-week-in-person') return;
  const saved = await env.DB.prepare('SELECT * FROM email_templates WHERE system_key=?').bind('eight-week-class-details').first<any>();
  const fallback = emailTemplates.find((item) => item.id === 'eight-week-class-details')!;
  const subjectTemplate = saved?.subject ?? fallback.subject;
  const bodyTemplate = saved?.body ?? fallback.body;
  const values = { firstName: student.name.split(/\s+/)[0], classTitle: classRow.title, locationName: classRow.location_name || '', locationAddress: classRow.location_address || '', schedule: classRow.schedule || '', dateRange: `${classRow.start_date} – ${classRow.end_date}`, parking: classRow.parking || '', whereToGo: classRow.where_to_go || '', contactEmail: env.CONTACT_EMAIL, siteUrl: env.SITE_URL, paymentInstructions: 'Your payment has been received.' };
  const subject = fillTemplate(subjectTemplate, values);
  const message = fillTemplate(bodyTemplate, values);
  const sent = await sendEmail(student.email, subject, message);
  await env.DB.prepare(`INSERT INTO email_logs (id,template_id,class_id,student_id,recipient_email,subject,status,provider_message_id,error,sent_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id('email'), saved?.id ?? fallback.id, classRow.id, student.id, student.email, subject, sent.sent ? 'sent' : 'failed', sent.messageId ?? null, sent.error ?? null, now).run();
}

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  if (text(form, 'website')) return new Response(null, { status: 204 });
  const name = text(form, 'name');
  const email = text(form, 'email').toLowerCase();
  const classId = text(form, 'classId');
  if (!name || !email || !classId) return json({ ok: false, error: 'Name, email, and class are required.' }, 400);
  if (!env.DB) return json({ ok: false, error: 'Registration is temporarily unavailable.' }, 503);

  const classRow = await env.DB.prepare('SELECT * FROM classes WHERE id=? AND end_date>=date(\'now\')').bind(classId).first<any>();
  if (!classRow) return json({ ok: false, error: 'That class is no longer available.' }, 400);

  const existing = await env.DB.prepare('SELECT id FROM students WHERE lower(email)=?').bind(email).first<{id:string}>();
  const actualStudentId = existing?.id ?? id('student');
  const existingRegistration = await env.DB.prepare('SELECT id,source,verification_code,payment_status FROM registrations WHERE class_id=? AND student_id=?').bind(classId, actualStudentId).first<any>();
  if (classRow.capacity && !existingRegistration) {
    const count = await env.DB.prepare(`SELECT COUNT(*) AS count FROM registrations WHERE class_id=? AND status IN ('registered','pending_payment')`).bind(classId).first<{count:number}>();
    if ((count?.count ?? 0) >= Number(classRow.capacity)) return json({ ok: false, error: 'That class is currently full.' }, 409);
  }

  const now = nowIso();
  const verificationCode = text(form, 'verificationCode') || existingRegistration?.verification_code || null;
  if (!existing) {
    await env.DB.prepare(`INSERT INTO students (id,name,email,phone,address,date_of_birth,marital_status,church,sr_pastor,how_heard,goals,smoking_drinking,anything_else,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      actualStudentId,name,email,text(form,'phone'),text(form,'address'),text(form,'dateOfBirth'),text(form,'maritalStatus'),text(form,'church'),text(form,'srPastor'),text(form,'howHeard'),text(form,'goals'),text(form,'smokingDrinking'),text(form,'anythingElse'),now,now
    ).run();
  } else {
    await env.DB.prepare(`UPDATE students SET name=?,phone=?,address=?,date_of_birth=?,marital_status=?,church=?,sr_pastor=?,how_heard=?,goals=?,smoking_drinking=?,anything_else=?,updated_at=? WHERE id=?`).bind(
      name,text(form,'phone'),text(form,'address'),text(form,'dateOfBirth'),text(form,'maritalStatus'),text(form,'church'),text(form,'srPastor'),text(form,'howHeard'),text(form,'goals'),text(form,'smokingDrinking'),text(form,'anythingElse'),now,actualStudentId
    ).run();
  }

  const isPrepaid = Boolean(verificationCode);
  const isFree = Number(classRow.price_cents || 0) <= 0;
  const paymentStatus = isPrepaid || isFree ? 'paid' : 'pending';
  const registrationStatus = isPrepaid || isFree ? 'registered' : 'pending_payment';
  let registrationId = existingRegistration?.id as string | undefined;
  if (existingRegistration) {
    await env.DB.prepare(`UPDATE registrations SET source='online',verification_code=?,payment_status=?,status=?,registered_at=? WHERE id=?`).bind(verificationCode, paymentStatus, registrationStatus, now, registrationId).run();
  } else {
    registrationId = id('registration');
    await env.DB.prepare(`INSERT INTO registrations (id,class_id,student_id,source,verification_code,payment_status,status,registered_at) VALUES (?,?,?,?,?,?,?,?)`).bind(registrationId,classId,actualStudentId,'online',verificationCode,paymentStatus,registrationStatus,now).run();
  }

  if (paymentStatus === 'paid') {
    await sendEightWeekEmail(classRow, { id: actualStudentId, name, email }, registrationId!, now);
    return new Response(null,{status:303,headers:{location:'/register?success=1'}});
  }

  return new Response(null,{status:303,headers:{location:`/payment?registration=${encodeURIComponent(registrationId!)}`}});
};
