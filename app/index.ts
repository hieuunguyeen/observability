import express, { Express } from 'express';
import { getLogger, startOTLPInstrumentation } from './instrumentations';
import { SeverityNumber } from '@opentelemetry/api-logs';

import prometheusMetricBundle from 'express-prom-bundle';

const PORT: number = parseInt('8080');

const APP = 'demo_app_log_instrumentation';

function getRandomNumber(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
}

function startServer() {
    try {
        startOTLPInstrumentation();
    } catch (e) {
        console.error(e);
    }

    const app: Express = express();

    const metricsMiddleware = prometheusMetricBundle({
        includeMethod: true,
        includeStatusCode: true,
        includePath: true,
    });

    // Will expose metrics on "/metrics"
    app.use(metricsMiddleware);

    app.get('/roll', (req, res) => {
        const roll = getRandomNumber(1, 100).toString();
        // getLogger().info(`Sending back: ${roll}`);
        getLogger(APP).emit({
            severityNumber: SeverityNumber.INFO,
            timestamp: Date.now(),
            body: `Sending back: ${roll}`,
            attributes: {
                path: '/roll',
                roll,
            },
        });
        res.send(roll);
    });

    app.listen(PORT, () => {
        // getLogger().info(`Listening for requests on http://demoapp:${PORT}`);
        getLogger(APP).emit({
            severityNumber: SeverityNumber.INFO,
            timestamp: Date.now(),
            body: `Listening for requests on http://demoapp:${PORT}`,
            attributes: {},
        });
    });
}

try {
    startServer();
} catch (e) {
    console.error(e);
}
