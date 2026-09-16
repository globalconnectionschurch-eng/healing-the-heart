import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { clearSessionCookie, createSessionCookie, getConfiguredAdminPassword, json, verifyAdminPassword } from '../../lib/server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const configured = await getConfiguredAdminPassword();
  const valid = configured.overrideHash
    ? await verifyAdminPassword(password, configured.overrideHash)
    : Boolean(configured.envPassword) && password === configured.envPassword;
  if (!valid) return json({ ok: false, error: 'Invalid password.' }, 401);
  return new Response(null, { status: 302, headers: { location: '/admin', 'set-cookie': await createSessionCookie() } });
};

export const DELETE: APIRoute = async () => new Response(null, { status: 204, headers: { 'set-cookie': clearSessionCookie() } });
