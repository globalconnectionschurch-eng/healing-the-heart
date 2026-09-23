import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;
const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const crisisChoices = (form: FormData) => {
  const choices = form.getAll('currentCrisis').map((value) => String(value).trim()).filter(Boolean);
  const other = text(form, 'currentCrisisOther');
  if (other) choices.push(`Other: ${other}`);
  return choices.join(', ');
};

async function ensureStudentProfileColumns() {
  const existing = await env.DB.prepare('PRAGMA table_info(students)').all<any>();
  const columns = new Set((existing.results ?? []).map((row: any) => row.name));
  const additions: Record<string, string> = {
    diagnosis: 'TEXT', learning_restrictions: 'TEXT', adopted: 'TEXT', major_trauma: 'TEXT', grief: 'TEXT',
    in_ministry: 'TEXT', dietary_restrictions: 'TEXT', current_crisis: 'TEXT', self_harm_history: 'TEXT'
  };
  for (const [name, definition] of Object.entries(additions)) {
    if (!columns.has(name)) await env.DB.prepare(`ALTER TABLE students ADD COLUMN ${name} ${definition}`).run();
  }
}

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  if (text(form, 'website')) return new Response(null, { status: 204 });
  const name = text(form, 'name');
  const email = text(form, 'email').toLowerCase();
  const classId = text(form, 'classId');
  if (!name || !email || !classId) return new Response(JSON.stringify({ ok: false, error: 'Name, email, and class are required.' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } });
  if (!env.DB) return new Response(JSON.stringify({ ok: false, error: 'Registration is temporarily unavailable.' }), { status: 503, headers: { 'content-type': 'application/json; charset=utf-8' } });

  await ensureStudentProfileColumns();
  const classRow = await env.DB.prepare('SELECT * FROM classes WHERE id=? AND end_date>=date(\'now\')').bind(classId).first<any>();
  if (!classRow) return new Response(JSON.stringify({ ok: false, error: 'That class is no longer available.' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } });

  const existing = await env.DB.prepare('SELECT id FROM students WHERE lower(email)=?').bind(email).first<{id:string}>();
  const actualStudentId = existing?.id ?? `student_${crypto.randomUUID()}`;
  const existingRegistration = await env.DB.prepare('SELECT id,source,verification_code,payment_status FROM registrations WHERE class_id=? AND student_id=?').bind(classId, actualStudentId).first<any>();
  if (classRow.capacity && !existingRegistration) {
    const count = await env.DB.prepare(`SELECT COUNT(*) AS count FROM registrations WHERE class_id=? AND status IN ('registered','pending_payment')`).bind(classId).first<{count:number}>();
    if ((count?.count ?? 0) >= Number(classRow.capacity)) return new Response(JSON.stringify({ ok: false, error: 'That class is currently full.' }), { status: 409, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }

  const now = new Date().toISOString();
  const verificationCode = text(form, 'verificationCode').toUpperCase() || existingRegistration?.verification_code || null;
  const currentCrisis = crisisChoices(form);
  const profile = [
    text(form,'phone'), text(form,'address'), text(form,'dateOfBirth'), text(form,'maritalStatus'), text(form,'church'), text(form,'srPastor'),
    text(form,'howHeard'), text(form,'goals'), text(form,'smokingDrinking'), text(form,'anythingElse'), text(form,'diagnosis'),
    text(form,'learningRestrictions'), text(form,'adopted'), text(form,'majorTrauma'), text(form,'grief'), text(form,'inMinistry'),
    text(form,'dietaryRestrictions'), currentCrisis, text(form,'selfHarmHistory')
  ];

  if (!existing) {
    await env.DB.prepare(`INSERT INTO students (id,name,email,phone,address,date_of_birth,marital_status,church,sr_pastor,how_heard,goals,smoking_drinking,anything_else,diagnosis,learning_restrictions,adopted,major_trauma,grief,in_ministry,dietary_restrictions,current_crisis,self_harm_history,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(actualStudentId,name,email,...profile,now,now).run();
  } else {
    await env.DB.prepare(`UPDATE students SET name=?,phone=?,address=?,date_of_birth=?,marital_status=?,church=?,sr_pastor=?,how_heard=?,goals=?,smoking_drinking=?,anything_else=?,diagnosis=?,learning_restrictions=?,adopted=?,major_trauma=?,grief=?,in_ministry=?,dietary_restrictions=?,current_crisis=?,self_harm_history=?,updated_at=? WHERE id=?`).bind(name,...profile,now,actualStudentId).run();
  }

  if (verificationCode) {
    const discount = await env.DB.prepare(`SELECT id FROM discounts
      WHERE upper(code)=? AND (student_id IS NULL OR student_id=?) AND active=1
        AND (starts_at IS NULL OR starts_at<=?)
        AND (expires_at IS NULL OR expires_at>=?)
        AND (class_id IS NULL OR class_id=?)
        AND (max_uses IS NULL OR used_count<max_uses)
      LIMIT 1`).bind(verificationCode, actualStudentId, now, now, classId).first<{id:string}>();
    if (!discount) return new Response(JSON.stringify({ ok: false, error: 'That discount code is not valid for this attendee or class.' }), { status: 400, headers: { 'content-type': 'application/json; charset=utf-8' } });
  }

  // A code from the unified discount system never bypasses payment automatically.
  // The same stored code is carried into the payment page and applied there.
  const isFree = Number(classRow.price_cents || 0) <= 0;
  const paymentStatus = isFree ? 'paid' : 'pending';
  const registrationStatus = isFree ? 'registered' : 'pending_payment';
  let registrationId = existingRegistration?.id as string | undefined;
  if (existingRegistration) {
    await env.DB.prepare(`UPDATE registrations SET source='online',verification_code=?,payment_status=?,status=?,registered_at=? WHERE id=?`).bind(verificationCode, paymentStatus, registrationStatus, now, registrationId).run();
  } else {
    registrationId = `registration_${crypto.randomUUID()}`;
    await env.DB.prepare(`INSERT INTO registrations (id,class_id,student_id,source,verification_code,payment_status,status,registered_at) VALUES (?,?,?,?,?,?,?,?)`).bind(registrationId,classId,actualStudentId,'online',verificationCode,paymentStatus,registrationStatus,now).run();
  }

  // Automatic emails are intentionally disabled for now.
  if (paymentStatus === 'paid') return new Response(null,{status:303,headers:{location:'/register?success=1'}});
  return new Response(null,{status:303,headers:{location:`/payment?registration=${encodeURIComponent(registrationId!)}`}});
};
