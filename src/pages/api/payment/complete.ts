import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { emailTemplates } from '../../../data/email-templates';
import { fillTemplate, id, json, nowIso, sendEmail } from '../../../lib/server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as { registrationId?: string; ticket?: string };
    const registrationId = String(body.registrationId ?? '').trim();
    const ticket = String(body.ticket ?? '').trim();
    if (!registrationId || !ticket) return json({ error: 'Payment information is incomplete.' }, 400);

    const row = await env.DB.prepare(`SELECT r.*,c.title,c.type_id,c.start_date,c.end_date,c.schedule,c.location_name,c.location_address,c.parking,c.where_to_go,s.name,s.email
      FROM registrations r JOIN classes c ON c.id=r.class_id JOIN students s ON s.id=r.student_id WHERE r.id=?`).bind(registrationId).first<any>();
    if (!row) return json({ error: 'Registration not found.' }, 404);
    if (row.payment_status === 'paid') return json({ ok: true, paid: true });
    if (row.source !== 'online') return json({ error: 'This registration is not an online payment registration.' }, 400);
    if (row.payment_ticket !== ticket) return json({ error: 'Payment session does not match this registration.' }, 409);

    const storeId = String(env.MONERIS_STORE_ID ?? '').trim();
    const apiToken = String(env.MONERIS_API_TOKEN ?? '').trim();
    const checkoutId = String(env.MONERIS_CHECKOUT_ID ?? '').trim();
    const environment = String(env.MONERIS_ENV ?? 'qa').trim() === 'prod' ? 'prod' : 'qa';
    if (!storeId || !apiToken || !checkoutId) return json({ error: 'Moneris payment is not configured yet.' }, 503);

    const endpoint = environment === 'prod'
      ? 'https://gateway.moneris.com/chktv2/request/request.php'
      : 'https://gatewayt.moneris.com/chktv2/request/request.php';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, api_token: apiToken, checkout_id: checkoutId, ticket, environment, action: 'receipt' })
    });
    const data = await response.json() as any;
    const receipt = data?.receipt ?? data?.response ?? data;
    const responseCode = String(receipt?.response_code ?? receipt?.responseCode ?? receipt?.ResponseCode ?? '').trim();
    const message = String(receipt?.message ?? receipt?.Message ?? '').trim();
    const approved = response.ok && (responseCode === '001' || /approved/i.test(message));
    const transactionId = String(receipt?.txn_number ?? receipt?.txnNumber ?? receipt?.transaction_id ?? receipt?.transactionId ?? '').trim() || null;
    const now = nowIso();

    if (!approved) {
      await env.DB.prepare('UPDATE registrations SET payment_status=?,payment_error=? WHERE id=?').bind('failed', `${responseCode || 'unknown'} ${message}`.trim().slice(0, 1000), registrationId).run();
      return json({ ok: false, error: 'Moneris did not approve the payment. Please try again or contact us.' }, 402);
    }

    await env.DB.prepare(`UPDATE registrations SET payment_status='paid',status='registered',payment_transaction_id=?,paid_at=?,payment_error=NULL WHERE id=?`).bind(transactionId, now, registrationId).run();

    if (row.type_id === 'eight-week-in-person') {
      const saved = await env.DB.prepare('SELECT * FROM email_templates WHERE system_key=?').bind('eight-week-class-details').first<any>();
      const fallback = emailTemplates.find((item) => item.id === 'eight-week-class-details')!;
      const subjectTemplate = saved?.subject ?? fallback.subject;
      const bodyTemplate = saved?.body ?? fallback.body;
      const values = {
        firstName: row.name.split(/\s+/)[0], classTitle: row.title, locationName: row.location_name || '', locationAddress: row.location_address || '', schedule: row.schedule || '', dateRange: `${row.start_date} – ${row.end_date}`, parking: row.parking || '', whereToGo: row.where_to_go || '', contactEmail: env.CONTACT_EMAIL, siteUrl: env.SITE_URL, paymentInstructions: 'Your payment has been received.'
      };
      const subject = fillTemplate(subjectTemplate, values);
      const messageText = fillTemplate(bodyTemplate, values);
      const sent = await sendEmail(row.email, subject, messageText);
      await env.DB.prepare(`INSERT INTO email_logs (id,template_id,class_id,student_id,recipient_email,subject,status,provider_message_id,error,sent_at) VALUES (?,?,?,?,?,?,?,?,?,?)`).bind(id('email'), saved?.id ?? fallback.id, row.class_id, row.student_id, row.email, subject, sent.sent ? 'sent' : 'failed', sent.messageId ?? null, sent.error ?? null, now).run();
    }

    return json({ ok: true, paid: true, transactionId });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to confirm payment.' }, 500);
  }
};
