export type ProfileSource = 'signup' | 'script' | 'migration' | 'signup-existing';

export interface UserProfile {
  email: string;
  createdAt: number;
  source: ProfileSource;
  serverId?: number;
  displayName?: string;
}

export interface SensorReading {
  sensorId: string;
  deviceId?: string;
  temperature?: number;
  humidity?: number;
  ts: number;
  meta?: Record<string, any>;
}

export interface ReadingsBucket {
  [key: string]: SensorReading;
}
