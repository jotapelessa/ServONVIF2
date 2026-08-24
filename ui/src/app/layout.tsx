import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ServONVIF - Central de Monitoramento",
  description: "Sistema Híbrido de Segurança e Monitoramento IP",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-background text-foreground min-h-screen flex flex-col antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
