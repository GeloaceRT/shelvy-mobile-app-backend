import { getHumidityTemperature, SensorReading } from '../sensors/sht30';

export type SensorData = {
    humidity: number;
    temperature: number;
    capturedAt: Date;
};

export class SensorService {
    async readSensorData(): Promise<SensorData> {
        const reading = await getHumidityTemperature();
        return this.processSensorData(reading);
    }

    processSensorData(data: SensorReading): SensorData {
        const { humidity, temperature, capturedAt } = data;
        return { humidity, temperature, capturedAt };
    }
}

const sensorService = new SensorService();

export default sensorService;