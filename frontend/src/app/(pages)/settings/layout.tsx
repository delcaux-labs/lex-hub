"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/app/contexts/AuthContext";
import { settingsTabButtonClassName } from "./settingsStyles";

interface TabDef {
    id: string;
    label: string;
    href: string;
}

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const tSettings = useTranslations("settings");
    const router = useRouter();
    const pathname = usePathname();
    const { isAuthenticated, authLoading } = useAuth();

    const tabs: TabDef[] = useMemo(
        () => [
            { id: "account", label: tSettings("tabs.account"), href: "/settings" },
            {
                id: "features",
                label: tSettings("tabs.features"),
                href: "/settings/features",
            },
            {
                id: "privacy-data",
                label: tSettings("tabs.privacyData"),
                href: "/settings/privacy-data",
            },
            {
                id: "security",
                label: tSettings("tabs.security"),
                href: "/settings/security",
            },
            {
                id: "models",
                label: tSettings("tabs.models"),
                href: "/settings/models",
            },
            {
                id: "api-keys",
                label: tSettings("tabs.apiKeys"),
                href: "/settings/api-keys",
            },
            {
                id: "connectors",
                label: tSettings("tabs.connectors"),
                href: "/settings/connectors",
            },
        ],
        [tSettings],
    );

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, authLoading, router]);

    if (authLoading) {
        return (
            <div className="h-dvh flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="flex h-full flex-col overflow-y-auto">
            <header className="mx-auto flex h-16 w-full max-w-5xl shrink-0 items-end px-6 pb-2 md:h-24 md:pb-4">
                <h1 className="text-4xl font-medium font-eb-garamond">
                    {tSettings("title")}
                </h1>
            </header>

            <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-10 pt-4 md:pt-6">
                <div className="grid grid-cols-1 gap-y-6 md:grid-cols-[224px_minmax(0,1fr)] md:gap-x-10">
                    <nav
                        aria-label={tSettings("title")}
                        className="z-10 -ml-3 min-w-0 self-start md:sticky md:top-4"
                    >
                        <div className="-m-1 min-w-0 p-1">
                            <div className="-m-1 min-w-0 overflow-x-auto overflow-y-hidden p-1">
                                <ul className="mb-0 flex gap-1 md:flex-col">
                                    {tabs.map((tab) => {
                                        const active =
                                            pathname === tab.href ||
                                            (tab.href !== "/settings" &&
                                                pathname.startsWith(tab.href));
                                        return (
                                            <li key={tab.id}>
                                                <button
                                                    type="button"
                                                    aria-current={
                                                        active
                                                            ? "page"
                                                            : undefined
                                                    }
                                                    onClick={() =>
                                                        router.push(tab.href)
                                                    }
                                                    className={settingsTabButtonClassName(
                                                        active,
                                                    )}
                                                >
                                                    {tab.label}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    </nav>

                    <div className="min-w-0 outline-none">{children}</div>
                </div>
            </main>
        </div>
    );
}
