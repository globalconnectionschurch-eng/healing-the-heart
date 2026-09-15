import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { clearSessionCookie, createSessionCookie, json } from '../../lib/server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const password = String(form.get('password') ?? '');
  const configuredPassword = env.ADMIN_PASSWORD;
  if (!configuredPassword || password !== configuredPassword) {
    return json({ ok: false, error: 'Invalid password.' }, 401);
  }
  return new Response(null, { status: 302, headers: { location: '/admin', 'set-cookie': await createSessionCookie() } });
};

export const DELETE: APIRoute = async () => new Response(null, { status: 204, headers: { 'set-cookie': clearSessionCookie() } });
