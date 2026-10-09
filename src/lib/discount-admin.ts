import { env } from 'cloudflare:workers';

const COOKIE = 'hth_discount_session';
const TTL_MS = 4 * 60 * 60 * 1000;

function to64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function from64(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const decoded = atob(padded + '='.repeat((4 - padded.length % 4) % 4));
  return Uint8Array.from(decoded, ch => ch.charCodeAt(0));
}
async function hmac(value: string): Promise<string> {
  const secret = String(env.ADMIN_SESSION_SECRET ?? '');
  if (!secret) throw new Error('Admin session secret unavailable.');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return to64(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))));
}
async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}
export async function checkDiscountPassword(candidate: string): Promise<boolean> {
  const expected = String((env as any).DISCOUNT_ADMIN_PASSWORD ?? '');
  if (!expected) return false;
  const [a, b] = await Promise.all([sha256(candidate), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
export async function discountSessionCookie(): Promise<string> {
  const payload = to64(new TextEncoder().encode(JSON.stringify({ role: 'discounts', exp: Date.now() + TTL_MS })));
  const signature = await hmac(payload);
  return COOKIE + '=' + payload + '.' + signature + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=14400';
}
export async function isDiscountAdmin(request: Request): Promise<boolean> {
  const cookie = request.headers.get('cookie')?.split(';').map(c => c.trim()).find(c => c.startsWith(COOKIE + '='));
  if (!cookie) return false;
  const [value, signature] = cookie.substring(COOKIE.length + 1).split('.');
  if (!value || !signature) return false;
  try {
    const expected = await hmac(value);
    if (signature.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= signature.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff !== 0) return false;
    const payload = JSON.parse(new TextDecoder().decode(from64(value)));
    return payload.role === 'discounts' && Number.isFinite(payload.exp) && payload.exp > Date.now();
  } catch {
    return false;
  }
}
export function clearDiscountCookie() {
  return COOKIE + '=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}
