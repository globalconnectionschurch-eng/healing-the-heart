import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, nowIso } from '../../../lib/server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as { transactionId?: string; ticket?: string };
    const transactionId = String(body.transactionId ?? '').trim();
    const ticket = String(body.ticket ?? '').trim();
    if (!transactionId || !ticket) return json({ error: 'Payment information is incomplete.' },400);
    const row = await env.DB.prepare('SELECT * FROM giving_transactions WHERE transaction_id=? LIMIT 1').bind(transactionId).first<any>();
    if (!row) return json({ error: 'Giving transaction not found.' },404);
    if (row.status === 'completed') return json({ok:true,paid:true});
    const reference = JSON.parse(String(row.external_reference || '{}'));
    if (reference.ticket !== ticket) return json({error:'Payment session does not match this gift.'},409);
    const storeId=String(env.MONERIS_STORE_ID ?? '').trim(); const apiToken=String(env.MONERIS_API_TOKEN ?? '').trim(); const checkoutId=String(env.MONERIS_CHECKOUT_ID ?? '').trim();
    const configured=String(env.MONERIS_ENV ?? 'qa').trim().toLowerCase(); const environment=configured==='prod'||configured==='production'?'prod':'qa';
    const endpoint=environment==='prod'?'https://gateway.moneris.com/chktv2/request/request.php':'https://gatewayt.moneris.com/chktv2/request/request.php';
    const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({store_id:storeId,api_token:apiToken,checkout_id:checkoutId,ticket,environment,action:'receipt'})});
    const data=await response.json() as any; const receipt=data?.receipt ?? data?.response ?? data; const code=String(receipt?.response_code ?? receipt?.responseCode ?? receipt?.ResponseCode ?? '').trim(); const message=String(receipt?.message ?? receipt?.Message ?? '').trim(); const approved=response.ok&&(code==='001'||/approved/i.test(message)); const txn=String(receipt?.txn_number ?? receipt?.txnNumber ?? receipt?.transaction_id ?? receipt?.transactionId ?? '').trim() || null;
    if(!approved){await env.DB.prepare('UPDATE giving_transactions SET status=?,notes=?,updated_at=? WHERE transaction_id=?').bind('failed',`${code} ${message}`.trim().slice(0,1000),nowIso(),transactionId).run();return json({error:'The gift was not approved. Please try again.'},402);}
    await env.DB.prepare('UPDATE giving_transactions SET status=?,external_reference=?,occurred_at=?,updated_at=? WHERE transaction_id=?').bind('completed',JSON.stringify({transactionId:txn,orderNo:reference.orderNo}),nowIso(),nowIso(),transactionId).run();
    return json({ok:true,paid:true,transactionId:txn});
  } catch(error){return json({error:error instanceof Error?error.message:'Unable to confirm giving.'},500);}
};
