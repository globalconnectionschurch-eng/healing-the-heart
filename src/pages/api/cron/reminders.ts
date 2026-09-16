import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { emailTemplates } from '../../../data/email-templates';
import { fillTemplate, id, json, nowIso, sendEmail } from '../../../lib/server';

export const prerender = false;

function albertaNow() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'America/Edmonton', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(new Date());
  return Object.fromEntries(parts.filter(p=>p.type==='hour'||p.type==='minute').map(p=>[p.type,p.value])) as {hour:string;minute:string};
}
function albertaDate(daysFromToday = 0) {
  const base = new Date(Date.now() + daysFromToday * 86400000);
  return new Intl.DateTimeFormat('en-CA', { timeZone:'America/Edmonton', year:'numeric', month:'2-digit', day:'2-digit' }).format(base);
}

export const POST: APIRoute = async ({ request }) => {
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i,'');
  if (!env.CRON_SECRET || provided !== env.CRON_SECRET) return json({ error:'Unauthorized' },401);
  if (!env.DB) return json({ error:'Database unavailable' },503);
  const now = albertaNow();
  const tomorrow = albertaDate(1);
  const { results: sessions } = await env.DB.prepare(`SELECT cs.*, c.title, c.type_id, c.location_name, c.location_address, c.schedule, c.auto_reminders_enabled, c.auto_reminder_time FROM class_sessions cs JOIN classes c ON c.id=cs.class_id WHERE cs.session_date=? AND c.type_id='eight-week-in-person' AND c.auto_reminders_enabled=1 AND cs.reminder_sent_at IS NULL`).bind(tomorrow).all<any>();
  const due = sessions.filter((session:any)=>String(session.auto_reminder_time||'12:00')===`${now.hour}:${now.minute}`);
  const fallback = emailTemplates.find((item)=>item.id==='eight-week-day-before-reminder')!;
  const sentAt = nowIso();
  let sentCount=0, failedCount=0;
  for (const session of due) {
    const saved = await env.DB.prepare('SELECT * FROM email_templates WHERE system_key=?').bind('eight-week-day-before-reminder').first<any>();
    const template = saved ?? fallback;
    const classTime = session.start_time && session.end_time ? `${session.start_time} – ${session.end_time}` : (session.schedule || session.start_time || '');
    const weekday = new Intl.DateTimeFormat('en-US',{weekday:'long',timeZone:'America/Edmonton'}).format(new Date(`${tomorrow}T12:00:00`));
    const dateRange = `${new Intl.DateTimeFormat('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'America/Edmonton'}).format(new Date(`${tomorrow}T12:00:00`))}`;
    for (const student of (await env.DB.prepare(`SELECT s.* FROM registrations r JOIN students s ON s.id=r.student_id WHERE r.class_id=? AND r.status='registered'`).bind(session.class_id).all<any>()).results) {
      const values={firstName:student.name.split(/\s+/)[0],classTitle:session.title,classTime,weekday,dateRange,siteUrl:env.SITE_URL,contactEmail:env.CONTACT_EMAIL};
      const subject=fillTemplate(template.subject,values); const body=fillTemplate(template.body,values);
      const result=await sendEmail(student.email,subject,body); if(result.sent) sentCount++; else failedCount++;
      await env.DB.prepare(`INSERT INTO email_logs (id,template_id,class_id,student_id,recipient_email,subject,status,provider_message_id,error,sent_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id('email'),template.id,session.class_id,student.id,student.email,subject,result.sent?'sent':'failed',result.messageId??null,result.error??null,sentAt).run();
    }
    await env.DB.prepare('UPDATE class_sessions SET reminder_sent_at=? WHERE id=?').bind(sentAt,session.id).run();
  }
  return json({ ok:true,date:tomorrow,sessions:sessions.length,due:due.length,sentCount,failedCount });
};
