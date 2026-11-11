import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isDiscountAdmin } from '../../lib/discount-admin';
import { emailTemplates } from '../../data/email-templates';
import { fillTemplate, id, isAdminRequest, json, nowIso, sendEmail } from '../../lib/server';

// This API deliberately grants the discount portal access ONLY to mail operations.
// It never grants full administration or access to sensitive student profiles.
export const prerender = false;
const allowed = async (request: Request) => (await isAdminRequest(request)) || (await isDiscountAdmin(request));
const emailPattern = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const recipientList = (value: unknown) => String(value ?? '').split(/[,;\n]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
const reply = (data: unknown, status = 200) => json(data, status, { 'Cache-Control': 'no-store' });
const originIsSafe = (request: Request) => {
  const origin = request.headers.get('Origin');
  return !origin || origin === new URL(request.url).origin;
};

async function ensureTemplates() {
  const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM email_templates').first<{n: number}>();
  if ((count?.n ?? 0) > 0) return;
  const now = nowIso();
  for (const t of emailTemplates) {
    await env.DB.prepare('INSERT OR IGNORE INTO email_templates (id,name,trigger_description,subject,body,system_key,editable,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .bind(t.id, t.name, t.trigger, t.subject, t.body, t.id, t.editable ? 1 : 0, now, now).run();
  }
}

async function logMessage(recipient: string, subject: string, sent: {sent: boolean; messageId?: string; error?: string}, opts: {classId?: string | null; studentId?: string | null; templateId?: string | null} = {}) {
  await env.DB.prepare('INSERT INTO email_logs (id,template_id,class_id,student_id,recipient_email,subject,status,provider_message_id,error,sent_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .bind(id('email'), opts.templateId ?? null, opts.classId ?? null, opts.studentId ?? null, recipient, subject, sent.sent ? 'sent' : 'failed', sent.messageId ?? null, sent.error ?? null, nowIso()).run();
}

export const GET: APIRoute = async ({request, url}) => {
  if (!await allowed(request)) return reply({error:'Unauthorized'}, 401);
  const view = url.searchParams.get('view');
  if (view === 'contacts') {
    const search = String(url.searchParams.get('q') ?? '').trim().slice(0, 80);
    const {results} = await env.DB.prepare('SELECT id,name,email FROM students WHERE email IS NOT NULL AND TRIM(email)<>"" AND (name LIKE ? OR email LIKE ?) ORDER BY name COLLATE NOCASE LIMIT 200')
      .bind('%' + search + '%', '%' + search + '%').all<{id:string;name:string;email:string}>();
    return reply({contacts:results});
  }
  if (view === 'classes') {
    const {results} = await env.DB.prepare("SELECT c.id,c.title,(SELECT COUNT(*) FROM registrations r WHERE r.class_id=c.id AND r.status='registered') AS student_count FROM classes c ORDER BY c.start_date DESC LIMIT 100").all();
    return reply({classes:results});
  }
  if (view === 'templates') {
    await ensureTemplates();
    const {results} = await env.DB.prepare('SELECT id,name,subject,body,trigger_description FROM email_templates ORDER BY created_at').all();
    return reply({templates:results});
  }
  if (view === 'history') {
    const {results} = await env.DB.prepare('SELECT recipient_email,subject,status,error,sent_at FROM email_logs ORDER BY sent_at DESC LIMIT 100').all();
    return reply({logs:results});
  }
  return reply({error:'Unknown email view.'},400);
};

export const POST: APIRoute = async ({request}) => {
  if (!await allowed(request)) return reply({error:'Unauthorized'},401);
  if (!originIsSafe(request)) return reply({error:'Invalid request origin.'},403);
  const data = await request.json().catch(() => null) as Record<string,any> | null;
  if (!data) return reply({error:'Invalid request.'},400);
  const action = String(data.action ?? '');

  if (action === 'compose') {
    const to = recipientList(data.to), cc = recipientList(data.cc), bcc = recipientList(data.bcc);
    const subject = String(data.subject ?? '').trim(), message = String(data.message ?? '').trim();
    const all = [...to, ...cc, ...bcc];
    if (!to.length || !subject || !message) return reply({error:'To, subject and message are required.'},400);
    if (subject.length > 180 || message.length > 30000) return reply({error:'Subject or message is too long.'},400);
    if (all.length > 50) return reply({error:'Maximum 50 total recipients per email.'},400);
    if (all.some(e => !emailPattern.test(e))) return reply({error:'Check the To, CC and BCC email addresses.'},400);
    if (new Set(all).size !== all.length) return reply({error:'The same address cannot be entered more than once.'},400);
    // Basic rolling limit discourages misuse of the shared discount-password portal.
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip));
    const key = Array.from(new Uint8Array(bytes)).map(b=>b.toString(16).padStart(2,'0')).join('');
    await env.DB.prepare('CREATE TABLE IF NOT EXISTS email_compose_limits (ip_hash TEXT PRIMARY KEY, window_start INTEGER NOT NULL, attempts INTEGER NOT NULL)').run();
    const now = Date.now();
    const rate = await env.DB.prepare('SELECT window_start,attempts FROM email_compose_limits WHERE ip_hash=?').bind(key).first<{window_start:number;attempts:number}>();
    if (rate && now-rate.window_start < 600000 && rate.attempts >= 20) return reply({error:'Email send limit reached; try again in a few minutes.'},429);
    await env.DB.prepare('INSERT INTO email_compose_limits (ip_hash,window_start,attempts) VALUES (?,?,1) ON CONFLICT(ip_hash) DO UPDATE SET window_start=excluded.window_start,attempts=excluded.attempts')
      .bind(key, rate && now-rate.window_start < 600000 ? rate.window_start : now, rate && now-rate.window_start < 600000 ? rate.attempts+1 : 1).run();
    const sent = await sendEmail(to[0],subject,message,{to,cc,bcc});
    for(const address of all) await logMessage(address,subject,sent);
    if(!sent.sent) return reply({error:sent.error || 'Email provider rejected the message.'},502);
    return reply({ok:true,recipientCount:all.length,providerMessageId:sent.messageId});
  }

  if (action === 'class') {
    const classId = String(data.classId ?? ''), templateId = String(data.templateId ?? '');
    if (!classId || !templateId) return reply({error:'Choose a class and template.'},400);
    const classRow = await env.DB.prepare('SELECT * FROM classes WHERE id=?').bind(classId).first<any>();
    if (!classRow) return reply({error:'Class not found.'},404);
    const template = await env.DB.prepare('SELECT * FROM email_templates WHERE id=?').bind(templateId).first<any>() ?? emailTemplates.find(x=>x.id===templateId);
    if (!template) return reply({error:'Template not found.'},404);
    const {results} = await env.DB.prepare("SELECT s.id,s.name,s.email FROM registrations r JOIN students s ON r.student_id=s.id WHERE r.class_id=? AND r.status='registered' AND s.email IS NOT NULL AND TRIM(s.email)<>''").bind(classId).all<any>();
    if (!data.confirm) return reply({preview:true,total:results.length});
    let sentCount=0, failedCount=0;
    const formatDate = (value:string) => {
      const date = new Date(String(value || '')+'T12:00:00');
      return Number.isNaN(date.getTime())?String(value ?? ''):new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'long',day:'numeric',timeZone:'America/Edmonton'}).format(date);
    };
    const weekday = (()=>{const d=new Date(String(classRow.start_date||'')+'T12:00:00');return Number.isNaN(d.getTime())?'':new Intl.DateTimeFormat('en-CA',{weekday:'long',timeZone:'America/Edmonton'}).format(d);})();
    const dateRange = formatDate(classRow.start_date)+' – '+formatDate(classRow.end_date);
    const classTime = String(classRow.schedule||'').replace(/^[^,]+,\s*/,'').trim();
    for (const student of results) {
      const vars = {
        firstName:String(student.name||'').split(/\s+/)[0], classTitle:classRow.title, locationName:classRow.location_name||'',
        locationAddress:classRow.location_address||'', schedule:classRow.schedule||'', dateRange, weekday,classTime,
        parking:classRow.parking||'', whereToGo:classRow.where_to_go||'', whatToBring:classRow.what_to_bring||'',
        contactEmail:env.CONTACT_EMAIL,siteUrl:env.SITE_URL,registrationLink:env.SITE_URL+'/register',
        paymentInstructions:classRow.payment_instructions||'',verificationCode:''
      };
      const subject=fillTemplate(template.subject,vars), body=fillTemplate(template.body,vars);
      const sent=await sendEmail(student.email,subject,body);
      if(sent.sent) sentCount++; else failedCount++;
      await logMessage(student.email,subject,sent,{classId,studentId:student.id,templateId});
    }
    return reply({ok:true,total:results.length,sentCount,failedCount});
  }

  if (action === 'broadcast') {
    const subject=String(data.subject??'').trim(), message=String(data.message??'').trim();
    if(!subject || !message || subject.length>180 || message.length>30000) return reply({error:'Enter a valid subject and message.'},400);
    const {results}=await env.DB.prepare("SELECT id,email FROM students WHERE COALESCE(mass_email_opt_out,0)=0 AND email IS NOT NULL AND TRIM(email)<>'' ORDER BY name COLLATE NOCASE").all<any>();
    if(!data.confirm) return reply({preview:true,total:results.length});
    let sentCount=0,failedCount=0;
    for(const student of results) {
      const sent=await sendEmail(student.email,subject,message);
      if(sent.sent)sentCount++;else failedCount++;
      await logMessage(student.email,subject,sent,{studentId:student.id});
    }
    return reply({ok:true,total:results.length,sentCount,failedCount});
  }

  if (action === 'save-template') {
    const name=String(data.name??'').trim(),subject=String(data.subject??'').trim(),body=String(data.body??'').trim(),trigger=String(data.trigger??'').trim();
    if(!name||!subject||!body||name.length>140||subject.length>180||body.length>30000) return reply({error:'Enter a valid name, subject and body.'},400);
    const now=nowIso();
    if(data.templateId) {
      const templateId=String(data.templateId);
      const current=await env.DB.prepare('SELECT id FROM email_templates WHERE id=?').bind(templateId).first();
      if(!current) return reply({error:'Template not found.'},404);
      await env.DB.prepare('UPDATE email_templates SET name=?,subject=?,body=?,trigger_description=?,updated_at=? WHERE id=?').bind(name,subject,body,trigger,now,templateId).run();
      return reply({ok:true,id:templateId});
    }
    const templateId=id('template');
    await env.DB.prepare('INSERT INTO email_templates (id,name,subject,body,trigger_description,editable,created_at,updated_at) VALUES (?,?,?,?,?,1,?,?)')
      .bind(templateId,name,subject,body,trigger,now,now).run();
    return reply({ok:true,id:templateId});
  }

  return reply({error:'Unknown email action.'},400);
};