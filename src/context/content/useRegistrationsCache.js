import { useCallback, useState } from 'react';
import { collection, addDoc, deleteDoc, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  fetchRegistrations as fetchRegistrationsFromDataAccess,
  invalidateCache,
} from '../../firebase/dataAccess';
import { logError } from '../../utils/logger';

const REGISTRATIONS_COLLECTION = 'registrations';

/**
 * Local cache of registration documents plus CRUD helpers. Loaded on-demand
 * (not on first paint) so anonymous visitors never pay the read cost.
 */
export function useRegistrationsCache() {
  const [registrationsCache, setRegistrationsCache] = useState([]);

  const refreshRegistrations = useCallback(async () => {
    try {
      const registrations = await fetchRegistrationsFromDataAccess(true);
      setRegistrationsCache(registrations);
      return true;
    } catch (error) {
      logError('Content.fetchRegistrations', error);
      return false;
    }
  }, []);

  const saveRegistration = useCallback(async (registration) => {
    const registrationsRef = collection(db, REGISTRATIONS_COLLECTION);
    await addDoc(registrationsRef, {
      ...registration,
      submittedAt: Timestamp.now(),
    });
    await invalidateCache('registrations');
    await refreshRegistrations();
  }, [refreshRegistrations]);

  const clearRegistrations = useCallback(async () => {
    const registrationsRef = collection(db, REGISTRATIONS_COLLECTION);
    const querySnapshot = await getDocs(registrationsRef);
    const deletePromises = querySnapshot.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    await invalidateCache('registrations');
    setRegistrationsCache([]);
  }, []);

  const getRegistrations = useCallback(() => registrationsCache, [registrationsCache]);

  return {
    registrationsCache,
    getRegistrations,
    refreshRegistrations,
    saveRegistration,
    clearRegistrations,
  };
}
