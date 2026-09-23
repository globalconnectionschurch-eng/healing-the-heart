import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json } from '../../../lib/server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as { registrationId?: string; discountCode?: string };
    const registrationId = String(body.registrationId ?? '').trim();
    const discountCode = String(body.discountCode ?? '').trim().toUpperCase();
    if (!registrationId) return json({ error: 'Registration is required.' }, 400);

    const row = await env.DB.prepare(`SELECT r.id,r.class_id,r.student_id,r.payment_status,r.source,c.price_cents,c.title,s.name,s.email
      FROM registrations r JOIN classes c ON c.id=r.class_id JOIN students s ON s.id=r.student_id WHERE r.id=?`).bind(registrationId).first<any>();
    if (!row) return json({ error: 'Registration not found.' }, 404);
    if (row.payment_status === 'paid') return json({ ok: true, alreadyPaid: true });
    if (row.source !== 'online') return json({ error: 'This registration is not eligible for online payment.' }, 400);

    const originalAmountCents = Number(row.price_cents || 0);
    if (originalAmountCents <= 0) return json({ error: 'This class does not have an online payment amount.' }, 400);

    let finalAmountCents = originalAmountCents;
    let discountId: string | null = null;
    let discountPercent = 0;
    let discountAmountCents = 0;

    if (discountCode) {
      const now = new Date().toISOString();
      const discount = await env.DB.prepare(`SELECT id,percent_off,max_uses,used_count
        FROM discounts
        WHERE upper(code)=? AND (student_id IS NULL OR student_id=?) AND active=1
          AND (starts_at IS NULL OR starts_at<=?)
          AND (expires_at IS NULL OR expires_at>=?)
          AND (class_id IS NULL OR class_id=?)
          AND (max_uses IS NULL OR used_count<max_uses)
        LIMIT 1`).bind(discountCode, row.student_id, now, now, row.class_id).first<any>();
      if (!discount) return json({ error: 'That discount code is not valid for this attendee or class.' }, 400);
      discountId = String(discount.id);
      discountPercent = Number(discount.percent_off);
      discountAmountCents = Math.round(originalAmountCents * discountPercent / 100);
      finalAmountCents = Math.max(0, originalAmountCents - discountAmountCents);
      await env.DB.prepare(`UPDATE registrations SET discount_id=?,discount_percent=?,original_amount_cents=?,discount_amount_cents=?,final_amount_cents=? WHERE id=?`).bind(
        discountId, discountPercent, originalAmountCents, discountAmountCents, finalAmountCents, registrationId
      ).run();
      await env.DB.prepare('UPDATE discounts SET used_count=used_count+1,updated_at=? WHERE id=?').bind(now, discountId).run();
    } else {
      await env.DB.prepare(`UPDATE registrations SET discount_id=NULL,discount_percent=0,original_amount_cents=?,discount_amount_cents=0,final_amount_cents=? WHERE id=?`).bind(
        originalAmountCents, originalAmountCents, registrationId
      ).run();
    }

    if (finalAmountCents <= 0) {
      await env.DB.prepare(`UPDATE registrations SET payment_status='paid',status='registered' WHERE id=?`).bind(registrationId).run();
      return json({ ok: true, alreadyPaid: true, discounted: true, amount: '0.00' });
    }

    const storeId = String(env.MONERIS_STORE_ID ?? '').trim();
    const apiToken = String(env.MONERIS_API_TOKEN ?? '').trim();
    const checkoutId = String(env.MONERIS_CHECKOUT_ID ?? '').trim();
    const configuredEnvironment = String(env.MONERIS_ENV ?? 'qa').trim().toLowerCase();
    const environment = configuredEnvironment === 'prod' || configuredEnvironment === 'production' ? 'prod' : 'qa';
    if (!storeId || !apiToken || !checkoutId) return json({ error: 'Moneris payment is not configured yet.' }, 503);

    const orderNo = `HTH${Date.now()}${crypto.randomUUID().slice(0, 8)}`;
    const endpoint = environment === 'prod'
      ? 'https://gateway.moneris.com/chktv2/request/request.php'
      : 'https://gatewayt.moneris.com/chktv2/request/request.php';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, api_token: apiToken, checkout_id: checkoutId, txn_total: (finalAmountCents / 100).toFixed(2), environment, action: 'preload', order_no: orderNo, cust_id: row.student_id })
    });
    const rawText = await response.text();
    let data: any;
    try { data = JSON.parse(rawText); } catch { data = { raw: rawText.slice(0, 1000) }; }
    const ticket = String(data?.ticket ?? data?.response?.ticket ?? '').trim();
    if (!response.ok || !ticket) {
      const diagnostic = JSON.stringify(data).slice(0, 1200);
      await env.DB.prepare('UPDATE registrations SET payment_error=? WHERE id=?').bind(`HTTP ${response.status}: ${diagnostic}`, registrationId).run();
      return json({ error: 'Moneris could not start the payment. Please try again.', diagnostic: environment === 'qa' ? `Moneris response (HTTP ${response.status}): ${diagnostic}` : undefined }, 502);
    }

    await env.DB.prepare('UPDATE registrations SET payment_order_no=?,payment_ticket=?,payment_error=NULL WHERE id=?').bind(orderNo, ticket, registrationId).run();
    return json({ ok: true, ticket, environment, amount: (finalAmountCents / 100).toFixed(2), originalAmount: (originalAmountCents / 100).toFixed(2), discountPercent, discountAmount: (discountAmountCents / 100).toFixed(2), classTitle: row.title, name: row.name });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to start payment.' }, 500);
  }
};