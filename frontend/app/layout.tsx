import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XyaVora-Scan - Public website security scanner",
  description:
    "Scan any public domain without an account. XyaVora-Scan renders live DNS, TLS, HTTP, header, WHOIS, tech stack, screenshot, and risk findings as modules complete.",
  keywords: ["domain security", "DNS analysis", "TLS check", "security headers", "OSINT", "website scanner"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body
        className="h-full bg-background text-on-surface antialiased overflow-x-hidden"
      >
        {children}
      </body>
    </html>
  );
}
