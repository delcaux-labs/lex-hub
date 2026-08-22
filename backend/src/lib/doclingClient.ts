import { createAPIClient, type DoclingAPIClient } from "docling-sdk";

export interface DoclingConvertResult {
  markdown: string;
  numPages: number;
  pages?: Array<{ page_no: number; markdown: string }>;
  filename?: string;
}

export interface DoclingClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  pipeline?: "standard" | "vlm";
  ocrEngine?: "rapidocr" | "easyocr" | "tesseract" | "tesserocr" | "ocrmac";
  doOcr?: boolean;
  forceOcr?: boolean;
  pageRange?: [number, number];
  pageBreakPlaceholder?: string;
  vlmPipelinePreset?: string;
  vlmPipelineModelApi?: {
    url: string;
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    timeout: number;
    concurrency: number;
    prompt: string;
    scale: number;
    response_format: "doctags" | "markdown";
  };
}

const DEFAULT_TIMEOUT_MS = 180_000;

/**
 * Creates and returns a configured Docling SDK API client,
 * or null if no service URL is configured.
 */
export function getDoclingClient(
  baseUrl?: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): DoclingAPIClient | null {
  const serviceUrl = baseUrl || process.env.DOCLING_SERVICE_URL?.trim();
  if (!serviceUrl) {
    return null;
  }

  return createAPIClient(serviceUrl.replace(/\/+$/, ""), {
    timeout: timeoutMs,
  });
}

/**
 * Checks if the Docling service is reachable and healthy.
 */
export async function isDoclingAvailable(baseUrl?: string): Promise<boolean> {
  const client = getDoclingClient(baseUrl, 5_000);
  if (!client) {
    return false;
  }

  try {
    const health = await client.health();
    return health.status === "ok" || health.status === "available";
  } catch {
    return false;
  } finally {
    client.destroy();
  }
}

/**
 * Sends a PDF buffer to the Docling service using the official Docling SDK (asynchronous polling).
 * Returns the parsed Markdown with [Page N] anchors, or null if the service is
 * unconfigured, unreachable, or encounters an error.
 */
export async function parsePdfWithDocling(
  buf: ArrayBuffer | Buffer | Uint8Array,
  filename: string = "document.pdf",
  options?: DoclingClientOptions | number,
): Promise<DoclingConvertResult | null> {
  const resolvedOptions: DoclingClientOptions =
    typeof options === "number" ? { timeoutMs: options } : (options ?? {});

  const serviceUrl =
    resolvedOptions.baseUrl || process.env.DOCLING_SERVICE_URL?.trim();
  if (!serviceUrl) {
    return null;
  }

  const timeoutMs =
    resolvedOptions.timeoutMs ??
    (process.env.DOCLING_TIMEOUT_MS
      ? Number(process.env.DOCLING_TIMEOUT_MS)
      : DEFAULT_TIMEOUT_MS);

  const client = getDoclingClient(serviceUrl, timeoutMs);
  if (!client) {
    return null;
  }

  try {
    let uint8: Uint8Array;
    if (buf instanceof Uint8Array) {
      uint8 = buf;
    } else if (buf instanceof ArrayBuffer) {
      uint8 = new Uint8Array(buf);
    } else {
      const b = buf as Buffer;
      uint8 = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);
    }

    const pipeline =
      resolvedOptions.pipeline ??
      (process.env.DOCLING_PIPELINE as "standard" | "vlm") ??
      "standard";

    const ocrEngine =
      resolvedOptions.ocrEngine ??
      (process.env.DOCLING_OCR_ENGINE as
        | "rapidocr"
        | "easyocr"
        | "tesseract"
        | "tesserocr"
        | "ocrmac") ??
      "rapidocr";

    const doOcr = resolvedOptions.doOcr ?? true;
    const pageBreakPlaceholder =
      resolvedOptions.pageBreakPlaceholder ?? "\n\n<!-- page_break -->\n\n";

    const conversionOptions: Record<string, unknown> = {
      to_formats: ["md"],
      pipeline,
      ocr_engine: ocrEngine,
      do_ocr: doOcr,
      md_page_break_placeholder: pageBreakPlaceholder,
    };

    if (resolvedOptions.forceOcr !== undefined) {
      conversionOptions.force_ocr = resolvedOptions.forceOcr;
    }
    if (resolvedOptions.pageRange) {
      conversionOptions.page_range = resolvedOptions.pageRange;
    }
    const vlmPreset =
      resolvedOptions.vlmPipelinePreset ??
      process.env.DOCLING_VLM_PRESET?.replace(/^["']|["']$/g, "")?.trim();
    if (vlmPreset) {
      conversionOptions.vlm_pipeline_preset = vlmPreset;
    }
    if (resolvedOptions.vlmPipelineModelApi) {
      conversionOptions.vlm_pipeline_model_api =
        resolvedOptions.vlmPipelineModelApi;
    }

    // Ensure SDK includes vlm_pipeline_preset in multipart form data
    if ((client as any).files?.buildFormFields) {
      const origBuildFormFields = (client as any).files.buildFormFields.bind(
        (client as any).files,
      );
      (client as any).files.buildFormFields = (
        opts: Record<string, unknown>,
        target?: string,
      ) => {
        const fields = origBuildFormFields(opts, target);
        if (opts?.vlm_pipeline_preset) {
          fields.vlm_pipeline_preset = opts.vlm_pipeline_preset;
        }
        return fields;
      };
    }

    // Optimize taskManager polling waitSeconds for fast responsiveness
    if ((client as any).files?.taskManager) {
      const origStartPolling = (
        client as any
      ).files.taskManager.startPollingExistingTask.bind(
        (client as any).files.taskManager,
      );
      (client as any).files.taskManager.startPollingExistingTask = (
        taskId: string,
        opts?: Record<string, unknown>,
      ) => {
        return origStartPolling(taskId, {
          timeout: timeoutMs,
          pollInterval: 1500,
          maxPolls: Math.ceil(timeoutMs / 1500),
          waitSeconds: 2,
          pollingRetries: 5,
          ...opts,
        });
      };
    }

    const response = await client.convertAsync(
      uint8,
      filename,
      conversionOptions as any,
    );

    if (
      !response ||
      response.status === "failure" ||
      !response.document?.md_content
    ) {
      console.warn(
        `[docling-client] Conversion failed or returned empty document for ${filename}`,
      );
      return null;
    }

    const rawMd: string = response.document.md_content;
    const pageChunks: string[] = rawMd.split("<!-- page_break -->");
    const numPages = pageChunks.length;
    const structuredPages = pageChunks.map((chunk: string, idx: number) => ({
      page_no: idx + 1,
      markdown: chunk.trim(),
    }));

    const formattedMarkdown = pageChunks
      .map((chunk: string, idx: number) => {
        const trimmed = chunk.trim();
        if (trimmed.startsWith(`[Page ${idx + 1}]`)) {
          return trimmed;
        }
        return `[Page ${idx + 1}]\n${trimmed}`;
      })
      .join("\n\n");

    return {
      markdown: formattedMarkdown,
      numPages,
      pages: structuredPages,
      filename,
    };
  } catch (err: unknown) {
    console.warn(
      `[docling-client] Docling SDK conversion error for ${filename}:`,
      err instanceof Error ? err.message : String(err),
    );
    return null;
  } finally {
    client.destroy();
  }
}
