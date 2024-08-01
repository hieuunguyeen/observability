import { NodeSDK, logs as sdkLogs, resources, tracing, api } from '@opentelemetry/sdk-node';
import { logs as apiLogs, SeverityNumber } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import {
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_ROUTE,
  SEMRESATTRS_CLOUD_REGION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_NAMESPACE,
} from '@opentelemetry/semantic-conventions';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';

import winston from 'winston';
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base';

function startInstrumentation(
  { route, method }: { route: string; method: string } = {
    route: '/load-test',
    method: 'GET',
  },
) {
  const LOGS_URL = process.env.OTEL_LOG_URL ?? 'http://localhost/otel/v1/logs';
  const TRACE_URL = process.env.OTEL_TRACE_URL ?? 'http://localhost/otel/v1/traces';

  const resource = new resources.Resource({
    [SEMRESATTRS_SERVICE_NAME]: 'otel-demo-app',
    [SEMRESATTRS_SERVICE_NAMESPACE]: 'umob',
    [SEMRESATTRS_CLOUD_REGION]: 'eu-west-1',
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: 'testing',
    [SEMATTRS_HTTP_ROUTE]: route,
    [SEMATTRS_HTTP_METHOD]: method,
  });

  const loggerProvider = new sdkLogs.LoggerProvider({
    resource,
  });

  loggerProvider.addLogRecordProcessor(new sdkLogs.SimpleLogRecordProcessor(new sdkLogs.ConsoleLogRecordExporter()));

  loggerProvider.addLogRecordProcessor(
    new sdkLogs.BatchLogRecordProcessor(
      new OTLPLogExporter({
        url: LOGS_URL,
      }),
    ),
  );

  apiLogs.setGlobalLoggerProvider(loggerProvider);

  const tracerProvider = new tracing.BasicTracerProvider({
    resource,
  });

  api.trace.setGlobalTracerProvider(tracerProvider);

  const sdk = new NodeSDK({
    serviceName: 'demo-app',
    logRecordProcessor: new sdkLogs.SimpleLogRecordProcessor(new sdkLogs.ConsoleLogRecordExporter()),
    traceExporter: new OTLPTraceExporter({
      compression: CompressionAlgorithm.GZIP,
      url: TRACE_URL,
    }),

    instrumentations: [],
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown().then(
      () => console.log('OTEL sdk shut down successfully'),
      err => console.log('Error shutting down OTEL sdk', err),
    );
    loggerProvider.forceFlush().then(
      () => console.log('OTEL log provider flushes successfully'),
      err => console.log('Error flushing OTEL log provider', err),
    );
  });
}

function endInstrumentation() {}

/**
 * Get logger instance
 *
 * @param scope - Scope of the logger. Recomennded to use the file path / module name
 *
 * @returns Winston logger instance
 */
export function getLogger(scope: string = 'default') {
  const customLevels = {
    levels: {
      error: SeverityNumber.ERROR,
      warn: SeverityNumber.WARN,
      info: SeverityNumber.INFO,
      debug: SeverityNumber.DEBUG,
    },
    colors: {
      error: 'red',
      warn: 'yellow',
      info: 'green',
      debug: 'blue',
    },
  };

  winston.addColors(customLevels.colors);
  const logger = winston.createLogger({
    levels: customLevels.levels,
    transports: [new OpenTelemetryTransportV3()],
    format: winston.format.combine(
      winston.format.label({ label: scope, message: true }),
      winston.format.printf(({ level, message }) => {
        return `${level}: ${message}`;
      }),
    ),
  });

  return logger;
}

export function getTracer(scope: string = 'default') {
  return api.trace.getTracer(scope);
}

function doWork(logger: winston.Logger, tracer: api.Tracer, parentSpan: api.Span) {
  // Start another span. In this example, the main method already started a
  // span, so that'll be the parent span, and this will be a child span.
  const ctx = api.trace.setSpan(api.context.active(), parentSpan);
  const span = tracer.startSpan('doWork', undefined, ctx);

  // simulate some random work.
  for (let i = 0; i <= Math.floor(Math.random() * 40000000); i += 1) {
    logger.info(`Load-testing`);
  }

  // Set attributes to the span.
  span.setAttribute('key', 'value');

  // Annotate our span to capture metadata about our operation
  span.addEvent('invoking doWork');

  span.end();
}

function startLoadTest() {
  const logger = getLogger('deploy/Terraform/observability/load-test.js');
  const tracer = getTracer('load-testing');
  const parentSpan = tracer.startSpan('main');

  for (let i = 0; i < 10; i += 1) {
    doWork(logger, tracer, parentSpan);
  }
  // Be sure to end the span.
  parentSpan.end();
}

(() => {
  startInstrumentation();

  try {
    startLoadTest();
  } catch (e) {
    console.log('Error running load test', e);
  } finally {
    endInstrumentation();
  }
})();
