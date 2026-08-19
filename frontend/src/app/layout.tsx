import type { Metadata } from "next";
import { Inter, EB_Garamond } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { Providers } from "@/app/components/providers";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
    variable: "--font-eb-garamond",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
    metadataBase: new URL("https://app.mikeoss.com"),
    title: "LexHub - Plateforme juridique IA",
    description:
        "Plateforme d'analyse de documents juridiques et de révision de contrats propulsée par l'IA.",
    icons: {
        icon: [
            { url: "/icon.svg", type: "image/svg+xml" },
            { url: "/favicon.ico" },
        ],
        apple: "/apple-touch-icon.png",
    },
    openGraph: {
        type: "website",
        url: "https://app.mikeoss.com",
        siteName: "LexHub",
        title: "LexHub - Plateforme juridique IA",
        description:
            "Plateforme d'analyse de documents juridiques et de révision de contrats propulsée par l'IA.",
        images: [
            {
                url: "/link-image.jpg",
                width: 1200,
                height: 651,
                alt: "LexHub",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "LexHub - Plateforme juridique IA",
        description:
            "Plateforme d'analyse de documents juridiques et de révision de contrats propulsée par l'IA.",
        images: ["/link-image.jpg"],
    },
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html lang={locale}>
            <body
                className={`${inter.variable} ${ebGaramond.variable} font-sans antialiased`}
            >
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <Providers>{children}</Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
