import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json } from '../../../lib/server';
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const {groupId} = await request.json().catch(()=>({})) as {groupId?:string};
  if(!groupId || !/^group_[0-9a-f-]{36}$/.test(groupId)) return json({error:'Invalid group checkout.'},400);
  const group = await env.DB.prepare('SELECT g.*,c.title AS class_title FROM registration_groups g JOIN classes c ON c.id=g.class_id WHERE g.id=?').bind(groupId).first<any>();
  if(!group)return json({error:'This checkout was not found.'},404);
  if(group.status==='paid')return json({ok:true,alreadyPaid:true});
  if(group.total_amount_cents<=0)return json({error:'This group does not require online payment.'},400);
  const storeId=String(env.MONERIS_STORE_ID||''),apiToken=String(env.MONERIS_API_TOKEN||''),checkoutId=String(env.MONERIS_CHECKOUT_ID||'');
  const environment=String(env.MONERIS_ENV||'qa').toLowerCase()==='production'||String(env.MONERIS_ENV||'').toLowerCase()==='prod'?'prod':'qa';
  if(!storeId||!apiToken||!checkoutId)return json({error:'Online payment is temporarily unavailable.'},503);
  const orderNo='HTHG'+Date.now()+crypto.randomUUID().slice(0,8);
  const url=environment==='prod'?'https://gateway.moneris.com/chktv2/request/request.php':'https://gatewayt.moneris.com/chktv2/request/request.php';
  try {
    const response=await fetch(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({store_id:storeId,api_token:apiToken,checkout_id:checkoutId,txn_total:(group.total_amount_cents/100).toFixed(2),environment,action:'preload',order_no:orderNo,cust_id:groupId})});
    const data=await response.json() as any;const ticket=String(data?.ticket??data?.response?.ticket??'');
    if(!response.ok||!ticket)return json({error:'Could not start Moneris checkout.'},502);
    await env.DB.prepare("UPDATE registration_groups SET payment_order_no=?,payment_ticket=?,payment_error=NULL WHERE id=? AND status='pending'").bind(orderNo,ticket,groupId).run();
    return json({ok:true,ticket,environment,amount:(group.total_amount_cents/100).toFixed(2),originalAmount:(group.original_amount_cents/100).toFixed(2),classTitle:group.class_title});
  }catch(err){console.error('Group Moneris preload failed',err);return json({error:'Unable to start payment.'},502)}
};
