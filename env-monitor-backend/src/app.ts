import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import readingsRoutes from './routes/readings.routes';
import config from './config';
import { logInfo } from './utils/logger';

const app = express();
const { host, port } = config;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/readings', readingsRoutes);

app.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});

app.listen(port, host, () => {
    logInfo(`Server is running at http://${host}:${port}`);
});