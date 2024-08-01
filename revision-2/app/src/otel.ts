import { Span } from '@opentelemetry/api';
import { logs as apiLogs, SeverityNumber } from '@opentelemetry/api-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ExpressInstrumentation, ExpressRequestInfo } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation, HttpInstrumentationConfig } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation, UndiciInstrumentationConfig } from '@opentelemetry/instrumentation-undici';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import { CompressionAlgorithm } from '@opentelemetry/otlp-exporter-base';
import { api, logs as sdkLogs, resources, tracing } from '@opentelemetry/sdk-node';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import * as otelSemantics from '@opentelemetry/semantic-conventions';
import type { Logger } from 'winston';

export function getOtelSemantics() {
  return otelSemantics;
}

export function createBasicResourceLabels({
  serviceNamespace,
  serviceName,
  cloudProvider,
  cloudRegion,
  deploymentEnvironment,
}: {
  serviceNamespace: string;
  serviceName: string;
  cloudProvider: string;
  cloudRegion: string;
  deploymentEnvironment: string;
}): Record<string, string> {
  return {
    [otelSemantics.SEMRESATTRS_SERVICE_NAMESPACE]: serviceNamespace,
    [otelSemantics.SEMRESATTRS_SERVICE_NAME]: serviceName,
    [otelSemantics.SEMRESATTRS_CLOUD_PROVIDER]: cloudProvider,
    [otelSemantics.SEMRESATTRS_CLOUD_REGION]: cloudRegion,
    [otelSemantics.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: deploymentEnvironment,
  };
}

/**
 * Get logger instance
 *
 * @param scope - Scope of the logger. Recomennded to use the file path / module name
 *
 * @returns Winston logger instance
 */
export function getLogger(scope: string = 'default'): Logger {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const winston = require('winston');

  const logger = winston.createLogger({
    transports: [
      new winston.transports.Console({
        level: process.env.DEBUG === 'true' ? 'debug' : 'info',
      }),
    ],
    format: winston.format.combine(
      winston.format.label({ label: scope }),
      winston.format.metadata(),
      winston.format.json(),
    ),
  });

  return logger as Logger;
}

/**
 * @example LINEAR SPAN TRACING
 * 
 * const tracer = getTracer();
  const parentSpan = tracer.startSpan('parent');
  parentSpan.setAttribute('key', 'value');
  parentSpan.addEvent('invoking doWork');

  // span, so that'll be the parent span, and this will be a child span.
  const childSpan = tracer.startSpan('child');

  childSpan.setAttribute('key', 'value');
  childSpan.addEvent('invoking doWork');

  childSpan.end();
  parentSpan.end();

  @example ACTIVE SPAN TRACING

  const tracer = getTracer();
  const parentSpan = tracer.startActiveSpan('parent', (span) => {
    span.setAttribute('key', 'value');
    span.addEvent('invoking doWork');
    span.startActiveSpan('child', (childSpan) => {
      childSpan.setAttribute('key', 'value');
      childSpan.addEvent('invoking doWork');
      childSpan.end();
    });
    span.end();
  });
 */
export function getTracer(scope: string = 'default') {
  return api.trace.getTracer(scope);
}

export class NodeInstrumentation {
  readonly logsUrl: string;
  readonly traceUrl: string;
  private loggerProvider: sdkLogs.LoggerProvider;
  private tracerProvider: tracing.BasicTracerProvider;
  resource: resources.Resource;

  /**
   * @param inputs
   * @param inputs.logsUrl - URL to send logs to
   * @param inputs.logsHeaders - Headers to send with logs
   * @param inputs.logsBufferConfig - Buffer configuration for logs
   * @param inputs.traceUrl - URL to send traces to
   * @param inputs.traceHeaders - Headers to send with traces
   * @param inputs.tracesBufferConfig - Buffer configuration for traces
   * @param inputs.resourceLabels - Resource labels to attach to the instrumentation. The key should be
   * one of the semantic conventions received from `getOtelSemantics()`
   */
  constructor({
    logsUrl,
    logsHeaders,
    logsBufferConfig,
    traceUrl,
    traceHeaders,
    tracesBufferConfig,
    resourceLabels,
  }: {
    logsUrl: string;
    logsHeaders: Partial<Record<string, unknown>> | undefined;
    logsBufferConfig: sdkLogs.BufferConfig;
    traceUrl: string;
    traceHeaders: Partial<Record<string, unknown>> | undefined;
    tracesBufferConfig: sdkLogs.BufferConfig;
    resourceLabels: Record<string, string>;
  }) {
    this.logsUrl = logsUrl;
    this.traceUrl = traceUrl;

    this.resource = new resources.Resource(resourceLabels);

    this.loggerProvider = new sdkLogs.LoggerProvider({
      resource: this.resource,
    });

    this.loggerProvider.addLogRecordProcessor(
      new sdkLogs.BatchLogRecordProcessor(
        new OTLPLogExporter({
          url: logsUrl,
          headers: logsHeaders,
        }),
        {
          exportTimeoutMillis: 30000, // default
          maxExportBatchSize: 512, // default
          maxQueueSize: 2048, // default
          scheduledDelayMillis: 5000, // default
          ...logsBufferConfig,
        },
      ),
    );

    this.tracerProvider = new NodeTracerProvider({
      resource: this.resource,
    });

    this.tracerProvider.addSpanProcessor(
      new tracing.BatchSpanProcessor(
        new OTLPTraceExporter({
          compression: CompressionAlgorithm.GZIP,
          url: traceUrl,
          headers: traceHeaders,
        }),
        {
          exportTimeoutMillis: 30000, // default
          maxExportBatchSize: 512, // default
          maxQueueSize: 2048, // default
          scheduledDelayMillis: 5000, // default
          ...tracesBufferConfig,
        },
      ),
    );
  }

  /**
   *
   * @param inputs
   * @param inputs.traceExpress - Enable express instrumentation
   * @param inputs.traceExpressRequestHook - Hook to run on express request
   * @param inputs.traceHttpConfig - HTTP instrumentation configuration
   */
  startInstrumentation({
    traceExpress,
    traceExpressRequestHook,
    traceFetchConfig,
    traceHttpConfig,
  }: {
    traceExpress?: boolean;
    traceExpressRequestHook?: (span: Span, info: ExpressRequestInfo) => void;
    traceFetchConfig?: UndiciInstrumentationConfig;
    traceHttpConfig?: HttpInstrumentationConfig;
  }) {
    this.tracerProvider.register();
    apiLogs.setGlobalLoggerProvider(this.loggerProvider);
    api.trace.setGlobalTracerProvider(this.tracerProvider);

    const baseInstrumentations = [
      new WinstonInstrumentation({
        logSeverity: SeverityNumber.INFO,
      }),
      // Undici is the http module that fetch() uses under the hood
      new UndiciInstrumentation(traceFetchConfig),
      // Express instrumentation expects HTTP layer to be instrumented
      new HttpInstrumentation(traceHttpConfig),
    ];

    registerInstrumentations({
      instrumentations: traceExpress
        ? [
            ...baseInstrumentations,
            new ExpressInstrumentation({
              requestHook: (span: Span, info: ExpressRequestInfo) => {
                if (traceExpressRequestHook) traceExpressRequestHook(span, info);
              },
            }),
          ]
        : baseInstrumentations,
    });
  }

  async endInstrumentation() {
    try {
      await this.loggerProvider.forceFlush();
      console.log('OTEL log provider flushes successfully');
    } catch (err) {
      console.log('Error flushing OTEL log provider', err);
    }
    try {
      await this.tracerProvider.forceFlush();
      console.log('OTEL traces provider flushes successfully');
    } catch (err) {
      console.log('Error flushing OTEL traces provider', err);
    }
    apiLogs.disable();
    api.trace.disable();
    this.tracerProvider.shutdown();
    this.loggerProvider.shutdown();
  }
}
