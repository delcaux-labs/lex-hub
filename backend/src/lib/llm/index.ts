import { getLanguageModel } from "./providers";
import type { StreamChatParams, StreamChatResult, UserApiKeys } from "./types";

export * from "./types";
export * from "./models";
export * from "./providers";
export * from "./telemetry";

export async function streamChatWithTools(
    params: StreamChatParams,
): Promise<StreamChatResult> {
    const { streamText, jsonSchema, isStepCount } = await import("ai");
    const model = await getLanguageModel(params.model, params.apiKeys);

    const tools: Record<string, any> = {};
    if (params.tools && params.tools.length > 0 && params.runTools) {
        for (const t of params.tools) {
            tools[t.function.name] = {
                description: t.function.description,
                parameters: jsonSchema(t.function.parameters as any),
                execute: async (args: any) => {
                    const callId = `call_${Math.random().toString(36).slice(2, 9)}`;
                    params.callbacks?.onToolCallStart?.({
                        id: callId,
                        name: t.function.name,
                        input: args ?? {},
                    });
                    const results = await params.runTools!([
                        { id: callId, name: t.function.name, input: args ?? {} },
                    ]);
                    return results[0]?.content ?? "";
                },
            };
        }
    }

    const messages = params.messages.map((m) => ({
        role: m.role,
        content: m.content,
    }));

    const result = streamText({
        model,
        system: params.systemPrompt,
        messages: messages as any,
        tools: Object.keys(tools).length > 0 ? tools : undefined,
        stopWhen: isStepCount(params.maxIterations ?? 15),
        abortSignal: params.abortSignal,
        experimental_telemetry: {
            isEnabled: true,
            functionId: "assistant-streamChatWithTools",
        },
    });

    let fullText = "";
    let isReasoning = false;

    for await (const part of result.fullStream) {
        const p = part as any;
        if (p.type === "text-delta") {
            if (isReasoning) {
                isReasoning = false;
                params.callbacks?.onReasoningBlockEnd?.();
            }
            const delta = p.text ?? p.textDelta ?? "";
            params.callbacks?.onContentDelta?.(delta);
            fullText += delta;
        } else if (p.type === "reasoning-delta" || p.type === "reasoning") {
            isReasoning = true;
            const delta = p.text ?? p.textDelta ?? "";
            params.callbacks?.onReasoningDelta?.(delta);
        } else if (p.type === "reasoning-end") {
            if (isReasoning) {
                isReasoning = false;
                params.callbacks?.onReasoningBlockEnd?.();
            }
        }
    }

    if (isReasoning) {
        params.callbacks?.onReasoningBlockEnd?.();
    }

    return { fullText };
}

export async function completeText(params: {
    model: string;
    systemPrompt?: string;
    user: string;
    maxTokens?: number;
    apiKeys?: UserApiKeys;
}): Promise<string> {
    const { generateText } = await import("ai");
    const model = await getLanguageModel(params.model, params.apiKeys);
    const result = await generateText({
        model,
        system: params.systemPrompt,
        prompt: params.user,
        maxOutputTokens: params.maxTokens,
        experimental_telemetry: {
            isEnabled: true,
            functionId: "assistant-completeText",
        },
    });
    return result.text;
}
