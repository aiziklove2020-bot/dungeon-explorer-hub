/**
 * All advertiser account operations (register, login, admin management) go
 * through api/advertiser-auth.js now — firestore.rules denies direct client
 * access to the `advertisers` collection (it holds a bcrypt password hash;
 * see that API file's header comment for why the old open rule was unsafe).
 */
import { adminAuthHeader } from '../utils/adminApi';

const callAdvertiserAuth = async (action, payload = {}, { admin = false } = {}) => {
  const res = await fetch(`/api/advertiser-auth?action=${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(admin ? adminAuthHeader() : {})
    },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `advertiser-auth ${action} failed (HTTP ${res.status})`);
  }
  return data;
};

/** Public signup: creates a pending advertiser account awaiting admin approval. */
export const registerAdvertiser = async ({ businessName, contactName, phoneNumber, password }) => {
  const { advertiser } = await callAdvertiserAuth('register', { businessName, contactName, phoneNumber, password });
  return advertiser;
};

/** Login: only succeeds for accounts an admin has approved. */
export const authenticateAdvertiser = async (phoneNumber, password) => {
  return callAdvertiserAuth('login', { phoneNumber, password });
};

/** Admin-side: list every advertiser signup regardless of status. */
export const getAllAdvertisers = async () => {
  const { advertisers } = await callAdvertiserAuth('list', {}, { admin: true });
  return advertisers;
};

/** Admin-side: approve / reject / reset an advertiser's status. */
export const setAdvertiserStatus = async (advertiserId, status) => {
  await callAdvertiserAuth('set-status', { advertiserId, status }, { admin: true });
};

/** Admin-side: set a new password for an advertiser (e.g. they forgot it). */
export const resetAdvertiserPassword = async (advertiserId, newPlainPassword) => {
  await callAdvertiserAuth('reset-password', { advertiserId, newPassword: newPlainPassword }, { admin: true });
};

/** Admin-side: permanently delete an advertiser account. */
export const deleteAdvertiser = async (advertiserId) => {
  await callAdvertiserAuth('delete', { advertiserId }, { admin: true });
};
