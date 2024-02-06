import {
    NodeSDK,
    logs,
    metrics,
    resources,
    api,
} from '@opentelemetry/sdk-node';

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
// import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';

import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// import winston from 'winston';

// Setup trace and metric exporters via sdk. Logs needs to be done outside of SDK
// because it is not yet supported
function startOTLPInstrumentation() {
    const sdk = new NodeSDK({
        traceExporter: new OTLPTraceExporter({
            url: 'http://localhost:4318/v1/traces',
        }),
        metricReader: new PrometheusExporter({
            host: '0.0.0.0',
            port: 9464,
            endpoint: '/metrics',
            appendTimestamp: true,
        }),
        logRecordProcessor: new logs.SimpleLogRecordProcessor(
            new OTLPLogExporter({
                url: 'http://localhost:4318/v1/logs',
            }),
        ),
        // metricReader: new metrics.PeriodicExportingMetricReader({
        //     exporter: new OTLPMetricExporter({
        //         url: 'http://localhost:4318/v1/metrics',
        //     }),
        // }),
        instrumentations: [
            new ExpressInstrumentation(),
            // new WinstonInstrumentation(),
        ],
    });

    sdk.start();

    process.on('SIGTERM', () => {
        sdk.shutdown().then(
            () => console.log('otel sdk shut down successfully'),
            (err) => console.log('Error shutting down otel sdk', err),
        );
    });
}

export function getLogger(name: string) {
    const logger = new logs.LoggerProvider({
        resource: new resources.Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: 'james',
        }),
    });

    process.on('SIGTERM', () => {
        logger.forceFlush().then(
            () => console.log('otel log provider flushes successfully'),
            (err) => console.log('Error flushing otel log provider', err),
        );
    });

    return logger.getLogger(name);
}

startOTLPInstrumentation();
