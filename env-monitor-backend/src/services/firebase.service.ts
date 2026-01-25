import { realtimeDb, firebaseAdmin, isFirebaseInitialized } from '../config/firebase';
import { UserProfile, SensorReading } from '../models/firebaseSchema';

const usersPath = (uid: string) => `users/${uid}`;
const readingsPath = (sensorId: string) => `readings/${sensorId}`;

export async function writeUserProfile(uid: string, profile: UserProfile): Promise<void> {
  if (!isFirebaseInitialized || !realtimeDb) throw new Error('Firebase not initialized');
  await realtimeDb.ref(usersPath(uid)).set(profile);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!isFirebaseInitialized || !realtimeDb) throw new Error('Firebase not initialized');
  const snap = await realtimeDb.ref(usersPath(uid)).once('value');
  return snap.exists() ? (snap.val() as UserProfile) : null;
}

export async function pushReading(reading: SensorReading): Promise<string> {
  if (!isFirebaseInitialized || !realtimeDb) throw new Error('Firebase not initialized');
  const node = realtimeDb.ref(readingsPath(reading.sensorId)).push();
  await node.set(reading);
  return node.key as string;
}

export async function listReadings(sensorId: string, limit = 50): Promise<SensorReading[]> {
  if (!isFirebaseInitialized || !realtimeDb) throw new Error('Firebase not initialized');
  const snap = await realtimeDb.ref(readingsPath(sensorId)).orderByChild('ts').limitToLast(limit).once('value');
  const val = snap.val();
  if (!val) return [];
  return Object.keys(val).map((k) => val[k] as SensorReading).sort((a, b) => a.ts - b.ts);
}

export async function createFirebaseAccount(email: string, password: string): Promise<{ uid?: string; token?: string }>{
  if (!isFirebaseInitialized || !firebaseAdmin) throw new Error('Firebase not initialized');
  try {
    const existing = await firebaseAdmin.auth().getUserByEmail(email).catch(() => null);
    if (existing) {
      const token = await firebaseAdmin.auth().createCustomToken(existing.uid);
      return { uid: existing.uid, token };
    }
    const user = await firebaseAdmin.auth().createUser({ email, password });
    const token = await firebaseAdmin.auth().createCustomToken(user.uid);
    return { uid: user.uid, token };
  } catch (e) {
    console.warn('[firebase.service] createFirebaseAccount failed', (e as any)?.message ?? e);
    return {};
  }
}

export default {
  writeUserProfile,
  getUserProfile,
  pushReading,
  listReadings,
  createFirebaseAccount,
};
