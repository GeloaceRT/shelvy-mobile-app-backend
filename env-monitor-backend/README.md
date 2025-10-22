# Environmental Monitoring Backend

This project is a backend application designed to monitor humidity and temperature levels using an SHT30 sensor connected to a Raspberry Pi 5. It supports both mobile and web applications, providing users with real-time data and alerts for critical parameters.

## Features

- **User Authentication**: Users can log in and log out securely.
- **Sensor Data Monitoring**: Fetches and displays humidity and temperature readings from the SHT30 sensor.
- **Alerts**: Notifies users when humidity or temperature levels exceed critical thresholds.

## Project Structure

```
env-monitor-backend
├── src
│   ├── app.ts                  # Entry point of the application
│   ├── config
│   │   └── index.ts            # Configuration settings
│   ├── controllers
│   │   ├── auth.controller.ts   # Authentication logic
│   │   └── readings.controller.ts # Sensor data logic
│   ├── middlewares
│   │   └── auth.middleware.ts    # Authentication middleware
│   ├── routes
│   │   ├── auth.routes.ts        # Authentication routes
│   │   └── readings.routes.ts     # Sensor data routes
│   ├── services
│   │   ├── alert.service.ts       # Alerting logic
│   │   ├── auth.service.ts        # User authentication logic
│   │   └── sensor.service.ts      # Sensor interaction logic
│   ├── sensors
│   │   └── sht30.ts              # SHT30 sensor functions
│   ├── database
│   │   └── prisma.ts             # Database interactions
│   └── utils
│       └── logger.ts             # Logging utilities
├── prisma
│   └── schema.prisma             # Database schema
├── tests
│   ├── auth.spec.ts              # Authentication tests
│   └── readings.spec.ts          # Readings tests
├── package.json                   # NPM configuration
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # Project documentation
```

## Setup Instructions

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd env-monitor-backend
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Configure environment variables**: Create a `.env` file in the root directory and set the necessary environment variables.

4. **Run the application**:
   ```
   npm start
   ```

5. **Access the API**: The application will be available at `http://localhost:3000`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License.