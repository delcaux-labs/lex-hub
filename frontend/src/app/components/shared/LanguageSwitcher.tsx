"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Check } from "lucide-react";
import { useUserProfile } from "@/app/contexts/UserProfileContext";
import { locales, type Locale } from "@/i18n/config";
import { cn } from "@/app/lib/utils";

interface LanguageSwitcherProps {
    variant?: "segmented" | "dropdown-item" | "settings";
    className?: string;
}

export function LanguageSwitcher({
    variant = "segmented",
    className,
}: LanguageSwitcherProps) {
    const locale = useLocale() as Locale;
    const t = useTranslations("language");
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { updatePreferredLocale } = useUserProfile();

    const handleLocaleChange = (newLocale: Locale) => {
        if (newLocale === locale) return;

        startTransition(async () => {
            await updatePreferredLocale(newLocale);
            router.refresh();
        });
    };

    if (variant === "dropdown-item") {
        return (
            <div className={cn("px-3 py-2 text-xs", className)}>
                <div className="flex items-center justify-between text-gray-500 mb-1.5 font-medium">
                    <span className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5" />
                        {t("selectLanguage")}
                    </span>
                </div>
                <div className="flex items-center gap-1 bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/60">
                    {locales.map((loc) => {
                        const active = loc === locale;
                        return (
                            <button
                                key={loc}
                                type="button"
                                onClick={() => handleLocaleChange(loc)}
                                disabled={isPending}
                                className={cn(
                                    "flex-1 py-1 px-2 rounded-md text-xs font-medium transition-all text-center",
                                    active
                                        ? "bg-white text-gray-900 shadow-sm font-semibold"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-white/50",
                                    isPending && "opacity-60 cursor-wait",
                                )}
                            >
                                {loc.toUpperCase()}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (variant === "settings") {
        return (
            <div
                className={cn(
                    "flex items-center justify-between py-3",
                    className,
                )}
            >
                <div className="space-y-0.5">
                    <p className="text-sm font-medium text-gray-700">
                        {t("selectLanguage")}
                    </p>
                    <p className="text-xs text-gray-500">
                        {locale === "fr"
                            ? "Choisissez votre langue préférée pour l'interface."
                            : "Choose your preferred interface language."}
                    </p>
                </div>
                <div className="inline-flex rounded-xl bg-gray-100/90 p-1 border border-gray-200/70 shadow-inner">
                    {locales.map((loc) => {
                        const active = loc === locale;
                        return (
                            <button
                                key={loc}
                                type="button"
                                onClick={() => handleLocaleChange(loc)}
                                disabled={isPending}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                                    active
                                        ? "bg-white text-gray-950 shadow-[0_1px_3px_rgba(0,0,0,0.08)] font-semibold"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-white/40",
                                    isPending && "opacity-60 cursor-wait",
                                )}
                            >
                                {active && <Check className="h-3 w-3" />}
                                {t(loc)}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Default "segmented"
    return (
        <div
            className={cn(
                "inline-flex items-center rounded-full bg-gray-100/80 p-0.5 border border-gray-200/60 shadow-sm",
                className,
            )}
            role="group"
            aria-label={t("selectLanguage")}
        >
            {locales.map((loc) => {
                const active = loc === locale;
                return (
                    <button
                        key={loc}
                        type="button"
                        onClick={() => handleLocaleChange(loc)}
                        disabled={isPending}
                        className={cn(
                            "px-2.5 py-1 text-xs font-medium rounded-full transition-all",
                            active
                                ? "bg-white text-gray-900 shadow-sm font-semibold"
                                : "text-gray-500 hover:text-gray-900 hover:bg-white/40",
                            isPending && "opacity-60 cursor-wait",
                        )}
                        title={t(loc)}
                    >
                        {loc.toUpperCase()}
                    </button>
                );
            })}
        </div>
    );
}
