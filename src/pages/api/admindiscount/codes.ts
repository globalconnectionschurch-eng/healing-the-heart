import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isDiscountAdmin } from '../../../lib/discount-admin';
import { json, nowIso } from '../../../lib/server';
export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!await isDiscountAdmin(request)) return json({ error: 'Unauthorized' }, 401);
  const { results } = await env.DB.prepare(
    'SELECT d.id,d.code,d.percent_off,d.starts_at,d.expires_at,d.max_uses,d.used_count,d.created_at, g.second_percent_off, c.title AS class_title,s.name AS student_name FROM discounts d LEFT JOIN group_discount_rules g ON g.discount_id=d.id LEFT JOIN classes c ON c.id=d.class_id LEFT JOIN students s ON s.id=d.student_id WHERE d.active=1 AND (d.expires_at IS NULL OR d.expires_at>=?) ORDER BY d.created_at DESC'
  ).bind(nowIso()).all();
  return json({ discounts: results ?? [] }, 200, { 'Cache-Control': 'no-store' });
};

export const POST: APIRoute = async ({ request }) => {
  if (!await isDiscountAdmin(request)) return json({ error: 'Unauthorized' }, 401);
  const b = await request.json().catch(() => ({})) as Record<string, any>;
  const code = String(b.code ?? '').trim().toUpperCase();
  const type = String(b.type ?? 'single');
  const first = Number(b.firstPercent);
  const second = Number(b.secondPercent);
  const maxUses = b.maxUses === '' || b.maxUses == null ? null : Number(b.maxUses);
  const expiresAt = String(b.expiresAt ?? '').trim() || null;
  if (!/^[A-Z0-9_-]{3,40}$/.test(code) || !['single','group'].includes(type) ||
      !Number.isInteger(first) || first < 1 || first > 100 ||
      (type === 'group' && (!Number.isInteger(second) || second < 1 || second > 100)) ||
      (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) ||
      (expiresAt !== null && !Number.isFinite(Date.parse(expiresAt)))) {
    return json({error:'Enter a valid code, percentage, optional expiry and usage limit.'},400);
  }
  const now = nowIso();
  const id = 'discount_' + crypto.randomUUID();
  try {
    const statements = [env.DB.prepare('INSERT INTO discounts (id,student_id,code,percent_off,active,starts_at,expires_at,max_uses,used_count,class_id,created_at,updated_at) VALUES (?,NULL,?,?,1,NULL,?,?,0,NULL,?,?)').bind(id,code,first,expiresAt,maxUses,now,now)];
    if (type === 'group') {
      statements.push(env.DB.prepare('INSERT INTO group_discount_rules (discount_id,second_percent_off) VALUES (?,?)').bind(id,second));
    }
    await env.DB.batch(statements);
    return json({ ok:true, id }, 201);
  } catch (e) {
    return json({error:String(e).includes('UNIQUE')?'That code is already in use.':'Unable to create discount.'},409);
  }
};
