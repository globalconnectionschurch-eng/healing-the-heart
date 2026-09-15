import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isAdminRequest, json, nowIso } from '../../../../lib/server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);

  const body = await request.json() as { survivorId?: string; duplicateId?: string; useDuplicateProfile?: boolean };
  const survivorId = String(body.survivorId || '');
  const duplicateId = String(body.duplicateId || '');
  if (!survivorId || !duplicateId || survivorId === duplicateId) {
    return json({ error: 'Choose two different profiles to merge.' }, 400);
  }

  const survivor = await env.DB.prepare('SELECT * FROM students WHERE id=?').bind(survivorId).first<any>();
  const duplicate = await env.DB.prepare('SELECT * FROM students WHERE id=?').bind(duplicateId).first<any>();
  if (!survivor || !duplicate) return json({ error: 'One of the profiles could not be found.' }, 404);

  const duplicateRegs = await env.DB.prepare('SELECT id,class_id FROM registrations WHERE student_id=?').bind(duplicateId).all<any>();
  const statements: any[] = [];
  for (const reg of duplicateRegs.results || []) {
    const existing = await env.DB.prepare('SELECT id FROM registrations WHERE class_id=? AND student_id=?').bind(reg.class_id, survivorId).first<any>();
    if (existing) {
      statements.push(env.DB.prepare('DELETE FROM registrations WHERE id=?').bind(reg.id));
    } else {
      statements.push(env.DB.prepare('UPDATE registrations SET student_id=? WHERE id=?').bind(survivorId, reg.id));
    }
  }

  const source = body.useDuplicateProfile ? duplicate : survivor;
  statements.push(env.DB.prepare(`UPDATE students SET name=?,email=?,phone=?,address=?,date_of_birth=?,marital_status=?,church=?,sr_pastor=?,how_heard=?,goals=?,smoking_drinking=?,anything_else=?,mass_email_opt_out=?,updated_at=? WHERE id=?`).bind(
    source.name || '', source.email || '', source.phone || '', source.address || '', source.date_of_birth || '', source.marital_status || '', source.church || '', source.sr_pastor || '', source.how_heard || '', source.goals || '', source.smoking_drinking || '', source.anything_else || '', source.mass_email_opt_out ? 1 : 0, nowIso(), survivorId
  ));
  statements.push(env.DB.prepare('DELETE FROM students WHERE id=?').bind(duplicateId));

  try {
    await env.DB.batch(statements);
  } catch (error) {
    console.error('Attendee merge failed', error);
    return json({ error: 'The profiles could not be merged. No changes were completed.' }, 500);
  }

  return json({ ok: true, mergedRegistrations: duplicateRegs.results?.length || 0 });
};
