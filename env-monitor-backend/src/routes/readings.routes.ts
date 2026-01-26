import { Router, Request, Response } from 'express';
import { ReadingsController } from '../controllers/readings.controller';
import firebaseService from '../services/firebase.service';
// Reading endpoints are public by default for the mobile client to poll

const DEVICE_SECRET = process.env.DEVICE_SECRET;
const CONFIGURED_DEVICE_ID = process.env.DEVICE_ID;

// Use mergeParams so router can be mounted under a device route like /devices/:deviceId/readings
const router = Router({ mergeParams: true });
const readingsController = new ReadingsController();

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
			return res.status(201).json({ created: keys.length });
		}

		const reading = body as any;
		if (!reading || !reading.ts) return res.status(400).json({ message: 'Missing ts in reading.' });
		reading.ts = Number(reading.ts);
		const key = await firebaseService.pushDeviceReading(deviceId, reading as any);
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

// Get alerts evaluated from current sensor values for a device
router.get('/alerts', (req: Request, res: Response) => {
	return readingsController.alertCriticalLevels(req, res as any);
});

// Get latest reading for a device (kept as-is)
router.get('/latest', (req: Request, res: Response) => {
	const { deviceId } = req.params;
	return res.send({ body: { title: 'GET latest reading', deviceId } });
});

export default router;