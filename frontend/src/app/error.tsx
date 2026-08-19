"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PillButton } from "@/app/components/ui/pill-button";

export default function Error({
    error,
}: {
    error: Error & { digest?: string };
}) {
    useEffect(() => {
        console.error("App error:", error);
    }, [error]);

    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <h1 className="text-3xl font-eb-garamond font-light text-gray-900 mb-3">
                    Une erreur est survenue
                </h1>
                <p className="text-[0.9375rem] text-gray-500 leading-relaxed mb-8">
                    Nous avons rencontré une erreur inattendue. Cet événement a
                    été enregistré et notre équipe va l&apos;examiner.
                </p>

                <PillButton asChild tone="black" size="normal">
                    <Link href="/">Accueil</Link>
                </PillButton>
            </div>
        </div>
    );
}
