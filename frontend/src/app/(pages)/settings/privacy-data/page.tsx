"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { PillButton } from "@/app/components/ui/pill-button";
import { useChatHistoryContext } from "@/app/contexts/ChatHistoryContext";
import { ConfirmPopup } from "@/app/components/popups/ConfirmPopup";
import {
    MfaVerificationPopup,
    needsMfaVerification,
} from "@/app/components/popups/MfaVerificationPopup";
import {
    deleteAllChats,
    deleteAllProjects,
    deleteAllTabularReviews,
    exportAccountData,
    exportChatData,
    exportTabularReviewsData,
    isMfaRequiredError,
} from "@/app/lib/mikeApi";
import { SettingsSection } from "../SettingsSection";

type DeleteDataAction = "chats" | "tabular-reviews" | "projects";
type ExportDataAction = "export-chats" | "export-tabular-reviews" | "export-account";
type MfaRetryAction = DeleteDataAction | ExportDataAction;

const isDev = process.env.NODE_ENV !== "production";
const devLog = (...args: Parameters<typeof console.log>) => {
    if (isDev) console.log(...args);
};

const DELETE_DATA_COPY: Record<
    DeleteDataAction,
    {
        title: string;
        message: string;
    }
> = {
    chats: {
        title: "Supprimer tous les chats ?",
        message:
            "Cette action supprimera définitivement l'historique de vos chats d'assistant et de revue tabulaire. Cette action est irréversible.",
    },
    "tabular-reviews": {
        title: "Supprimer toutes les revues tabulaires ?",
        message:
            "Cette action supprimera définitivement toutes les revues tabulaires dont vous êtes propriétaire, y compris leurs cellules et chats de revue. Cette action est irréversible.",
    },
    projects: {
        title: "Supprimer tous les projets ?",
        message:
            "Cette action supprimera définitivement tous les projets dont vous êtes propriétaire, y compris leurs documents, chats et revues tabulaires. Cette action est irréversible.",
    },
};

