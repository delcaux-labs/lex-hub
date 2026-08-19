"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { PillButton } from "@/app/components/ui/pill-button";
import { FieldLabel } from "@/app/components/ui/form-field";
import { SettingsTextInput } from "@/app/components/settings/SettingsTextInput";
import { useAuth } from "@/app/contexts/AuthContext";
import { useUserProfile } from "@/app/contexts/UserProfileContext";
import { ConfirmPopup } from "@/app/components/popups/ConfirmPopup";
import {
    MfaVerificationPopup,
    needsMfaVerification,
} from "@/app/components/popups/MfaVerificationPopup";
import { WarningPopup } from "@/app/components/popups/WarningPopup";
import { deleteAccount, isMfaRequiredError } from "@/app/lib/mikeApi";
import { SettingsSection } from "./SettingsSection";

const isDev = process.env.NODE_ENV !== "production";
const devLog = (...args: Parameters<typeof console.log>) => {
    if (isDev) console.log(...args);
};

export default function SettingsPage() {
    const router = useRouter();
    const { user, signOut, updateEmail } = useAuth();
    const { profile, updateDisplayName, updateOrganisation } = useUserProfile();
    const [displayName, setDisplayName] = useState("");
    const [isSavingName, setIsSavingName] = useState(false);
    const [saved, setSaved] = useState(false);
    const [organisation, setOrganisation] = useState("");
    const [isSavingOrg, setIsSavingOrg] = useState(false);
    const [orgSaved, setOrgSaved] = useState(false);
    const [email, setEmail] = useState("");
    const [isSavingEmail, setIsSavingEmail] = useState(false);
    const [emailSaved, setEmailSaved] = useState(false);
    const [emailStatus, setEmailStatus] = useState<string | null>(null);
    const [emailWarning, setEmailWarning] = useState<string | null>(null);
    const [emailMfaOpen, setEmailMfaOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [accountDeleteMfaOpen, setAccountDeleteMfaOpen] = useState(false);

    useEffect(() => {
        if (profile?.displayName) {
            setDisplayName(profile.displayName);
        }
        if (profile?.organisation) {
            setOrganisation(profile.organisation);
        }
    }, [profile]);

    useEffect(() => {
        if (user?.email) {
            setEmail(user.pendingEmail || user.email);
        }
    }, [user?.email, user?.pendingEmail]);

    const handleDeleteAccount = async () => {
        devLog("[account/mfa] delete account requested");
        setIsDeleting(true);
        try {
            if (await needsMfaVerification()) {
                setDeleteConfirm(false);
                setAccountDeleteMfaOpen(true);
                setIsDeleting(false);
                return;
            }
            await deleteAccount();
            await signOut();
            router.push("/");
        } catch (error) {
            setIsDeleting(false);
            devLog("[account/mfa] delete account failed", {
                isMfaRequired: isMfaRequiredError(error),
                error,
            });
            if (isMfaRequiredError(error)) {
                setDeleteConfirm(false);
                setAccountDeleteMfaOpen(true);
                return;
            }
            setDeleteConfirm(false);
            alert("Impossible de supprimer le compte. Veuillez réessayer.");
        }
    };

    const handleSaveEmail = async () => {
        const nextEmail = email.trim();
        if (!nextEmail || nextEmail === user?.email) return;

        devLog("[account/mfa] save email requested");
        setIsSavingEmail(true);
        setEmailStatus(null);
        setEmailWarning(null);
        try {
            if (await needsMfaVerification()) {
                setEmailMfaOpen(true);
                return;
            }

            const updatedUser = await updateEmail(nextEmail);
            const pendingEmail = updatedUser.pendingEmail;
            setEmail(pendingEmail || updatedUser.email);
            setEmailSaved(true);
            setEmailStatus(
                pendingEmail
                    ? `Confirmation envoyée à ${pendingEmail}. Votre adresse actuelle reste ${updatedUser.email} jusqu'à ce que la modification soit confirmée.`
                    : "E-mail mis à jour.",
            );
            setTimeout(() => setEmailSaved(false), 2000);
        } catch (error: unknown) {
            devLog("[account/mfa] save email failed", { error });
            const message =
                error instanceof Error
                    ? error.message
                    : "Impossible de mettre à jour l'adresse e-mail. Veuillez réessayer.";

            if (isAlreadyRegisteredEmailError(message)) {
                setEmail(user?.pendingEmail || user?.email || "");
                setEmailWarning(message);
                return;
            }

            setEmailStatus(message);
        } finally {
            setIsSavingEmail(false);
        }
    };

    const handleSaveDisplayName = async () => {
        setIsSavingName(true);
        const success = await updateDisplayName(displayName.trim());
        setIsSavingName(false);

        if (success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } else {
            alert("Impossible de mettre à jour le nom affiché. Veuillez réessayer.");
        }
    };

    const handleSaveOrganisation = async () => {
        setIsSavingOrg(true);
        const success = await updateOrganisation(organisation.trim());
        setIsSavingOrg(false);

        if (success) {
            setOrgSaved(true);
            setTimeout(() => setOrgSaved(false), 2000);
        } else {
            alert("Impossible de mettre à jour l'organisation. Veuillez réessayer.");
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-8">
            {/* Profile Settings */}
            <section className="space-y-3">
                <h2 className="text-2xl font-medium font-serif text-gray-900">
                    Profil
                </h2>
                <SettingsSection>
                    <div className="space-y-8 p-4">
                        <div>
                            <FieldLabel className="text-sm text-gray-600">
                                Nom affiché
                            </FieldLabel>
                            <div className="space-y-2">
                                <SettingsTextInput
                                    type="text"
                                    value={displayName}
                                    onChange={(e) =>
                                        setDisplayName(e.target.value)
                                    }
                                    placeholder="Entrez votre nom"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleSaveDisplayName}
                                        disabled={
                                            isSavingName ||
                                            !displayName.trim() ||
                                            saved
                                        }
                                        className="text-xs font-medium text-gray-700 transition-colors hover:text-gray-950 disabled:cursor-not-allowed disabled:text-gray-400"
                                    >
                                        {isSavingName
                                            ? "Enregistrement..."
                                            : saved
                                              ? "Enregistré"
                                              : "Enregistrer"}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <FieldLabel className="text-sm text-gray-600">
                                Organisation
                            </FieldLabel>
                            <div className="space-y-2">
                                <SettingsTextInput
                                    type="text"
                                    value={organisation}
                                    onChange={(e) =>
                                        setOrganisation(e.target.value)
                                    }
                                    placeholder="Entrez votre organisation"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleSaveOrganisation}
                                        disabled={
                                            isSavingOrg ||
                                            organisation.trim() ===
                                                (profile?.organisation ?? "") ||
                                            orgSaved
                                        }
                                        className="text-xs font-medium text-gray-700 transition-colors hover:text-gray-950 disabled:cursor-not-allowed disabled:text-gray-400"
                                    >
                                        {isSavingOrg
                                            ? "Enregistrement..."
                                            : orgSaved
                                              ? "Enregistré"
                                              : "Enregistrer"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </SettingsSection>
            </section>

            {/* Email */}
            <section className="space-y-3">
                <h2 className="text-2xl font-medium font-serif text-gray-900">
                    E-mail
                </h2>
                <SettingsSection>
                    <div className="space-y-2 p-4">
                        <SettingsTextInput
                            type="email"
                            value={email}
                            onChange={(event) => {
                                setEmail(event.target.value);
                                setEmailStatus(null);
                                setEmailWarning(null);
                                setEmailSaved(false);
                            }}
                            placeholder="Entrez votre e-mail"
                        />
                        {emailStatus ? (
                            <p className="text-xs text-gray-500">
                                {emailStatus}
                            </p>
                        ) : user.pendingEmail ? (
                            <p className="text-xs text-gray-500">
                                En attente de confirmation : {user.pendingEmail}
                            </p>
                        ) : null}
                        {emailStatus && (
                            <p className="text-xs text-gray-400">
                                E-mail actuel : {user.email}
                            </p>
                        )}
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={handleSaveEmail}
                                disabled={
                                    isSavingEmail ||
                                    !email.trim() ||
                                    email.trim() === user.email ||
                                    email.trim() === user.pendingEmail ||
                                    emailSaved
                                }
                                className="text-xs font-medium text-gray-700 transition-colors hover:text-gray-950 disabled:cursor-not-allowed disabled:text-gray-400"
                            >
                                {isSavingEmail
                                    ? "Enregistrement..."
                                    : emailSaved
                                      ? "Enregistré"
                                      : "Enregistrer"}
                            </button>
                        </div>
                    </div>
                </SettingsSection>
            </section>

            {/* Plan */}
            <section className="space-y-3">
                <h2 className="text-2xl font-medium font-serif text-gray-900">
                    Formule d'utilisation
                </h2>
                <SettingsSection>
                    <div className="p-4">
                        <p className="text-base font-medium text-gray-500 capitalize">
                            {profile?.tier === "free" || !profile?.tier ? "Gratuit" : profile.tier}
                        </p>
                    </div>
                </SettingsSection>
            </section>

            {/* Danger Zone */}
            <section className="space-y-3">
                <h2 className="text-2xl font-medium font-serif text-red-600">
                    Zone de danger
                </h2>
                <SettingsSection>
                    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-gray-700">
                                Supprimer le compte
                            </p>
                            <p className="text-sm text-gray-500">
                                Supprimez définitivement votre compte et toutes
                                les données associées. Cette action est
                                irréversible.
                            </p>
                        </div>
                        <PillButton
                            tone="danger"
                            size="sm"
                            onClick={() => setDeleteConfirm(true)}
                            disabled={isDeleting}
                            className="w-full shrink-0 sm:w-auto"
                        >
                            <Trash2 className="h-4 w-4 shrink-0" />
                            Supprimer le compte
                        </PillButton>
                    </div>
                </SettingsSection>
            </section>
            <ConfirmPopup
                open={deleteConfirm}
                title="Supprimer le compte ?"
                message="Cette action supprimera définitivement votre compte et toutes les données associées. Cette action est irréversible."
                confirmLabel="Supprimer"
                confirmStatus={isDeleting ? "loading" : "idle"}
                cancelLabel="Annuler"
                onCancel={() => {
                    if (isDeleting) return;
                    setDeleteConfirm(false);
                }}
                onConfirm={() => void handleDeleteAccount()}
            />
            <WarningPopup
                open={!!emailWarning}
                title="Adresse e-mail déjà enregistrée"
                message={emailWarning}
                onClose={() => setEmailWarning(null)}
            />
            <MfaVerificationPopup
                open={accountDeleteMfaOpen}
                onCancel={() => setAccountDeleteMfaOpen(false)}
                onVerified={() => {
                    devLog(
                        "[account/mfa] account delete verification callback",
                    );
                    setAccountDeleteMfaOpen(false);
                    void handleDeleteAccount();
                }}
                title="Vérification à deux facteurs requise"
                message="La suppression du compte est une action sensible. Saisissez un code depuis votre application d'authentification pour continuer."
            />
            <MfaVerificationPopup
                open={emailMfaOpen}
                onCancel={() => setEmailMfaOpen(false)}
                onVerified={() => {
                    devLog("[account/mfa] email verification callback");
                    setEmailMfaOpen(false);
                    void handleSaveEmail();
                }}
                title="Vérification à deux facteurs requise"
                message="La modification de l'e-mail est une action sensible. Saisissez un code depuis votre application d'authentification pour continuer."
            />
        </div>
    );
}

function isAlreadyRegisteredEmailError(message: string) {
    return message
        .toLowerCase()
        .includes("a user with this email address has already been registered");
}
