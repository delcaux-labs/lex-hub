"use client";

import { useState } from "react";
import { ApiKeyField } from "@/app/components/settings/ApiKeyField";
import { useUserProfile } from "@/app/contexts/UserProfileContext";
import { SettingsSection } from "../SettingsSection";
import { SettingsToggle } from "../SettingsToggle";

export default function FeaturesPage() {
    const {
        profile,
        updateApiKey,
        updateLegalResearchUs,
        updateQuickActionsVisible,
    } = useUserProfile();
    const [quickActionsError, setQuickActionsError] = useState<string | null>(
        null,
    );
    const [saving, setSaving] = useState(false);
    const [savingQuickActions, setSavingQuickActions] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [optimisticLegalResearchUs, setOptimisticLegalResearchUs] = useState<
        boolean | null
    >(null);

    const persistedLegalResearchUs = profile?.legalResearchUs ?? true;
    const courtListenerEnabled =
        optimisticLegalResearchUs ?? persistedLegalResearchUs;
    const quickActionsVisible = profile?.quickActionsVisible ?? true;

    const setQuickActionsVisible = async (visible: boolean) => {
        setQuickActionsError(null);
        setSavingQuickActions(true);
        const ok = await updateQuickActionsVisible(visible);
        setSavingQuickActions(false);
        if (!ok) setQuickActionsError("Impossible de mettre à jour. Veuillez réessayer.");
    };

    const handleCourtListenerChange = async (enabled: boolean) => {
        if (saving) return;
        setSaveError(null);
        setOptimisticLegalResearchUs(enabled);
        setSaving(true);
        const ok = await updateLegalResearchUs(enabled);
        setSaving(false);
        setOptimisticLegalResearchUs(null);
        if (!ok) {
            setSaveError("Impossible de mettre à jour. Veuillez réessayer.");
        }
    };

    return (
        <div className="space-y-8">
            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-medium font-serif text-gray-900">
                        Assistant
                    </h2>
                </div>
                <SettingsSection>
                    <div className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-700">
                                Actions rapides
                            </p>
                            <p className="text-sm text-gray-500">
                                Afficher la barre d'actions rapides sur l'écran
                                d'accueil de l'assistant.
                            </p>
                            {quickActionsError && (
                                <p className="text-sm text-red-600">
                                    {quickActionsError}
                                </p>
                            )}
                        </div>
                        <SettingsToggle
                            checked={quickActionsVisible}
                            loading={savingQuickActions}
                            size="md"
                            onChange={(checked) => {
                                void setQuickActionsVisible(checked);
                            }}
                        />
                    </div>
                </SettingsSection>
            </section>

            <section className="space-y-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-medium font-serif text-gray-900">
                        Recherche juridique
                    </h2>
                </div>
                <SettingsSection>
                    <div className="flex items-center justify-between gap-3 px-4 py-5">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-700">
                                Activer CourtListener
                            </p>
                            <p className="text-sm text-gray-500">
                                CourtListener donne accès à la jurisprudence américaine.
                            </p>
                        </div>
                        <SettingsToggle
                            checked={courtListenerEnabled}
                            loading={saving}
                            size="md"
                            onChange={(enabled) =>
                                void handleCourtListenerChange(enabled)
                            }
                        />
                    </div>
                    {saveError && (
                        <p className="px-4 pb-4 text-sm text-red-600">
                            {saveError}
                        </p>
                    )}
                    {courtListenerEnabled && (
                        <ApiKeyField
                            label="Clé API CourtListener"
                            placeholder="Jeton..."
                            hasSavedKey={
                                !!profile?.apiKeys.courtlistener.configured
                            }
                            isServerConfigured={
                                profile?.apiKeys.courtlistener.source === "env"
                            }
                            onSave={(value) =>
                                updateApiKey(
                                    "courtlistener",
                                    value.trim() || null,
                                )
                            }
                            onRemove={() => updateApiKey("courtlistener", null)}
                        />
                    )}
                </SettingsSection>
            </section>
        </div>
    );
}
