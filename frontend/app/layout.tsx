import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "XyaVora-Scan — Analyze your domain security posture in seconds.",
  description:
    "Analyze DNS, SSL, HTTP headers, WHOIS, tech stack, cookies and risk signals in seconds. A high-performance OSINT tool built for security analysis.",
  keywords: ["domain security", "DNS analysis", "SSL check", "security headers", "OSINT"],
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
