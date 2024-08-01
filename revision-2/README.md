# Revision 2

## Components

- nginx - reverse proxy, authentication
- Grafana - dashboard
- otel - (Open) telemetry collectors
- tempo - trace export receiver
- loki - log export receiver
- app - instrumentation sample

## Deployment

- Nginx - port 80
- Grafana - port 3000 (unexposed. Registered as nginx upstream)
- Loki - port 3100 (unexposed. Registered as nginx upstream)
- Tempo - port 3200 (unexposed. Registered as nginx upstream)

Only endpoints to grafana and otel are exposed. loki and tempo can only be accessed through grafana or otel
/_ for grafana
/otel/_ for otel

## Grafana

Deployed into root / path

## Otel

Receives json protobuf format on http protocol
http://0.0.0.0/otel/v1/logs endpoint for receiving logs
http://0.0.0.0/otel/v1/traces endpoint for receiving traces
Will then re-exports logs to Loki on http://loki:3100/otlp
And re-exports traces to Tempo on http://tempo:4317

### Otel Authentication

Otel is behind basic authentication.
