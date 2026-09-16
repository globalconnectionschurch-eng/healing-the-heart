import type { APIRoute } from 'astro';
import { getConfiguredAdminPassword, hashAdminPassword, isAdminRequest, json, setAdminPasswordHash, verifyAdminPassword } from '../../../lib/server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!(await isAdminRequest(request))) return json({ ok: false, error: 'Unauthorized.' }, 401);

  const data = await request.json().catch(() => ({})) as Record<string, unknown>;
  const currentPassword = String(data.currentPassword ?? '');
  const newPassword = String(data.newPassword ?? '');
  const confirmPassword = String(data.confirmPassword ?? '');

  if (newPassword.length < 12) return json({ ok: false, error: 'New password must be at least 12 characters.' }, 400);
  if (newPassword !== confirmPassword) return json({ ok: false, error: 'New passwords do not match.' }, 400);

  const configured = await getConfiguredAdminPassword();
  let currentValid = false;
  if (configured.overrideHash) {
    currentValid = await verifyAdminPassword(currentPassword, configured.overrideHash);
  } else if (configured.envPassword) {
    currentValid = currentPassword === configured.envPassword;
  }

  if (!currentValid) return json({ ok: false, error: 'Current password is incorrect.' }, 401);

  await setAdminPasswordHash(await hashAdminPassword(newPassword));
  return json({ ok: true, message: 'Admin password changed successfully.' });
};
