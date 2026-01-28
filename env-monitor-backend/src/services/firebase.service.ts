import { realtimeDb, firebaseAdmin, isFirebaseInitialized } from '../config/firebase';
import { UserProfile, SensorReading } from '../models/firebaseSchema';

const usersPath = (uid: string) => `users/${uid}`;
const readingsPath = (deviceId: string) => `readings/${deviceId}`;
const alertsPath = (deviceId: string) => `alerts/${deviceId}`;

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
  // legacy single-sensor helper (uses sensorId as deviceId)
  const deviceId = (reading as any).deviceId ?? reading.sensorId ?? 'unknown';
  const node = realtimeDb!.ref(readingsPath(deviceId)).push();
  const date = new Date(Number(reading.ts) || Date.now()).toISOString().slice(0, 10).replace(/-/g, '/');
  const payload = { ...reading, deviceId, date } as any;
  await node.set(payload);
  return node.key as string;
}

export async function pushDeviceReading(deviceId: string, reading: SensorReading): Promise<string> {
  if (!isFirebaseInitialized || !realtimeDb) throw new Error('Firebase not initialized');
  const node = realtimeDb!.ref(readingsPath(deviceId)).push();
  const date = new Date(Number(reading.ts) || Date.now()).toISOString().slice(0, 10).replace(/-/g, '/');
  const payload = { ...reading, deviceId, date } as any;
  await node.set(payload);
  // update summary
  await realtimeDb.ref(`readings-summary/${deviceId}/latest`).set(payload);
  await realtimeDb.ref(`readings-summary/${deviceId}/lastTs`).set(reading.ts);
  return node.key as string;
}

export async function pushDeviceReadingsBatch(deviceId: string, readings: SensorReading[]): Promise<string[]> {
  if (!isFirebaseInitialized || !realtimeDb) throw new Error('Firebase not initialized');
  const updates: Record<string, any> = {};
  readings.forEach((r) => {
    const newKey = realtimeDb!.ref(readingsPath(deviceId)).push().key as string;
    const date = new Date(Number(r.ts) || Date.now()).toISOString().slice(0, 10).replace(/-/g, '/');
    updates[`${readingsPath(deviceId)}/${newKey}`] = { ...r, deviceId, date };
  });
  // find latest reading by ts
  const last = readings.reduce((a, b) => (a.ts >= b.ts ? a : b), readings[0]);
  const lastDate = new Date(Number(last.ts) || Date.now()).toISOString().slice(0, 10).replace(/-/g, '/');
  updates[`readings-summary/${deviceId}/latest`] = { ...last, deviceId, date: lastDate };
  updates[`readings-summary/${deviceId}/lastTs`] = last.ts;
  await realtimeDb!.ref().update(updates);
  return Object.keys(updates)
    .filter((k) => k.startsWith(`${readingsPath(deviceId)}/`))
    .map((k) => k.split('/').pop() as string);
}

export async function listReadings(
  sensorId: string,
  limit = 50,
  fromTs?: number,
  toTs?: number
): Promise<SensorReading[]> {
  if (!isFirebaseInitialized || !realtimeDb) throw new Error('Firebase not initialized');
  let query = realtimeDb!.ref(readingsPath(sensorId)).orderByChild('ts');
  if (typeof fromTs === 'number') query = query.startAt(fromTs);
  if (typeof toTs === 'number') query = query.endAt(toTs);
  if (limit) query = query.limitToLast(limit);
  const snap = await query.once('value');
  const val = snap.val();
  if (!val) return [];
  return Object.keys(val)
    .map((k) => val[k] as SensorReading)
    .sort((a, b) => a.ts - b.ts);
}

export type AlertRecord = {
  ts: number;
  title: string;
  value?: string;
  severity?: 'info' | 'warning' | 'error' | string;
  deviceId?: string;
  date?: string;
};

export async function pushAlert(deviceId: string, alert: AlertRecord): Promise<string> {
  if (!isFirebaseInitialized || !realtimeDb) throw new Error('Firebase not initialized');
  const node = realtimeDb.ref(alertsPath(deviceId)).push();
  const date = new Date(Number(alert.ts) || Date.now()).toISOString().slice(0, 10).replace(/-/g, '/');
  const payload = { ...alert, deviceId, date } as any;
  await node.set(payload);
  return node.key as string;
}

export async function listAlerts(
  deviceId: string,
  limit = 50,
  fromTs?: number,
  toTs?: number
): Promise<AlertRecord[]> {
  if (!isFirebaseInitialized || !realtimeDb) throw new Error('Firebase not initialized');
  let query = realtimeDb.ref(alertsPath(deviceId)).orderByChild('ts');
  if (typeof fromTs === 'number') query = query.startAt(fromTs);
  if (typeof toTs === 'number') query = query.endAt(toTs);
  if (limit) query = query.limitToLast(limit);
  const snap = await query.once('value');
  const val = snap.val();
  if (!val) return [];
  return Object.keys(val)
    .map((k) => val[k] as AlertRecord)
    .sort((a, b) => a.ts - b.ts);
}

export async function getLatestReading(deviceId: string): Promise<SensorReading | null> {
  if (!isFirebaseInitialized || !realtimeDb) throw new Error('Firebase not initialized');
  // read the summary node which is maintained on ingest
  const snap = await realtimeDb!.ref(`readings-summary/${deviceId}/latest`).once('value');
  return snap.exists() ? (snap.val() as SensorReading) : null;
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
  pushDeviceReading,
  pushDeviceReadingsBatch,
  listReadings,
  getLatestReading,
  pushAlert,
  listAlerts,
  createFirebaseAccount,
};
