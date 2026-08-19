"use client";

import { Check, ChevronDown, Eye, EyeOff, Loader2 } from "lucide-react";
import { FieldLabel } from "@/app/components/ui/form-field";
import {
    SETTINGS_CONTROL_CLASS,
    SettingsTextInput,
} from "@/app/components/settings/SettingsTextInput";
import { Modal } from "@/app/components/modals/Modal";
import type { McpConnectorSummary } from "@/app/lib/mikeApi";
import {
    settingsGlassIconButtonClassName,
} from "@/app/(pages)/settings/settingsStyles";

export type NewMcpDraft = {
    name: string;
    serverUrl: string;
    bearerToken: string;
    customHeaders: string;
};

export type NewMcpStep = "form" | "working" | "auth" | "success";

interface NewMcpModalProps {
    open: boolean;
    draft: NewMcpDraft;
    step: NewMcpStep;
    result: McpConnectorSummary | null;
    error: string | null;
    authMessage: string | null;
    showToken: boolean;
    showAdvanced: boolean;
    onDraftChange: (draft: NewMcpDraft) => void;
    onShowTokenChange: (show: boolean) => void;
    onShowAdvancedChange: (show: boolean) => void;
    onClose: () => void;
    onSubmit: () => Promise<void>;
    onOpenConnector: (connectorId: string) => void;
}

export function NewMcpModal({
    open,
    draft,
    step,
    result,
    error,
    authMessage,
    showToken,
    showAdvanced,
    onDraftChange,
    onShowTokenChange,
    onShowAdvancedChange,
    onClose,
    onSubmit,
    onOpenConnector,
}: NewMcpModalProps) {
    const canSubmit =
        draft.name.trim().length > 0 &&
        draft.serverUrl.trim().length > 0 &&
        step !== "working" &&
        step !== "auth";

    return (
        <Modal
            open={open}
            onClose={onClose}
            breadcrumbs={[
                "Connecteurs",
                step === "success"
                    ? "Connecteur ajouté"
                    : step === "auth"
                      ? "Authentifier le connecteur"
                      : "Nouveau connecteur MCP",
            ]}
            size="lg"
            primaryAction={
                step === "success" && result
                    ? {
                          label: "Afficher le connecteur",
                          onClick: () => onOpenConnector(result.id),
                      }
                    : {
                          label:
                              step === "working"
                                  ? "Connexion en cours..."
                                  : step === "auth"
                                    ? "Autorisation en cours..."
                                    : "Connecter",
                          icon:
                              step === "working" || step === "auth" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                              ) : undefined,
                          onClick: () => void onSubmit(),
                          disabled: !canSubmit,
                      }
            }
            cancelAction={
                step === "working" || step === "auth"
                    ? false
                    : {
                          label: step === "success" ? "Terminé" : "Annuler",
                          onClick: onClose,
                      }
            }
            footerStatus={
                error ? (
                    <div className="rounded-xl border border-white/70 bg-white/75 px-3 py-2 text-sm text-red-600 shadow-[0_12px_32px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-xl">
                        {error}
                    </div>
                ) : null
            }
        >
            {step === "success" && result ? (
                <NewMcpSuccess connector={result} />
            ) : step === "auth" ? (
                <NewMcpAuth
                    message={
                        authMessage ??
                        "Terminez l'autorisation dans la fenêtre contextuelle pour finaliser la connexion de ce serveur MCP."
                    }
                />
            ) : (
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
                    <p className="text-sm text-gray-500">
                        L'assistant aura accès à ce serveur MCP et à ses outils activés.
                    </p>
                    <NewMcpForm
                        draft={draft}
                        showToken={showToken}
                        showAdvanced={showAdvanced}
                        disabled={step === "working"}
                        onDraftChange={onDraftChange}
                        onShowTokenChange={onShowTokenChange}
                        onShowAdvancedChange={onShowAdvancedChange}
                    />
                </div>
            )}
        </Modal>
    );
}

