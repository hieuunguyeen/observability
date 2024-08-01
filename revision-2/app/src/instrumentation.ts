import { createBasicResourceLabels, getOtelSemantics, NodeInstrumentation } from './otel';

let instrumentation: NodeInstrumentation | undefined;

const TELEMETRY_FLUSH_INTERVAL = 5 * 1000;

if (!instrumentation) {
  instrumentation = new NodeInstrumentation({
    logsUrl: process.env.OTEL_LOGS_URL as string,
    logsHeaders: {
      authorization: `Basic ${Buffer.from(
        `${process.env.OTEL_BASIC_AUTH_USERNAME}:${process.env.OTEL_BASIC_AUTH_PASSWORD}`,
      ).toString('base64')}`,
    },
    traceUrl: process.env.OTEL_TRACE_URL as string,
    traceHeaders: {
      authorization: `Basic ${Buffer.from(
        `${process.env.OTEL_BASIC_AUTH_USERNAME}:${process.env.OTEL_BASIC_AUTH_PASSWORD}`,
      ).toString('base64')}`,
    },
    logsBufferConfig: {
      scheduledDelayMillis: TELEMETRY_FLUSH_INTERVAL,
    },
    tracesBufferConfig: {
      scheduledDelayMillis: TELEMETRY_FLUSH_INTERVAL,
    },
    resourceLabels: {
      ...createBasicResourceLabels({
        serviceNamespace: 'demo-app',
        serviceName: 'demo-app-nodejs',
        cloudProvider: getOtelSemantics().CLOUDPROVIDERVALUES_AWS,
        cloudRegion: 'eu-west-1',
        deploymentEnvironment: process.env.STAGE as string,
      }),
      [getOtelSemantics().SEMRESATTRS_CLOUD_PLATFORM]: getOtelSemantics().CLOUDPLATFORMVALUES_AWS_ECS,
    },
  });
}

instrumentation.startInstrumentation({
  traceExpress: true,
  traceHttpConfig: {
    ignoreOutgoingRequestHook: req => {
      if (req.path) {
        return req.path.includes('/otel/v1/traces') || req.path.includes('/otel/v1/logs');
      }
      return false;
    },
  },
});

export async function stopInstrumentation() {
  if (instrumentation) {
    await instrumentation.endInstrumentation();
  }
}
