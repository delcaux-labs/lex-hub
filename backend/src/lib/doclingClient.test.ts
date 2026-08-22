import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getDoclingClient,
  isDoclingAvailable,
  parsePdfWithDocling,
} from "./doclingClient";

const { mockConvertAsync, mockHealth, mockDestroy, mockCreateAPIClient } =
  vi.hoisted(() => {
    const mockConvertAsync = vi.fn();
    const mockHealth = vi.fn();
    const mockDestroy = vi.fn();
    const mockCreateAPIClient = vi.fn(() => ({
      convertAsync: mockConvertAsync,
      health: mockHealth,
      destroy: mockDestroy,
    }));
    return {
      mockConvertAsync,
      mockHealth,
      mockDestroy,
      mockCreateAPIClient,
    };
  });

vi.mock("docling-sdk", () => ({
  createAPIClient: mockCreateAPIClient,
}));

describe("doclingClient", () => {
  const originalEnv = process.env.DOCLING_SERVICE_URL;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.DOCLING_SERVICE_URL = originalEnv;
  });

  describe("getDoclingClient", () => {
    it("returns null if DOCLING_SERVICE_URL is not set and no baseUrl provided", () => {
      delete process.env.DOCLING_SERVICE_URL;
      const client = getDoclingClient();
      expect(client).toBeNull();
      expect(mockCreateAPIClient).not.toHaveBeenCalled();
    });

    it("creates a DoclingAPIClient when service URL is provided", () => {
      const client = getDoclingClient("http://localhost:5001");
      expect(client).not.toBeNull();
      expect(mockCreateAPIClient).toHaveBeenCalledWith("http://localhost:5001", {
        timeout: 180000,
      });
      client?.destroy();
      expect(mockDestroy).toHaveBeenCalled();
    });
  });

  describe("isDoclingAvailable", () => {
    it("returns false if service URL is unconfigured", async () => {
      delete process.env.DOCLING_SERVICE_URL;
      const available = await isDoclingAvailable();
      expect(available).toBe(false);
      expect(mockCreateAPIClient).not.toHaveBeenCalled();
    });

    it("returns true when health check succeeds", async () => {
      process.env.DOCLING_SERVICE_URL = "http://docling-serve:5001";
      mockHealth.mockResolvedValueOnce({ status: "ok" });

      const available = await isDoclingAvailable();
      expect(available).toBe(true);
      expect(mockHealth).toHaveBeenCalled();
      expect(mockDestroy).toHaveBeenCalled();
    });

    it("returns false when health check throws", async () => {
      process.env.DOCLING_SERVICE_URL = "http://docling-serve:5001";
      mockHealth.mockRejectedValueOnce(new Error("Connection refused"));

      const available = await isDoclingAvailable();
      expect(available).toBe(false);
      expect(mockDestroy).toHaveBeenCalled();
    });
  });

  describe("parsePdfWithDocling", () => {
    it("returns null immediately if DOCLING_SERVICE_URL is not set", async () => {
      delete process.env.DOCLING_SERVICE_URL;

      const result = await parsePdfWithDocling(new ArrayBuffer(16));
      expect(result).toBeNull();
      expect(mockCreateAPIClient).not.toHaveBeenCalled();
    });

    it("returns parsed markdown and structured pages on successful convertAsync", async () => {
      process.env.DOCLING_SERVICE_URL = "http://docling-serve:5001";
      mockConvertAsync.mockResolvedValueOnce({
        status: "success",
        document: {
          md_content:
            "# Article 1\nContent of page 1<!-- page_break --># Article 2\nContent of page 2",
        },
      });

      const result = await parsePdfWithDocling(new ArrayBuffer(32), "test.pdf");

      expect(result).not.toBeNull();
      expect(result?.numPages).toBe(2);
      expect(result?.markdown).toContain("[Page 1]\n# Article 1");
      expect(result?.markdown).toContain("[Page 2]\n# Article 2");
      expect(result?.pages).toHaveLength(2);
      expect(result?.pages?.[0].markdown).toBe("# Article 1\nContent of page 1");
      expect(result?.pages?.[1].markdown).toBe("# Article 2\nContent of page 2");
      expect(mockDestroy).toHaveBeenCalled();
    });

    it("returns null gracefully on conversion failure", async () => {
      process.env.DOCLING_SERVICE_URL = "http://docling-serve:5001";
      mockConvertAsync.mockResolvedValueOnce({
        status: "failure",
        document: null,
      });

      const result = await parsePdfWithDocling(new ArrayBuffer(32));
      expect(result).toBeNull();
      expect(mockDestroy).toHaveBeenCalled();
    });

    it("returns null gracefully on network exception or error", async () => {
      process.env.DOCLING_SERVICE_URL = "http://docling-serve:5001";
      mockConvertAsync.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const result = await parsePdfWithDocling(new ArrayBuffer(32));
      expect(result).toBeNull();
      expect(mockDestroy).toHaveBeenCalled();
    });
  });
});
