import {
    NodeSDK,
    logs as logsSDK,
    metrics,
    resources,
} from '@opentelemetry/sdk-node';
import { logs as logsAPI } from '@opentelemetry/api-logs';

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';

import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
// import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// import winston from 'winston';

// Setup trace and metric exporters via sdk. Logs needs to be done outside of SDK
// because it is not yet supported
export function startOTLPInstrumentation() {
    const loggerProvider = new logsSDK.LoggerProvider({
        resource: new resources.Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: 'james',
        }),
    });

    loggerProvider.addLogRecordProcessor(
        new logsSDK.SimpleLogRecordProcessor(
            new logsSDK.ConsoleLogRecordExporter(),
        ),
    );

    loggerProvider.addLogRecordProcessor(
        new logsSDK.SimpleLogRecordProcessor(
            new OTLPLogExporter({
                url: 'http://otel:4318/v1/logs',
            }),
        ),
    );

    const sdk = new NodeSDK({
        traceExporter: new OTLPTraceExporter({
            url: 'http://otel:4318/v1/traces',
        }),
        metricReader: new metrics.PeriodicExportingMetricReader({
            exporter: new OTLPMetricExporter({
                url: 'http://otel:4318/v1/metrics',
            }),
        }),
        logRecordProcessor: new logsSDK.SimpleLogRecordProcessor(
            new logsSDK.ConsoleLogRecordExporter(),
        ),
        instrumentations: [
            new HttpInstrumentation(),
            new ExpressInstrumentation(),
            // new WinstonInstrumentation(),
        ],
    });

    logsAPI.setGlobalLoggerProvider(loggerProvider);

    sdk.start();

    process.on('SIGTERM', () => {
        sdk.shutdown().then(
            () => console.log('otel sdk shut down successfully'),
            (err) => console.log('Error shutting down otel sdk', err),
        );
        loggerProvider.forceFlush().then(
            () => console.log('otel log provider flushes successfully'),
            (err) => console.log('Error flushing otel log provider', err),
        );
    });
}

export function getLogger(name: string = 'default') {
    return logsAPI.getLogger(name);
}
