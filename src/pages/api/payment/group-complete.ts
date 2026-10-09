import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { json, nowIso } from '../../../lib/server';
export const prerender = false;

export const POST: APIRoute = async ({request})=>{
  const {groupId,ticket}=await request.json().catch(()=>({})) as {groupId?:string;ticket?:string};
  if(!groupId||!ticket)return json({error:'Payment information is incomplete.'},400);
  const group=await env.DB.prepare('SELECT * FROM registration_groups WHERE id=?').bind(groupId).first<any>();
  if(!group)return json({error:'Group checkout not found.'},404);
  if(group.status==='paid')return json({ok:true,paid:true});
  if(group.payment_ticket!==ticket)return json({error:'Payment session does not match.'},409);
  const storeId=String(env.MONERIS_STORE_ID||''),apiToken=String(env.MONERIS_API_TOKEN||''),checkoutId=String(env.MONERIS_CHECKOUT_ID||'');
  const environment=String(env.MONERIS_ENV||'qa').toLowerCase()==='production'||String(env.MONERIS_ENV||'').toLowerCase()==='prod'?'prod':'qa';
  if(!storeId||!apiToken||!checkoutId)return json({error:'Online payment is temporarily unavailable.'},503);
  const endpoint=environment==='prod'?'https://gateway.moneris.com/chktv2/request/request.php':'https://gatewayt.moneris.com/chktv2/request/request.php';
  try {
    const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({store_id:storeId,api_token:apiToken,checkout_id:checkoutId,ticket,environment,action:'receipt'})});
    const data=await response.json() as any;
    const receipt=data?.receipt??data?.response??data;
    const code=String(receipt?.response_code??receipt?.responseCode??receipt?.ResponseCode??'');
    const message=String(receipt?.message??receipt?.Message??'');
    const approved=response.ok&&(code==='001'||/approved/i.test(message));
    if(!approved){
      await env.DB.prepare("UPDATE registration_groups SET payment_error=? WHERE id=?").bind((code+' '+message).slice(0,800),groupId).run();
      return json({error:'Moneris has not approved this payment.'},402);
    }
    const transactionId=String(receipt?.txn_number??receipt?.txnNumber??receipt?.transaction_id??receipt?.transactionId??'')||null;
    const now=nowIso();
    // D1 batch makes the group and its two personal registrations atomic.
    const statements=[
      env.DB.prepare("UPDATE registration_groups SET status='paid',payment_transaction_id=?,paid_at=?,payment_error=NULL WHERE id=? AND status='pending'").bind(transactionId,now,groupId),
      env.DB.prepare("UPDATE registrations SET payment_status='paid',status='registered',payment_transaction_id=?,paid_at=?,payment_error=NULL WHERE group_id=? AND payment_status!='paid'").bind(transactionId,now,groupId)
    ];
    if(group.discount_id){
      const rule=await env.DB.prepare('SELECT second_percent_off FROM group_discount_rules WHERE discount_id=?').bind(group.discount_id).first<any>();
      const uses=rule?1:2;
      statements.push(env.DB.prepare('UPDATE discounts SET used_count=used_count+?,updated_at=? WHERE id=? AND (max_uses IS NULL OR used_count+?<=max_uses)').bind(uses,now,group.discount_id,uses));
    }
    await env.DB.batch(statements);
    return json({ok:true,paid:true,transactionId});
  }catch(err){console.error('Group payment completion failed',err);return json({error:'Could not verify payment. Contact us before paying again.'},500)}
};
