import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { emailTemplates } from '../../../data/email-templates';
import { id, isAdminRequest, json, nowIso } from '../../../lib/server';

export const prerender = false;

async function ensureSeeded() {
  const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM email_templates').first<{count:number}>();
  if ((count?.count ?? 0) > 0) return;
  const now = nowIso();
  for (const template of emailTemplates) {
    await env.DB.prepare(`INSERT INTO email_templates (id,name,trigger_description,subject,body,system_key,editable,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(
      template.id, template.name, template.trigger, template.subject, template.body, template.id, template.editable ? 1 : 0, now, now
    ).run();
  }
}

export const GET: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  await ensureSeeded();
  const { results } = await env.DB.prepare('SELECT * FROM email_templates ORDER BY created_at').all();
  return json({ templates: results });
};

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const data = await request.json() as Record<string,string>;
  if (!data.name || !data.subject || !data.body) return json({ error: 'Name, subject, and body are required.' }, 400);
  const templateId = id('template');
  const now = nowIso();
  await env.DB.prepare(`INSERT INTO email_templates (id,name,trigger_description,subject,body,editable,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`).bind(
    templateId,data.name,data.trigger ?? '',data.subject,data.body,1,now,now
  ).run();
  return json({ ok:true, id:templateId }, 201);
};

export const PUT: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const data = await request.json() as Record<string,string>;
  if (!data.id || !data.name || !data.subject || !data.body) return json({ error: 'Template id, name, subject, and body are required.' }, 400);
  await env.DB.prepare(`UPDATE email_templates SET name=?,trigger_description=?,subject=?,body=?,updated_at=? WHERE id=?`).bind(
    data.name,data.trigger ?? '',data.subject,data.body,nowIso(),data.id
  ).run();
  return json({ ok:true });
};
