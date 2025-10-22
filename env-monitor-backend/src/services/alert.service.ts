export class AlertService {
    private criticalHumidityThreshold: number;
    private criticalTemperatureThreshold: number;

    constructor() {
        this.criticalHumidityThreshold = 80; // Example threshold for humidity
        this.criticalTemperatureThreshold = 30; // Example threshold for temperature
    }

    public checkAndAlert(humidity: number, temperature: number): void {
        if (humidity > this.criticalHumidityThreshold) {
            this.sendAlert(`Critical humidity level reached: ${humidity}%`);
        }

        if (temperature > this.criticalTemperatureThreshold) {
            this.sendAlert(`Critical temperature level reached: ${temperature}°C`);
        }
    }

    private sendAlert(message: string): void {
        // Logic to send alert to users (e.g., email, SMS, push notification)
        console.log(`Alert: ${message}`);
    }
}