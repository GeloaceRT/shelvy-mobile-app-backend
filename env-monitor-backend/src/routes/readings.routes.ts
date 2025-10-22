import { Router } from 'express';
import { ReadingsController } from '../controllers/readings.controller';
import { verifyToken } from '../middlewares/auth.middleware';

const router = Router();
const readingsController = new ReadingsController();

router.get('/', verifyToken, readingsController.getReadings);
router.get('/alerts', verifyToken, readingsController.alertCriticalLevels);

export default router;