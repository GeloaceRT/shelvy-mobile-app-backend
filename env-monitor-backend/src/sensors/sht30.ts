export type SensorReading = {
    temperature: number;
    humidity: number;
    capturedAt: Date;
};

// Placeholder sensor hooks to enable development without hardware access.
export const initializeSensor = () => {
    return true;
};

export const getHumidityTemperature = async (): Promise<SensorReading> => {
    const now = new Date();
    const humidity = 50 + Math.random() * 10;
    const temperature = 26 + Math.random() * 4;

    return {
        humidity: Number(humidity.toFixed(2)),
        temperature: Number(temperature.toFixed(2)),
        capturedAt: now,
    };
};