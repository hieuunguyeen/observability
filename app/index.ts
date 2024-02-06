import express, { Express } from 'express';
import { getLogger } from './instrumentations';
import { SeverityNumber } from '@opentelemetry/api-logs';

const PORT: number = parseInt(process.env.PORT || '8080');
const app: Express = express();

const APP = 'demo_app_log_instrumentation';

function getRandomNumber(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
}

app.get('/roll', (req, res) => {
    const roll = getRandomNumber(1, 100).toString();
    // getLogger().info(`Sending back: ${roll}`);
    getLogger(APP).emit({
        severityNumber: SeverityNumber.INFO,
        timestamp: Date.now(),
        body: `Sending back: ${roll}`,
        attributes: {
            roll,
        },
    });
    res.send(roll);
});

app.listen(PORT, () => {
    // getLogger().info(`Listening for requests on http://localhost:${PORT}`);
    getLogger(APP).emit({
        severityNumber: SeverityNumber.INFO,
        timestamp: Date.now(),
        body: `Listening for requests on http://localhost:${PORT}`,
        attributes: {
            listening: 'port',
        },
    });
});
