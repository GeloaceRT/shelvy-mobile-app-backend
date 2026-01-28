import { Router, Request, Response } from 'express';
import { ReadingsController } from '../controllers/readings.controller';
import firebaseService, { pushAlert } from '../services/firebase.service';
import config from '../config';
// Reading endpoints are public by default for the mobile client to poll

const DEVICE_SECRET = process.env.DEVICE_SECRET;
const CONFIGURED_DEVICE_ID = process.env.DEVICE_ID;

// Use mergeParams so router can be mounted under a device route like /devices/:deviceId/readings
const router = Router({ mergeParams: true });
const readingsController = new ReadingsController();

type BasicReading = { ts: number; temperature: number; humidity: number };

const buildAlertsForReading = (reading: BasicReading, deviceId: string) => {
	const alerts: Array<{ ts: number; title: string; value: string; severity: string; deviceId: string }> = [];
	const ts = Number(reading.ts) || Date.now();
	const tempThreshold = config.alert.threshold.temperature;
	const humidityThreshold = config.alert.threshold.humidity;

	if (reading.humidity < humidityThreshold * 0.5) {
		alerts.push({ ts, title: 'Humidity is critically low.', value: `${reading.humidity}%`, severity: 'error', deviceId });
	} else if (reading.humidity > humidityThreshold) {
		alerts.push({ ts, title: 'Humidity is critically high.', value: `${reading.humidity}%`, severity: 'warning', deviceId });
	}

	if (reading.temperature < tempThreshold * 0.5) {
		alerts.push({ ts, title: 'Temperature is critically low.', value: `${reading.temperature}°C`, severity: 'error', deviceId });
	} else if (reading.temperature > tempThreshold) {
		alerts.push({ ts, title: 'Temperature is critically high.', value: `${reading.temperature}°C`, severity: 'warning', deviceId });
	}

	return alerts;
};

// Ingest a single reading for a device (device-authenticated)
router.post('/', async (req: Request, res: Response) => {
	const { deviceId } = req.params;
	const headerSecret = req.header('x-device-secret');
	if (DEVICE_SECRET && headerSecret !== DEVICE_SECRET) {
		return res.status(403).json({ message: 'Invalid device secret.' });
	}
	if (CONFIGURED_DEVICE_ID && deviceId !== CONFIGURED_DEVICE_ID) {
		return res.status(400).json({ message: 'Unknown deviceId.' });
	}

	const body = req.body;
	try {
		if (Array.isArray(body?.readings)) {
			// batch
			const readings = body.readings as any[];
			if (readings.length === 0) return res.status(400).json({ message: 'Empty readings array.' });
			if (readings.length > 200) return res.status(400).json({ message: 'Too many readings in batch (max 200).' });
			// basic validation
			const parsed = readings.map((r) => ({ ...r, ts: Number(r.ts) }));
			const keys = await firebaseService.pushDeviceReadingsBatch(deviceId, parsed as any);

			// write alerts for each reading in the batch
			for (const r of parsed) {
				const alerts = buildAlertsForReading(r as BasicReading, deviceId);
				for (const alert of alerts) {
					await pushAlert(deviceId, alert as any);
				}
			}
			return res.status(201).json({ created: keys.length });
		}

		const reading = body as any;
		if (!reading || !reading.ts) return res.status(400).json({ message: 'Missing ts in reading.' });
		reading.ts = Number(reading.ts);
		const key = await firebaseService.pushDeviceReading(deviceId, reading as any);

		// write alerts for this reading
		const alerts = buildAlertsForReading(reading as BasicReading, deviceId);
		for (const alert of alerts) {
			await pushAlert(deviceId, alert as any);
		}
		return res.status(201).json({ key });
	} catch (e) {
		console.error('[readings.routes] ingest error', (e as any)?.message ?? e);
		return res.status(500).json({ message: 'Failed to ingest reading.' });
	}
});

// Ingest a batch of readings
router.post('/batch', (req: Request, res: Response) => {
	const { deviceId } = req.params;
	return res.send({ body: { title: 'INGEST readings batch', deviceId, count: Array.isArray(req.body) ? req.body.length : 0 } });
});

// Get readings for a device (public read for monitoring clients)
router.get('/', (req: Request, res: Response) => {
	return readingsController.getReadings(req, res);
});

// Get alerts evaluated from current sensor values for a device AND persist them to RTDB
router.get('/alerts', async (req: Request, res: Response) => {
	const { deviceId } = req.params;
	try {
		// Call without res to get the raw alerts array
		const alerts = (await readingsController.alertCriticalLevels(req)) as any;
		const list = Array.isArray(alerts?.alerts) ? alerts.alerts : Array.isArray(alerts) ? alerts : [];
		if (list.length) {
			const now = Date.now();
			for (const alertTitle of list) {
				const record = {
					ts: now,
					title: alertTitle,
					value: '',
					severity: /critical|high|low/i.test(alertTitle) ? 'warning' : 'info',
					deviceId,
				};
				try {
					await pushAlert(deviceId, record as any);
				} catch (err) {
					console.warn('[readings.routes] failed to persist alert', (err as any)?.message ?? err);
				}
			}
		}
		return res.status(200).json({ alerts: list });
	} catch (e) {
		console.error('[readings.routes] GET alerts failed', (e as any)?.message ?? e);
		return res.status(500).json({ message: 'Failed to evaluate alerts' });
	}
});

// Get stored alerts from RTDB for a device (historical)
router.get('/alerts/history', async (req: Request, res: Response) => {
	const { deviceId } = req.params;
	const limit = Number(req.query.limit ?? 50);
	const from = req.query.from ? Number(new Date(String(req.query.from)).getTime()) : undefined;
	const to = req.query.to ? Number(new Date(String(req.query.to)).getTime()) : undefined;
	try {
		const alerts = await firebaseService.listAlerts(deviceId, limit, from, to);
		return res.status(200).json({ alerts });
	} catch (e) {
		console.error('[readings.routes] GET alerts history failed', (e as any)?.message ?? e);
		return res.status(500).json({ message: 'Failed to fetch alerts history' });
	}
});

// Get latest reading for a device (kept as-is)
router.get('/latest', async (req: Request, res: Response) => {
	const { deviceId } = req.params;
	try {
		const latest = await firebaseService.getLatestReading(deviceId as string);
		if (!latest) return res.status(404).json({ message: 'No reading found' });
		return res.status(200).json({ latest });
	} catch (e) {
		console.error('[readings.routes] GET latest failed', (e as any)?.message ?? e);
		return res.status(500).json({ message: 'Failed to fetch latest reading' });
	}
});

// Get history of readings from RTDB for a device
router.get('/history', async (req: Request, res: Response) => {
	const { deviceId } = req.params;
	const limit = Number(req.query.limit ?? 50);
	const from = req.query.from ? Number(new Date(String(req.query.from)).getTime()) : undefined;
	const to = req.query.to ? Number(new Date(String(req.query.to)).getTime()) : undefined;
	try {
		const readings = await firebaseService.listReadings(deviceId, limit, from, to);
		return res.status(200).json({ readings });
	} catch (e) {
		console.error('[readings.routes] GET history failed', (e as any)?.message ?? e);
		return res.status(500).json({ message: 'Failed to fetch readings history' });
	}
});

export default router;