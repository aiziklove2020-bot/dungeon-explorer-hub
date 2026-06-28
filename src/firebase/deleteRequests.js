import { collection, addDoc } from 'firebase/firestore';
import { db } from './config';

const DELETE_REQUESTS_COLLECTION = 'deleteRequests';

/**
 * Submit a request to delete account (phone number) from the system.
 * Request is stored for admin processing; no actual deletion is performed here.
 * @param {string} phoneNumber - 10 digits, must start with 05
 * @returns {{ success: boolean, requestId?: string, error?: string }}
 */
export const submitDeleteRequest = async (phoneNumber) => {
  const cleaned = (phoneNumber || '').replace(/\D/g, '');
  if (cleaned.length !== 10 || !cleaned.startsWith('05')) {
    return { success: false, error: 'invalid_phone' };
  }
  try {
    const ref = collection(db, DELETE_REQUESTS_COLLECTION);
    const docRef = await addDoc(ref, {
      phoneNumber: cleaned,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    return { success: true, requestId: docRef.id };
  } catch (err) {
    return { success: false, error: err?.message || 'request_failed' };
  }
};
