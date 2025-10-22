import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.HOST?.trim() || '0.0.0.0',
  port: Number(process.env.PORT) || 3000,
  db: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret',
    tokenExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  sensor: {
    i2cAddress: Number(process.env.SENSOR_I2C_ADDRESS) || 0x44,
  },
  alert: {
    threshold: {
      temperature: Number(process.env.ALERT_TEMP_THRESHOLD) || 30,
      humidity: Number(process.env.ALERT_HUMIDITY_THRESHOLD) || 70,
    },
  },
};

export default config;