import { env } from 'cloudflare:workers';

const SESSION_COOKIE = 'hth_admin_session';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

type SessionPayload = { iat: number };

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}

async function verify(value: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return crypto.subtle.verify('HMAC', key, base64UrlToBytes(signature), new TextEncoder().encode(value));
}

export async function createSessionCookie() {
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured.');
  const payload: SessionPayload = { iat: Date.now() };
  const value = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = bytesToBase64Url(await sign(value, secret));
  return `${SESSION_COOKIE}=${value}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`;
}

export async function isAdminRequest(request: Request) {
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const cookie = request.headers.get('cookie')?.split(';').map((v) => v.trim()).find((v) => v.startsWith(`${SESSION_COOKIE}=`));
  if (!cookie) return false;
  const token = cookie.slice(`${SESSION_COOKIE}=`.length);
  const [value, signature] = token.split('.');
  if (!value || !signature) return false;
  try {
    if (!(await verify(value, signature, secret))) return false;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(value))) as SessionPayload;
    return Number.isFinite(payload.iat) && Date.now() - payload.iat < SESSION_TTL_MS;
  } catch {
    return false;
  }
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function hashClassPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256);
  return `${bytesToBase64Url(salt)}.${bytesToBase64Url(new Uint8Array(bits))}`;
}

export async function verifyClassPassword(password: string, stored: string) {
  const [saltValue, hashValue] = stored.split('.');
  if (!saltValue || !hashValue) return false;
  try {
    const salt = base64UrlToBytes(saltValue);
    const expected = base64UrlToBytes(hashValue);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256));
    if (bits.length !== expected.length) return false;
    let difference = 0;
    for (let i = 0; i < bits.length; i++) difference |= bits[i] ^ expected[i];
    return difference === 0;
  } catch {
    return false;
  }
}

export async function createClassAccessCookie(classId: string, passwordHash: string) {
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not configured.');
  const value = bytesToBase64Url(new TextEncoder().encode(`${classId}:${passwordHash}`));
  const signature = bytesToBase64Url(await sign(value, secret));
  return `hth_class_${classId}=${value}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${24 * 60 * 60}`;
}

export async function hasClassAccess(request: Request, classId: string, passwordHash: string) {
  const secret = env.ADMIN_SESSION_SECRET;
  if (!secret || !passwordHash) return false;
  const cookieName = `hth_class_${classId}=`;
  const cookie = request.headers.get('cookie')?.split(';').map((v) => v.trim()).find((v) => v.startsWith(cookieName));
  if (!cookie) return false;
  const token = cookie.slice(cookieName.length);
  const [value, signature] = token.split('.');
  if (!value || !signature) return false;
  try {
    return value === bytesToBase64Url(new TextEncoder().encode(`${classId}:${passwordHash}`)) && await verify(value, signature, secret);
  } catch {
    return false;
  }
}

export function json(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders } });
}

export function nowIso() {
  return new Date().toISOString();
}

export function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}

export function renderEmailHtml(text: string) {
  return text.split(/\n\n+/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
}

export function fillTemplate(template: string, values: Record<string, string | number | undefined>) {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => String(values[key] ?? ''));
}

export async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, error: 'RESEND_API_KEY is not configured.' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.FROM_EMAIL, to: [to], subject, text, html: renderEmailHtml(text) })
  });
  const data = await response.json() as { id?: string; message?: string };
  if (!response.ok) return { sent: false, error: data.message ?? 'Email provider rejected the message.' };
  return { sent: true, messageId: data.id };
}
