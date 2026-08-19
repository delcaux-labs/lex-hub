import { describe, it, expect } from "vitest";
import { getLanguageModel } from "../llm/providers";

describe("getLanguageModel factory", () => {
    it("instantiates an Anthropic model with API key", async () => {
        const model = await getLanguageModel("claude-sonnet-4-6", {
            claude: "test-anthropic-key",
        });
        expect(model).toBeDefined();
        expect(model.modelId).toBe("claude-sonnet-4-6");
        expect(model.provider).toBe("anthropic.messages");
    });

    it("instantiates an OpenAI model with API key", async () => {
        const model = await getLanguageModel("gpt-5.4", {
            openai: "test-openai-key",
        });
        expect(model).toBeDefined();
        expect(model.provider).toMatch(/^openai\./);
    });

    it("instantiates a Gemini model with API key", async () => {
        const model = await getLanguageModel("gemini-3.5-flash", {
            gemini: "test-gemini-key",
        });
        expect(model).toBeDefined();
        expect(model.modelId).toBe("gemini-3.5-flash");
        expect(model.provider).toBe("google.generative-ai");
    });

    it("instantiates an OpenRouter model with API key", async () => {
        const model = await getLanguageModel("openrouter/meta-llama/llama-3.3-70b", {
            openrouter: "test-openrouter-key",
        });
        expect(model).toBeDefined();
        expect(model.modelId).toBe("meta-llama/llama-3.3-70b");
        expect(model.provider).toBe("openrouter.chat");
    });

    it("instantiates an Ollama model", async () => {
        const model = await getLanguageModel("ollama/qwen3.6:latest");
        expect(model).toBeDefined();
        expect(model.modelId).toBe("qwen3.6:latest");
        expect(model.provider).toBe("ollama.chat");
    });

    it("throws a descriptive error when API key is missing", async () => {
        const prevKey = process.env.ANTHROPIC_API_KEY;
        delete process.env.ANTHROPIC_API_KEY;
        try {
            await expect(getLanguageModel("claude-sonnet-4-6")).rejects.toThrow(
                /Anthropic API key is not configured/,
            );
        } finally {
            if (prevKey) process.env.ANTHROPIC_API_KEY = prevKey;
        }
    });
});