export default function PrivacyDataPage() {
    const { loadChats, setCurrentChatId } = useChatHistoryContext();
    const [pendingDeleteAction, setPendingDeleteAction] =
        useState<DeleteDataAction | null>(null);
    const [deletingAction, setDeletingAction] =
        useState<DeleteDataAction | null>(null);
    const [pendingMfaAction, setPendingMfaAction] =
        useState<MfaRetryAction | null>(null);
    const [isExportingAccount, setIsExportingAccount] = useState(false);
    const [isExportingChats, setIsExportingChats] = useState(false);
    const [isExportingTabularReviews, setIsExportingTabularReviews] =
        useState(false);

    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    const handleExportAccountData = async () => {
        devLog("[privacy-data/mfa] export account requested");
        setIsExportingAccount(true);
        try {
            if (await needsMfaVerification()) {
                setPendingMfaAction("export-account");
                return;
            }
            const { blob, filename } = await exportAccountData();
            downloadBlob(blob, filename ?? "mike-account-export.json");
        } catch (error) {
            devLog("[privacy-data/mfa] export account failed", {
                isMfaRequired: isMfaRequiredError(error),
                error,
            });
            if (isMfaRequiredError(error)) {
                setPendingMfaAction("export-account");
                return;
            }
            alert("Impossible d'exporter les données du compte. Veuillez réessayer.");
        } finally {
            setIsExportingAccount(false);
        }
    };

    const handleExportChatData = async () => {
        devLog("[privacy-data/mfa] export chats requested");
        setIsExportingChats(true);
        try {
            if (await needsMfaVerification()) {
                setPendingMfaAction("export-chats");
                return;
            }
            const { blob, filename } = await exportChatData();
            downloadBlob(blob, filename ?? "mike-chat-export.json");
        } catch (error) {
            devLog("[privacy-data/mfa] export chats failed", {
                isMfaRequired: isMfaRequiredError(error),
                error,
            });
            if (isMfaRequiredError(error)) {
                setPendingMfaAction("export-chats");
                return;
            }
            alert("Impossible d'exporter les chats. Veuillez réessayer.");
        } finally {
            setIsExportingChats(false);
        }
    };

    const handleExportTabularReviewsData = async () => {
        devLog("[privacy-data/mfa] export tabular reviews requested");
        setIsExportingTabularReviews(true);
        try {
            if (await needsMfaVerification()) {
                setPendingMfaAction("export-tabular-reviews");
                return;
            }
            const { blob, filename } = await exportTabularReviewsData();
            downloadBlob(blob, filename ?? "mike-tabular-reviews-export.json");
        } catch (error) {
            devLog("[privacy-data/mfa] export tabular reviews failed", {
                isMfaRequired: isMfaRequiredError(error),
                error,
            });
            if (isMfaRequiredError(error)) {
                setPendingMfaAction("export-tabular-reviews");
                return;
            }
            alert("Impossible d'exporter les revues tabulaires. Veuillez réessayer.");
        } finally {
            setIsExportingTabularReviews(false);
        }
    };

    const handleDeleteData = async (action: DeleteDataAction) => {
        devLog("[privacy-data/mfa] delete requested", { action });
        setDeletingAction(action);
        try {
            if (await needsMfaVerification()) {
                setPendingDeleteAction(null);
                setPendingMfaAction(action);
                return;
            }
            if (action === "chats") {
                await deleteAllChats();
                setCurrentChatId(null);
                await loadChats();
            } else if (action === "tabular-reviews") {
                await deleteAllTabularReviews();
            } else {
                await deleteAllProjects();
                setCurrentChatId(null);
                await loadChats();
            }
            setPendingDeleteAction(null);
        } catch (error) {
            devLog("[privacy-data/mfa] delete failed", {
                action,
                isMfaRequired: isMfaRequiredError(error),
                error,
            });
            if (isMfaRequiredError(error)) {
                setPendingDeleteAction(null);
                setPendingMfaAction(action);
                return;
            }
            alert("Impossible de supprimer les données. Veuillez réessayer.");
        } finally {
            setDeletingAction(null);
        }
    };

    const handleMfaVerified = async () => {
        const action = pendingMfaAction;
        devLog("[privacy-data/mfa] verification callback", { action });
        setPendingMfaAction(null);
        if (!action) return;

        if (action === "export-account") {
            await handleExportAccountData();
        } else if (action === "export-chats") {
            await handleExportChatData();
        } else if (action === "export-tabular-reviews") {
            await handleExportTabularReviewsData();
        } else {
            await handleDeleteData(action);
        }
    };

    const pendingDeleteCopy = pendingDeleteAction
        ? DELETE_DATA_COPY[pendingDeleteAction]
        : null;

    return (
        <div className="space-y-8">
            <section className="space-y-3">
                <h2 className="text-2xl font-medium font-serif text-gray-900">
                    Exporter les données
                </h2>
                <SettingsSection>
                    <div className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-700">
                                Exporter les chats
                            </p>
                            <p className="text-sm text-gray-500">
                                Télécharger l'historique des chats de l'assistant et des
                                revues tabulaires au format JSON.
                            </p>
                        </div>
                        <PillButton
                            tone="black"
                            size="sm"
                            onClick={handleExportChatData}
                            disabled={isExportingChats}
                            className="shrink-0"
                        >
                            {!isExportingChats && (
                                <Download className="h-4 w-4 shrink-0" />
                            )}
                            {isExportingChats ? "Exportation en cours..." : "Exporter"}
                        </PillButton>
                    </div>
                    <div className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-700">
                                Exporter les revues tabulaires
                            </p>
                            <p className="text-sm text-gray-500">
                                Télécharger toutes les revues tabulaires, cellules et
                                enregistrements de chat dont vous êtes propriétaire au format JSON.
                            </p>
                        </div>
                        <PillButton
                            tone="black"
                            size="sm"
                            onClick={handleExportTabularReviewsData}
                            disabled={isExportingTabularReviews}
                            className="shrink-0"
                        >
                            {!isExportingTabularReviews && (
                                <Download className="h-4 w-4 shrink-0" />
                            )}
                            {isExportingTabularReviews
                                ? "Exportation en cours..."
                                : "Exporter"}
                        </PillButton>
                    </div>
                    <div className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-700">
                                Exporter le JSON du compte
                            </p>
                            <p className="text-sm text-gray-500">
                                Télécharger les métadonnées du compte, projets,
                                métadonnées de documents, workflows et données de revues au format JSON.
                            </p>
                        </div>
                        <PillButton
                            tone="black"
                            size="sm"
                            onClick={handleExportAccountData}
                            disabled={isExportingAccount}
                            className="shrink-0"
                        >
                            {!isExportingAccount && (
                                <Download className="h-4 w-4 shrink-0" />
                            )}
                            {isExportingAccount ? "Exportation en cours..." : "Exporter"}
                        </PillButton>
                    </div>
                </SettingsSection>
            </section>

            <section className="space-y-3">
                <h2 className="text-2xl font-medium font-serif text-gray-900">
                    Supprimer les données
                </h2>
                <SettingsSection>
                    <div className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-700">
                                Supprimer tous les chats
                            </p>
                            <p className="text-sm text-gray-500">
                                Supprimer définitivement l'historique des chats de
                                l'assistant et des revues tabulaires.
                            </p>
                        </div>
                        <PillButton
                            tone="danger"
                            size="sm"
                            onClick={() => setPendingDeleteAction("chats")}
                            disabled={!!deletingAction}
                            className="w-full shrink-0 sm:w-auto"
                        >
                            <Trash2 className="h-4 w-4 shrink-0" />
                            Supprimer
                        </PillButton>
                    </div>
                    <div className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-700">
                                Supprimer toutes les revues tabulaires
                            </p>
                            <p className="text-sm text-gray-500">
                                Supprimer définitivement toutes les revues tabulaires dont
                                vous êtes propriétaire, y compris les cellules et chats de revue.
                            </p>
                        </div>
                        <PillButton
                            tone="danger"
                            size="sm"
                            onClick={() =>
                                setPendingDeleteAction("tabular-reviews")
                            }
                            disabled={!!deletingAction}
                            className="w-full shrink-0 sm:w-auto"
                        >
                            <Trash2 className="h-4 w-4 shrink-0" />
                            Supprimer
                        </PillButton>
                    </div>
                    <div className="flex flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-700">
                                Supprimer tous les projets
                            </p>
                            <p className="text-sm text-gray-500">
                                Supprimer définitivement tous les projets dont vous
                                êtes propriétaire, y compris les documents, chats et revues tabulaires.
                            </p>
                        </div>
                        <PillButton
                            tone="danger"
                            size="sm"
                            onClick={() => setPendingDeleteAction("projects")}
                            disabled={!!deletingAction}
                            className="w-full shrink-0 sm:w-auto"
                        >
                            <Trash2 className="h-4 w-4 shrink-0" />
                            Supprimer
                        </PillButton>
                    </div>
                </SettingsSection>
            </section>
            <ConfirmPopup
                open={!!pendingDeleteAction}
                title={pendingDeleteCopy?.title}
                message={pendingDeleteCopy?.message}
                confirmLabel="Supprimer"
                confirmStatus={deletingAction ? "loading" : "idle"}
                cancelLabel="Annuler"
                onCancel={() => {
                    if (deletingAction) return;
                    setPendingDeleteAction(null);
                }}
                onConfirm={() => {
                    if (!pendingDeleteAction) return;
                    void handleDeleteData(pendingDeleteAction);
                }}
            />
            <MfaVerificationPopup
                open={!!pendingMfaAction}
                onCancel={() => setPendingMfaAction(null)}
                onVerified={() => void handleMfaVerified()}
                title="Vérification à deux facteurs requise"
                message="Cette action est sensible. Saisissez un code depuis votre application d'authentification pour continuer."
            />
        </div>
    );
}
