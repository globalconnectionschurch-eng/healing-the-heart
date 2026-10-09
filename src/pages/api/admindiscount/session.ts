import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { checkDiscountPassword, clearDiscountCookie, discountSessionCookie } from '../../../lib/discount-admin';
import { json } from '../../../lib/server';
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json().catch(() => ({})) as { password?: string };
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const ipHash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip)))).map(x => x.toString(16).padStart(2,'0')).join('');
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS discount_admin_attempts (ip_hash TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_start INTEGER NOT NULL)').run();
  const now = Date.now();
  const previous = await env.DB.prepare('SELECT attempts, window_start FROM discount_admin_attempts WHERE ip_hash=?').bind(ipHash).first<{attempts:number;window_start:number}>();
  if (previous && now - previous.window_start < 900000 && previous.attempts >= 8) {
    return json({ error: 'Too many attempts. Try again in 15 minutes.' }, 429);
  }
  if (!await checkDiscountPassword(String(body.password ?? ''))) {
    await env.DB.prepare('INSERT INTO discount_admin_attempts (ip_hash,attempts,window_start) VALUES (?,?,?) ON CONFLICT(ip_hash) DO UPDATE SET attempts=excluded.attempts,window_start=excluded.window_start').bind(ipHash, previous && now - previous.window_start < 900000 ? previous.attempts + 1 : 1, previous && now - previous.window_start < 900000 ? previous.window_start : now).run();
    return json({ error: 'Incorrect password.' }, 401);
  }
  await env.DB.prepare('DELETE FROM discount_admin_attempts WHERE ip_hash=?').bind(ipHash).run();
  return json({ ok: true }, 200, { 'Set-Cookie': await discountSessionCookie(), 'Cache-Control': 'no-store' });
};
export const DELETE: APIRoute = async () => json({ok:true},200,{'Set-Cookie':clearDiscountCookie(),'Cache-Control':'no-store'});
