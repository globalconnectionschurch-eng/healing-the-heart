import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json } from '../../../lib/server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as { registrationId?: string };
    const registrationId = String(body.registrationId ?? '').trim();
    if (!registrationId) return json({ error: 'Registration is required.' }, 400);

    const row = await env.DB.prepare(`SELECT r.id,r.class_id,r.student_id,r.payment_status,r.source,c.price_cents,c.title,s.name,s.email
      FROM registrations r JOIN classes c ON c.id=r.class_id JOIN students s ON s.id=r.student_id WHERE r.id=?`).bind(registrationId).first<any>();
    if (!row) return json({ error: 'Registration not found.' }, 404);
    if (row.payment_status === 'paid') return json({ ok: true, alreadyPaid: true });
    if (row.source !== 'online') return json({ error: 'This registration is not eligible for online payment.' }, 400);
    const amountCents = Number(row.price_cents || 0);
    if (amountCents <= 0) return json({ error: 'This class does not have an online payment amount.' }, 400);

    const storeId = String(env.MONERIS_STORE_ID ?? '').trim();
    const apiToken = String(env.MONERIS_API_TOKEN ?? '').trim();
    const checkoutId = String(env.MONERIS_CHECKOUT_ID ?? '').trim();
    const environment = String(env.MONERIS_ENV ?? 'qa').trim() === 'prod' ? 'prod' : 'qa';
    if (!storeId || !apiToken || !checkoutId) return json({ error: 'Moneris payment is not configured yet.' }, 503);

    const orderNo = `HTH-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    const endpoint = environment === 'prod'
      ? 'https://gateway.moneris.com/chktv2/request/request.php'
      : 'https://gatewayt.moneris.com/chktv2/request/request.php';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, api_token: apiToken, checkout_id: checkoutId, txn_total: (amountCents / 100).toFixed(2), environment, action: 'preload', order_no: orderNo, cust_id: row.student_id })
    });
    const data = await response.json() as any;
    const ticket = String(data?.ticket ?? data?.response?.ticket ?? '').trim();
    if (!response.ok || !ticket) {
      await env.DB.prepare('UPDATE registrations SET payment_error=? WHERE id=?').bind(JSON.stringify(data).slice(0, 2000), registrationId).run();
      return json({ error: 'Moneris could not start the payment. Please try again.' }, 502);
    }

    await env.DB.prepare('UPDATE registrations SET payment_order_no=?,payment_ticket=?,payment_error=NULL WHERE id=?').bind(orderNo, ticket, registrationId).run();
    return json({ ok: true, ticket, environment, amount: (amountCents / 100).toFixed(2), classTitle: row.title, name: row.name });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to start payment.' }, 500);
  }
};
