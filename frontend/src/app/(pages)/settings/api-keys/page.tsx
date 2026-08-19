"use client";

import { ApiKeyField } from "@/app/components/settings/ApiKeyField";
import { useUserProfile } from "@/app/contexts/UserProfileContext";
import { SettingsSection } from "../SettingsSection";

const MODEL_API_KEY_FIELDS = [
    {
        provider: "claude",
        label: "Clé API Anthropic (Claude)",
        placeholder: "sk-ant-...",
    },
    {
        provider: "gemini",
        label: "Clé API Google (Gemini)",
        placeholder: "AI...",
    },
    {
        provider: "openai",
        label: "Clé API OpenAI",
        placeholder: "sk-...",
    },
    {
        provider: "openrouter",
        label: "Clé API OpenRouter",
        placeholder: "sk-or-...",
    },
] as const;

export default function ApiKeysPage() {
    const { profile, updateApiKey } = useUserProfile();

    return (
        <div>
            <div className="mb-3">
                <h2 className="text-2xl font-medium font-serif text-gray-900">
                    Clés API
                </h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">
                Vous devez fournir vos propres clés API pour que l'application fonctionne, ou ajouter vos clés API dans le fichier .env si vous hébergez votre propre instance. Toutes les clés API sont chiffrées lors de leur stockage.
            </p>
            <SettingsSection>
                {MODEL_API_KEY_FIELDS.map((field) => (
                    <div key={field.provider}>
                        <ApiKeyField
                            label={field.label}
                            placeholder={field.placeholder}
                            hasSavedKey={
                                !!profile?.apiKeys[field.provider].configured
                            }
                            isServerConfigured={
                                profile?.apiKeys[field.provider].source ===
                                "env"
                            }
                            onSave={(value) =>
                                updateApiKey(
                                    field.provider,
                                    value.trim() || null,
                                )
                            }
                            onRemove={() => updateApiKey(field.provider, null)}
                        />
                    </div>
                ))}
            </SettingsSection>

        </div>
    );
}
