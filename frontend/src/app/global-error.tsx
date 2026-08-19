"use client";

import { useEffect } from "react";
import { PillButton } from "@/app/components/ui/pill-button";

export default function GlobalError({
    error,
}: {
    error: Error & { digest?: string };
}) {
    useEffect(() => {
        console.error("Global error:", error);
    }, [error]);

    return (
        <html lang="fr">
            <head>
                <title>Une erreur est survenue – LexHub</title>
                <style>{`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=EB+Garamond:wght@400;500&display=swap');
                    
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    
                    body {
                        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                        background-color: #ffffff;
                        color: #111;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .error-container {
                        text-align: center;
                        max-width: 480px;
                        padding: 2rem;
                    }

                    .error-title {
                        font-family: 'EB Garamond', Georgia, serif;
                        font-size: 1.75rem;
                        font-weight: 400;
                        color: #111;
                        margin-bottom: 0.75rem;
                    }

                    .error-message {
                        font-size: 0.9375rem;
                        color: #6b7280;
                        line-height: 1.6;
                        margin-bottom: 2rem;
                    }

                    .btn-back { font-family: 'Inter', sans-serif; }
                `}</style>
            </head>
            <body>
                <div className="error-container">
                    <h1 className="error-title">Une erreur est survenue</h1>
                    <p className="error-message">
                        Nous avons rencontré une erreur inattendue. Cet
                        événement a été enregistré et notre équipe va
                        l&apos;examiner.
                    </p>
                    <PillButton
                        tone="blue"
                        size="normal"
                        className="btn-back"
                        onClick={() => window.history.back()}
                    >
                        Retour
                    </PillButton>
                </div>
            </body>
        </html>
    );
}
