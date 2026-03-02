import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Amicale S2A",
    description: "Gestion des cotisations et finances de l'Amicale S2A",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="fr">
            <body className="antialiased">{children}</body>
        </html>
    );
}
