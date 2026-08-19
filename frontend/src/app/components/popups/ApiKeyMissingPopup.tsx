"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { providerLabel, type ModelProvider } from "@/app/lib/modelAvailability";
import { WarningPopup } from "../popups/WarningPopup";

interface Props {
    open: boolean;
    onClose: () => void;
    provider: ModelProvider | null;
    /** Optional override for the body sentence. */
    message?: string;
}

export function ApiKeyMissingPopup({ open, onClose, provider, message }: Props) {
    const router = useRouter();
    if (!open) return null;

    const providerName = provider ? providerLabel(provider) : "ce fournisseur";
    const body =
        message ??
        `Vous n'avez pas encore ajouté de clé API ${providerName}. Ajoutez-en une dans les Paramètres pour utiliser ce modèle.`;

    const handleGoToSettings = () => {
        onClose();
        router.push("/settings/api-keys");
    };

    return (
        <WarningPopup
            open={open}
            onClose={onClose}
            title="Clé API requise"
            message={body}
            icon={
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
            }
            primaryAction={{
                label: "Aller aux paramètres",
                onClick: handleGoToSettings,
            }}
        />
    );
}
