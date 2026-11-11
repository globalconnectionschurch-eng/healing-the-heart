import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { id, isAdminRequest, json, nowIso, sendEmail } from '../../../lib/server';

export const prerender = false;

// A safe administrator-only test. No recipient can be supplied by the browser.
const TEST_RECIPIENT = 'healingtheheartca@gmail.com';

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ error: 'Unauthorized' }, 401);
  const subject = 'Healing the Heart email setup — test';
  const message = [
    'This is a test email sent from the Healing the Heart administration dashboard.',
    '',
    'If this email arrived with info@healingtheheart.ca as the sender, outbound email is working.',
    'Reply to this message to confirm replies forward to healingtheheartca@gmail.com.',
    '',
    'Healing the Heart',
    'https://healingtheheart.ca'
  ].join('\n');
  const sent = await sendEmail(TEST_RECIPIENT, subject, message);
  await env.DB.prepare(
    'INSERT INTO email_logs (id,template_id,class_id,student_id,recipient_email,subject,status,provider_message_id,error,sent_at) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).bind(id('email'), null, null, null, TEST_RECIPIENT, subject, sent.sent ? 'sent' : 'failed', sent.messageId ?? null, sent.error ?? null, nowIso()).run();
  if (!sent.sent) return json({ error: sent.error || 'The provider rejected the message.' }, 502);
  return json({ ok: true, recipient: TEST_RECIPIENT, providerMessageId: sent.messageId });
};
