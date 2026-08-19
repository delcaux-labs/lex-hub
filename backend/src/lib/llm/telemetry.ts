import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

let sdk: NodeSDK | null = null;

/**
 * Initializes OpenTelemetry NodeSDK if OTEL_EXPORTER_OTLP_ENDPOINT or
 * OTEL_TRACING_ENABLED is configured.
 *
 * Designed to stream traces directly to MLflow (via OTLP) or any OTLP-compatible collector.
 */
export function initTelemetry(): void {
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
    const enabled = process.env.OTEL_TRACING_ENABLED === "true" || !!endpoint;

    if (!enabled || sdk) return;

    try {
        const traceExporter = new OTLPTraceExporter(
            endpoint
                ? {
                      url: endpoint.endsWith("/v1/traces")
                          ? endpoint
                          : `${endpoint.replace(/\/$/, "")}/v1/traces`,
                      headers: parseOtelHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS),
                  }
                : undefined,
        );

        sdk = new NodeSDK({
            resource: resourceFromAttributes({
                [ATTR_SERVICE_NAME]:
                    process.env.OTEL_SERVICE_NAME?.trim() || "lex-hub-backend",
            }),
            traceExporter,
        });

        sdk.start();
        console.log(
            `[OpenTelemetry] Tracing initialized (Service: ${
                process.env.OTEL_SERVICE_NAME || "lex-hub-backend"
            }, Endpoint: ${endpoint || "default"})`,
        );

        process.on("SIGTERM", () => {
            sdk?.shutdown().catch((err) =>
                console.error("[OpenTelemetry] Error shutting down:", err),
            );
        });
    } catch (err) {
        console.warn("[OpenTelemetry] Failed to initialize tracing SDK:", err);
    }
}

function parseOtelHeaders(headerStr?: string): Record<string, string> {
    const headers: Record<string, string> = {};
    if (headerStr?.trim()) {
        for (const part of headerStr.split(",")) {
            const [k, ...v] = part.split("=");
            if (k && v.length > 0) {
                headers[k.trim()] = v.join("=").trim();
            }
        }
    }
    // Default to experiment 0 for MLflow trace ingestion if not explicitly set
    if (!headers["x-mlflow-experiment-id"]) {
        headers["x-mlflow-experiment-id"] = "0";
    }
    return headers;
}
