import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { emailTemplates } from '../../../data/email-templates';
import { fillTemplate, id, isAdminRequest, json, nowIso, sendEmail } from '../../../lib/server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error:'Unauthorized' },401);
  const data = await request.json() as { classId?:string; templateId?:string };
  if (!data.classId || !data.templateId) return json({ error:'Class and template are required.' },400);
  const template = await env.DB.prepare('SELECT * FROM email_templates WHERE id=?').bind(data.templateId).first<any>()
    ?? emailTemplates.find((item)=>item.id===data.templateId);
  if (!template) return json({ error:'Template not found.' },404);
  const classRow = await env.DB.prepare('SELECT * FROM classes WHERE id=?').bind(data.classId).first<any>();
  if (!classRow) return json({ error:'Class not found.' },404);
  const { results } = await env.DB.prepare(`SELECT s.* FROM registrations r JOIN students s ON s.id=r.student_id WHERE r.class_id=? AND r.status='registered'`).bind(data.classId).all<any>();
  const now = nowIso();
  let sentCount=0, failedCount=0;
  for (const student of results) {
    const message = fillTemplate(template.body, {
      firstName:student.name.split(/\s+/)[0],classTitle:classRow.title,locationName:classRow.location_name||'',locationAddress:classRow.location_address||'',schedule:classRow.schedule||'',dateRange:`${classRow.start_date} – ${classRow.end_date}`,parking:classRow.parking||'',whereToGo:classRow.where_to_go||'',contactEmail:env.CONTACT_EMAIL,siteUrl:env.SITE_URL,registrationLink:`${env.SITE_URL}/register`,classTime:classRow.schedule||'',weekday:'',verificationCode:''
    });
    const subject = fillTemplate(template.subject,{firstName:student.name.split(/\s+/)[0],classTitle:classRow.title,classTime:classRow.schedule||''});
    const result = await sendEmail(student.email,subject,message);
    if(result.sent) sentCount++; else failedCount++;
    await env.DB.prepare(`INSERT INTO email_logs (id,template_id,class_id,student_id,recipient_email,subject,status,provider_message_id,error,sent_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(
      id('email'),template.id,data.classId,student.id,student.email,subject,result.sent?'sent':'failed',result.messageId??null,result.error??null,now
    ).run();
  }
  return json({ ok:true,sentCount,failedCount,total:results.length });
};
