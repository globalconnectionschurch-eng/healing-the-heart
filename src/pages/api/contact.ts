import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { escapeHtml, json, sendEmail } from '../../lib/server';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  if (String(form.get('website') ?? '').trim()) return json({ ok: true });
  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const topic = String(form.get('topic') ?? 'General question').trim();
  const message = String(form.get('message') ?? '').trim();
  if (!name || !email || !message || !email.includes('@')) return json({ error: 'Please complete your name, email, and message.' }, 400);
  const body = `New Healing the Heart contact message\n\nName: ${name}\nEmail: ${email}\nTopic: ${topic}\n\nMessage:\n${message}`;
  const result = await sendEmail(env.CONTACT_EMAIL, `Healing the Heart contact: ${topic}`, body);
  if (!result.sent) return json({ error: result.error ?? 'Email could not be sent.' }, 502);
  return json({ ok: true });
};
