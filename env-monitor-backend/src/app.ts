import express, { NextFunction } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import { AuthController } from './controllers/auth.controller';
import readingsRoutes from './routes/readings.routes';
import configRoutes from './routes/config.routes';
import './config/firebase';
import config from './config';
import { logInfo } from './utils/logger';
import usersRoutes from './routes/users.routes';

const app = express();
const { host, port } = config;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// JSON parse error handler: returns a clear 400 when incoming JSON is invalid
app.use((err: any, _req: any, res: any, next: NextFunction) => {
    if (err && err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
    }
    next(err);
});

app.use('/api/auth', authRoutes);
// Compatibility routes used by some test fixtures
const authController = new AuthController();
app.post('/login', authController.loginUser);
app.post('/logout', authController.logoutUser);
app.use('/api/users', usersRoutes);
// Mount readings router so it can receive a deviceId param at the root.
// Example: POST /api/readings/:deviceId  -> handled by readingsRoutes with mergeParams
app.use('/api/readings/:deviceId', readingsRoutes);
app.use('/api/config', configRoutes);

app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

// If this file is run directly, start the server. When imported by tests, don't auto-listen.
if (require.main === module) {
    app.listen(port, host, () => {
        logInfo(`Server is running at http://${host}:${port}`);
    });
}

export default app;