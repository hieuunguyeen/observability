# observability

Test setup that implement observability with Opentelemetry

Runs on docker-compose

Glossary

-   otel: Open Telemetry
-   otlp: (O)pen (T)e(L)emetry (P)rotocol

## Components

-   demo-app

    -   NodeJS Express server
    -   respond a random number between 1-100 on request to /roll
    -   expose http metrics on /metrics for prometheus
    -   Setup otel instrumentations for application logs, express http traces and metrics
    -   Listen to port 8080

-   Open telemetry collector

    -   Exports 8889 port for Prometheus metrics pulling
    -   Listen to protobuf ingress with http protocol on port 4318

-   Loki

    -   Runs on port 3100
    -   Accessible through grafana as a data source
    -   Uses ephemeral filesystem storage

-   Grafana

    -   Runs on port 8081

-   Prometheus

    -   Runs on port 9090
    -   Scrape Otel collector metrics
    -   Scrape demo-app metrics

-   Jaeger
    -   Listens to port 4317 for traces coming from otel
    -   UI accessible through port 16686

## Architecture

-   Logs, traces, metrics and instrumented on demo-app, and send through to Otel collector
-   On otel collector
    -   Logs are push to loki endpoints
    -   Traces are push to jaeger listening port
    -   Metrics are exposed on port 8889 for Prometheus to scrape
