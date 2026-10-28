// Admin accounts. The site has no member accounts; the only documents left in
// `users` are the admins, managed through api/admin-settings.js.
import { callAdminSettings } from '../utils/adminApi';
import { getAllUsers as getAllUsersFromDataAccess } from './dataAccess';

export const getAllUsers = getAllUsersFromDataAccess;

// Every admin-account operation below (login, password set/reset, promote,
// demote, activate/deactivate) used to read/write isAdmin/password/
// adminUsername directly on the `users` doc via the client SDK. firestore.rules
// now denies client writes to those specific fields (see the comment on
// /users/{userId} in firestore.rules) — allow write: if true there used to
// mean any site visitor could open devtools and run
// updateDoc(doc(db,'users','<their own id>'), { isAdmin: true }) to grant
// themselves full admin-panel access with no password, and allow read: if
// true let anyone pull every admin's bcrypt hash for offline brute-forcing
// (this file used to bcrypt.compare in the browser). Every function here is
// now a thin wrapper around api/admin-settings.js's admin-account actions,
// which do the same work server-side via the Admin SDK.

export const authenticateAdmin = async (username, password) => {
  return callAdminSettings('admin-login', { username, password });
};

export const setAdminPassword = async (adminId, newPassword) => {
  await callAdminSettings('admin-set-password', { adminId, newPassword });
  return true;
};

export const getAllAdmins = async () => {
  const { admins } = await callAdminSettings('admin-list');
  return admins;
};

export const setAdminActive = async (adminId, isActive) => {
  await callAdminSettings('admin-set-active', { adminId, isActive });
  return true;
};

export const makeUserAdmin = async (userId, username, password) => {
  await callAdminSettings('admin-make-admin', { userId, username, password });
  return true;
};

export const removeAdmin = async (userId) => {
  await callAdminSettings('admin-remove-admin', { adminId: userId });
  return true;
};
