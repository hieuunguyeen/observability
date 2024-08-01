import { NodeSDK, logs as logsSDK, metrics, resources } from '@opentelemetry/sdk-node';
import { logs as logsAPI } from '@opentelemetry/api-logs';

import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';

import { ExpressInstrumentation, ExpressLayerType, ExpressRequestInfo } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Setup trace and metric exporters via sdk. Logs needs to be done outside of SDK
// because it is not yet supported
function startOTLPInstrumentation() {
  const loggerProvider = new logsSDK.LoggerProvider({
    resource: new resources.Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'james',
    }),
  });

  loggerProvider.addLogRecordProcessor(new logsSDK.SimpleLogRecordProcessor(new logsSDK.ConsoleLogRecordExporter()));

  loggerProvider.addLogRecordProcessor(
    new logsSDK.SimpleLogRecordProcessor(
      new OTLPLogExporter({
        url: 'http://otel:4318/v1/logs',
      }),
    ),
  );

  logsAPI.setGlobalLoggerProvider(loggerProvider);

  const sdk = new NodeSDK({
    serviceName: 'demo-app',
    traceExporter: new OTLPTraceExporter({
      url: 'http://otel:4318/v1/traces',
    }),
    metricReader: new metrics.PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: 'http://otel:4318/v1/metrics',
      }),
    }),
    logRecordProcessor: new logsSDK.SimpleLogRecordProcessor(new logsSDK.ConsoleLogRecordExporter()),
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation({
        requestHook: (span, info: ExpressRequestInfo) => {
          if (info.layerType === ExpressLayerType.REQUEST_HANDLER) {
            span.setAttributes({
              'http.route': info.route,
              'http.method': info.request.method,
              'express.base_url': info.request.baseUrl,
            });
          }
        },
      }),
    ],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown().then(
      () => console.log('otel sdk shut down successfully'),
      err => console.log('Error shutting down otel sdk', err),
    );
    loggerProvider.forceFlush().then(
      () => console.log('otel log provider flushes successfully'),
      err => console.log('Error flushing otel log provider', err),
    );
  });
}

export function getLogger(name: string = 'default') {
  return logsAPI.getLogger(name);
}

/**
 * Instrumentations need to be done before it is require / imported into the instrumented module
 *
 * https://github.com/open-telemetry/opentelemetry-js/tree/main/experimental/packages/opentelemetry-instrumentation#instrumentation-for-es-modules-in-nodejs-experimental
 */
startOTLPInstrumentation();
