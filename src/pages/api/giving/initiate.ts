import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, nowIso } from '../../../lib/server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as { name?: string; email?: string; phone?: string; amount?: number; purpose?: string };
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = String(body.phone ?? '').trim();
    const amount = Number(body.amount ?? 0);
    const purpose = String(body.purpose ?? 'Ministry support').trim() || 'Ministry support';
    if (!name || !email || !phone || !Number.isFinite(amount) || amount < 1) return json({ error: 'Please provide your name, email, phone number, and a valid amount.' }, 400);
    const amountCents = Math.round(amount * 100);
    if (amountCents < 100) return json({ error: 'The minimum giving amount is $1.00.' }, 400);

    const student = await env.DB.prepare('SELECT id FROM students WHERE lower(email)=? LIMIT 1').bind(email).first<any>();
    let studentId = student?.id;
    if (!studentId) {
      const inserted = await env.DB.prepare('INSERT INTO students (name,email,phone,created_at) VALUES (?,?,?,?)').bind(name, email, phone, nowIso()).run();
      studentId = inserted.meta.last_row_id;
    } else {
      await env.DB.prepare('UPDATE students SET name=?,phone=? WHERE id=?').bind(name, phone, studentId).run();
    }

    const id = crypto.randomUUID();
    const transactionId = `GIVE-${Date.now()}-${crypto.randomUUID().slice(0,8)}`;
    const now = nowIso();
    await env.DB.prepare(`INSERT INTO giving_transactions (id,student_id,source,method,purpose,amount_cents,currency,transaction_id,status,occurred_at,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id,studentId,'online','credit_card',purpose,amountCents,'CAD',transactionId,'pending',now,'public_giving',now,now).run();

    const storeId = String(env.MONERIS_STORE_ID ?? '').trim();
    const apiToken = String(env.MONERIS_API_TOKEN ?? '').trim();
    const checkoutId = String(env.MONERIS_CHECKOUT_ID ?? '').trim();
    const configuredEnvironment = String(env.MONERIS_ENV ?? 'qa').trim().toLowerCase();
    const environment = configuredEnvironment === 'prod' || configuredEnvironment === 'production' ? 'prod' : 'qa';
    if (!storeId || !apiToken || !checkoutId) return json({ error: 'Online giving is not configured yet.' }, 503);
    const orderNo = `HTHG${Date.now()}${crypto.randomUUID().slice(0,8)}`;
    const endpoint = environment === 'prod' ? 'https://gateway.moneris.com/chktv2/request/request.php' : 'https://gatewayt.moneris.com/chktv2/request/request.php';
    const response = await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({store_id:storeId,api_token:apiToken,checkout_id:checkoutId,txn_total:(amountCents/100).toFixed(2),environment,action:'preload',order_no:orderNo,cust_id:studentId})});
    const raw = await response.text();
    let data:any; try { data=JSON.parse(raw); } catch { data={raw:raw.slice(0,1000)}; }
    const ticket=String(data?.ticket ?? data?.response?.ticket ?? '').trim();
    if (!response.ok || !ticket) return json({error:'The payment service could not start. Please try again.'},502);
    await env.DB.prepare('UPDATE giving_transactions SET external_reference=?,updated_at=? WHERE transaction_id=?').bind(JSON.stringify({orderNo,ticket}),now,transactionId).run();
    return json({ok:true,ticket,environment,amount:(amountCents/100).toFixed(2),transactionId});
  } catch (error) { return json({error:error instanceof Error ? error.message : 'Unable to start giving.'},500); }
};
