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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=optional"
          rel="stylesheet"
        />
      </head>
      <body
        className="h-full bg-background text-on-surface antialiased overflow-x-hidden"
      >
        {children}
      </body>
    </html>
  );
}
