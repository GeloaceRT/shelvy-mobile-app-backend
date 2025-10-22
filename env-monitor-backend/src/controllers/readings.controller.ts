import { Request, Response } from 'express';
import config from '../config';
import sensorService, { SensorData, SensorService } from '../services/sensor.service';

export class ReadingsController {
    constructor(private readonly service: SensorService = sensorService) {}

    public getReadings = async (_req: Request, res: Response): Promise<Response> => {
        try {
            const data = await this.service.readSensorData();
            return res.status(200).json(data);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error fetching readings';
            return res.status(500).json({ message });
        }
    };

    public alertCriticalLevels = async (_req: Request, res: Response): Promise<Response> => {
        try {
            const { humidity, temperature } = await this.service.readSensorData();
            const alerts = this.evaluateAlerts({ humidity, temperature, capturedAt: new Date() });
            return res.status(200).json({ alerts });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Error evaluating alerts';
            return res.status(500).json({ message });
        }
    };

    private evaluateAlerts(data: SensorData): string[] {
        const alerts: string[] = [];
        const tempThreshold = config.alert.threshold.temperature;
        const humidityThreshold = config.alert.threshold.humidity;

        if (data.humidity < humidityThreshold * 0.5) {
            alerts.push('Humidity is critically low.');
        } else if (data.humidity > humidityThreshold) {
            alerts.push('Humidity is critically high.');
        }

        if (data.temperature < tempThreshold * 0.5) {
            alerts.push('Temperature is critically low.');
        } else if (data.temperature > tempThreshold) {
            alerts.push('Temperature is critically high.');
        }

        return alerts;
    }
}