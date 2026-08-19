import Link from "next/link";
import { PillButton } from "@/app/components/ui/pill-button";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
            <div className="text-center max-w-md">
                <h1 className="text-3xl font-eb-garamond font-light text-gray-900 mb-3">
                    Page introuvable
                </h1>
                <p className="text-[0.9375rem] text-gray-500 leading-relaxed mb-8">
                    La page que vous recherchez n&apos;existe pas ou a été
                    déplacée.
                </p>

                <PillButton asChild tone="black" size="normal">
                    <Link href="/">Retour à l&apos;accueil</Link>
                </PillButton>
            </div>
        </div>
    );
}