function NewMcpForm({
    draft,
    showToken,
    showAdvanced,
    disabled,
    onDraftChange,
    onShowTokenChange,
    onShowAdvancedChange,
}: {
    draft: NewMcpDraft;
    showToken: boolean;
    showAdvanced: boolean;
    disabled: boolean;
    onDraftChange: (draft: NewMcpDraft) => void;
    onShowTokenChange: (show: boolean) => void;
    onShowAdvancedChange: (show: boolean) => void;
}) {
    return (
        <div className="grid gap-3 pt-1">
            <label className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center">
                <FieldLabel as="span" className="mb-0 text-gray-500">
                    Libellé
                </FieldLabel>
                <SettingsTextInput
                    value={draft.name}
                    onChange={(event) =>
                        onDraftChange({ ...draft, name: event.target.value })
                    }
                    placeholder="Libellé du connecteur"
                    className="h-8"
                    disabled={disabled}
                />
            </label>
            <label className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-center">
                <FieldLabel as="span" className="mb-0 text-gray-500">
                    Point de terminaison URL
                </FieldLabel>
                <SettingsTextInput
                    value={draft.serverUrl}
                    onChange={(event) =>
                        onDraftChange({
                            ...draft,
                            serverUrl: event.target.value,
                        })
                    }
                    placeholder="https://mcp.example.com/mcp"
                    className="h-8"
                    disabled={disabled}
                />
            </label>
            <div className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-start">
                <FieldLabel
                    as="span"
                    className="mb-0 pt-2 text-gray-500"
                >
                    Jeton Bearer
                </FieldLabel>
                <div className="min-w-0">
                    <div className="relative">
                        <SettingsTextInput
                            value={draft.bearerToken}
                            onChange={(event) =>
                                onDraftChange({
                                    ...draft,
                                    bearerToken: event.target.value,
                                })
                            }
                            type={showToken ? "text" : "password"}
                            placeholder="Jeton Bearer"
                            className="h-8 pr-10"
                            autoComplete="off"
                            spellCheck={false}
                            disabled={disabled}
                        />
                        {draft.bearerToken && (
                            <button
                                type="button"
                                className={`absolute inset-y-1 right-1.5 flex items-center ${settingsGlassIconButtonClassName}`}
                                onClick={() => onShowTokenChange(!showToken)}
                                aria-label={
                                    showToken ? "Masquer le jeton" : "Afficher le jeton"
                                }
                                disabled={disabled}
                            >
                                {showToken ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        )}
                    </div>
                    <p className="mt-1 text-right text-xs text-gray-500">
                        Les jetons sont chiffrés lors de leur stockage.
                    </p>
                </div>
            </div>
            <div className="grid gap-2">
                <button
                    type="button"
                    onClick={() => onShowAdvancedChange(!showAdvanced)}
                    className="inline-flex items-center gap-1 justify-self-start text-xs font-medium text-gray-500 transition-colors hover:text-gray-900"
                    disabled={disabled}
                >
                    Avancé
                    <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${
                            showAdvanced ? "" : "-rotate-90"
                        }`}
                    />
                </button>
                {showAdvanced && (
                    <label className="grid gap-2 sm:grid-cols-[96px_minmax(0,1fr)] sm:items-start">
                        <FieldLabel
                            as="span"
                            className="mb-0 text-gray-500"
                        >
                            En-têtes personnalisés
                        </FieldLabel>
                        <div className="min-w-0">
                            <textarea
                                value={draft.customHeaders}
                                onChange={(event) =>
                                    onDraftChange({
                                        ...draft,
                                        customHeaders: event.target.value,
                                    })
                                }
                                placeholder='{"X-API-Key":"secret"}'
                                className={`min-h-20 resize-y py-2 ${SETTINGS_CONTROL_CLASS}`}
                                autoComplete="off"
                                spellCheck={false}
                                disabled={disabled}
                            />
                            <p className="mt-1 text-right text-xs text-gray-500">
                                Les secrets sont chiffrés lors de leur stockage.
                            </p>
                        </div>
                    </label>
                )}
            </div>
        </div>
    );
}

function NewMcpSuccess({ connector }: { connector: McpConnectorSummary }) {
    return (
        <div className="flex h-full min-h-0 flex-1 flex-col gap-4 pb-4">
            <div className="flex items-start gap-3 rounded-xl border border-green-100/80 bg-green-50/80 px-3 py-3 text-green-800 shadow-[0_3px_9px_rgba(15,23,42,0.03),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-4px_9px_rgba(255,255,255,0.05)] backdrop-blur-xl">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <p className="min-w-0 truncate text-sm font-medium">
                    {connector.name} est connecté.{" "}
                    <span className="font-normal text-green-700">
                        {connector.tools.length} {connector.tools.length === 1 ? "outil détecté" : "outils détectés"}.
                    </span>
                </p>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-100 bg-white/60">
                <div className="max-h-full overflow-y-auto divide-y divide-gray-100">
                    {connector.tools.map((tool) => (
                        <div
                            key={tool.openaiToolName}
                            className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 px-3 py-2"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-700">
                                    {tool.title ?? tool.openaiToolName}
                                </p>
                                {tool.description && (
                                    <p className="truncate text-xs text-gray-500">
                                        {tool.description}
                                    </p>
                                )}
                            </div>
                            <span className="text-xs text-gray-400">
                                {tool.enabled ? "Activé" : "Désactivé"}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function NewMcpAuth({ message }: { message: string }) {
    return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 pb-4 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/70 bg-white/75 text-gray-700 shadow-[0_3px_9px_rgba(15,23,42,0.03),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-4px_9px_rgba(255,255,255,0.05)] backdrop-blur-xl">
                <Loader2 className="h-4 w-4 animate-spin" />
            </div>
            <div className="max-w-sm space-y-1">
                <h3 className="text-sm font-medium text-gray-700">
                    Authentification requise
                </h3>
                <p className="text-sm text-gray-500">{message}</p>
            </div>
        </div>
    );
}
