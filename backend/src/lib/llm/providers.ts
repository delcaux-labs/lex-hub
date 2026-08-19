import { providerForModel } from "./models";
import type { UserApiKeys } from "./types";

export async function getLanguageModel(
    modelId: string,
    apiKeys?: UserApiKeys,
): Promise<any> {
    const provider = providerForModel(modelId);

    switch (provider) {
        case "claude": {
            const key =
                apiKeys?.claude?.trim() ||
                process.env.ANTHROPIC_API_KEY?.trim() ||
                "";
            if (!key) {
                throw new Error(
                    "Anthropic API key is not configured. Set ANTHROPIC_API_KEY or add a user Anthropic key.",
                );
            }
            const { createAnthropic } = await import("@ai-sdk/anthropic");
            const anthropic = createAnthropic({ apiKey: key });
            return anthropic(modelId);
        }

        case "gemini": {
            const key =
                apiKeys?.gemini?.trim() ||
                process.env.GEMINI_API_KEY?.trim() ||
                "";
            if (!key) {
                throw new Error(
                    "Gemini API key is not configured. Set GEMINI_API_KEY or add a user Gemini key.",
                );
            }
            const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
            const google = createGoogleGenerativeAI({ apiKey: key });
            return google(modelId);
        }

        case "openai": {
            const key =
                apiKeys?.openai?.trim() ||
                process.env.OPENAI_API_KEY?.trim() ||
                "";
            if (!key) {
                throw new Error(
                    "OpenAI API key is not configured. Set OPENAI_API_KEY or add a user OpenAI key.",
                );
            }
            const { createOpenAI } = await import("@ai-sdk/openai");
            const openai = createOpenAI({ apiKey: key });
            return openai(modelId);
        }

        case "openrouter": {
            const key =
                apiKeys?.openrouter?.trim() ||
                process.env.OPENROUTER_API_KEY?.trim() ||
                "";
            if (!key) {
                throw new Error(
                    "OpenRouter API key is not configured. Set OPENROUTER_API_KEY or add a user OpenRouter key.",
                );
            }
            const { createOpenAI } = await import("@ai-sdk/openai");
            const openrouter = createOpenAI({
                name: "openrouter",
                baseURL: "https://openrouter.ai/api/v1",
                apiKey: key,
            });
            const actualModel = modelId.replace(/^openrouter\/?/, "");
            return openrouter.chat(actualModel);
        }

        case "ollama": {
            const baseURL = (
                process.env.OLLAMA_BASE_URL?.trim() || "http://localhost:11434/v1"
            ).replace(/\/$/, "");
            const key = process.env.OLLAMA_API_KEY?.trim() || "ollama";
            const { createOpenAI } = await import("@ai-sdk/openai");
            const ollama = createOpenAI({
                name: "ollama",
                baseURL,
                apiKey: key,
            });
            const actualModel =
                modelId.replace(/^ollama\/?/, "") ||
                process.env.OLLAMA_MODEL?.trim() ||
                "qwen3.6";
            return ollama.chat(actualModel);
        }

        default:
            throw new Error(`Unsupported model or provider: ${modelId}`);
    }
}
