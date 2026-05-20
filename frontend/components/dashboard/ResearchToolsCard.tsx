/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import type { ScanReport } from "@/types";

type Props = {
  report: ScanReport;
};

type ResearchTool = {
  name: string;
  domain: string;
  description: string;
  mark: string;
  accent: string;
  iconDomain?: string;
  href: (input: { hostname: string; normalizedUrl: string; encodedHost: string; encodedUrl: string }) => string;
};

const RESEARCH_TOOLS: ResearchTool[] = [
  {
    name: "Hudson Rock",
    domain: "hudsonrock.com",
    description: "Identify Infostealer infection data related to domains and emails",
    mark: "HR",
    accent: "#f6c945",
    href: () => "https://www.hudsonrock.com/",
  },
  {
    name: "SSL Labs Test",
    domain: "ssllabs.com",
    description: "Analyzes the SSL configuration of a server and grades it",
    mark: "SSL",
    accent: "#f43f3f",
    iconDomain: "qualys.com",
    href: ({ encodedHost }) => `https://www.ssllabs.com/ssltest/analyze.html?d=${encodedHost}`,
  },
  {
    name: "Virus Total",
    domain: "virustotal.com",
    description: "Checks a URL against multiple antivirus engines",
    mark: "VT",
    accent: "#4169ff",
    iconDomain: "virustotal.com",
    href: ({ encodedHost }) => `https://www.virustotal.com/gui/domain/${encodedHost}`,
  },
  {
    name: "Shodan",
    domain: "shodan.io",
    description: "Search engine for Internet-connected devices",
    mark: "SH",
    accent: "#ff6b7a",
    href: ({ encodedHost }) => `https://www.shodan.io/search?query=${encodedHost}`,
  },
  {
    name: "Archive",
    domain: "archive.org",
    description: "View previous versions of a site via the Internet Archive",
    mark: "AR",
    accent: "#dfe3e9",
    href: ({ normalizedUrl }) => `https://web.archive.org/web/*/${normalizedUrl}`,
  },
  {
    name: "URLScan",
    domain: "urlscan.io",
    description: "Scans a URL and provides information about the page",
    mark: "US",
    accent: "#e65f3f",
    href: ({ encodedHost }) => `https://urlscan.io/search/#${encodedHost}`,
  },
  {
    name: "Sucuri SiteCheck",
    domain: "sitecheck.sucuri.net",
    description: "Checks a URL against blacklists and known threats",
    mark: "SC",
    accent: "#008c9b",
    href: ({ encodedUrl }) => `https://sitecheck.sucuri.net/results/${encodedUrl}`,
  },
  {
    name: "Domain Tools",
    domain: "whois.domaintools.com",
    description: "Run a WhoIs lookup on a domain",
    mark: "DT",
    accent: "#7d8795",
    href: ({ encodedHost }) => `https://whois.domaintools.com/${encodedHost}`,
  },
  {
    name: "NS Lookup",
    domain: "nslookup.io",
    description: "View DNS records for a domain",
    mark: "NS",
    accent: "#6d28d9",
    href: ({ encodedHost }) => `https://www.nslookup.io/domains/${encodedHost}/dns-records/`,
  },
  {
    name: "DNS Checker",
    domain: "dnschecker.org",
    description: "Check global DNS propagation across multiple servers",
    mark: "DC",
    accent: "#67d9ef",
    href: ({ encodedHost }) => `https://dnschecker.org/all-dns-records-of-domain.php?query=${encodedHost}`,
  },
  {
    name: "Censys",
    domain: "search.censys.io",
    description: "Lookup hosts associated with a domain",
    mark: "CY",
    accent: "#ff7a1a",
    href: ({ encodedHost }) => `https://search.censys.io/search?resource=hosts&q=${encodedHost}`,
  },
  {
    name: "Page Speed Insights",
    domain: "developers.google.com",
    description: "Checks the performance, accessibility and SEO of a page on mobile + desktop",
    mark: "PS",
    accent: "#65a7ff",
    iconDomain: "pagespeed.web.dev",
    href: ({ encodedUrl }) => `https://pagespeed.web.dev/analysis?url=${encodedUrl}`,
  },
  {
    name: "Built With",
    domain: "builtwith.com",
    description: "View the tech stack of a website",
    mark: "BW",
    accent: "#0b7f2a",
    href: ({ encodedHost }) => `https://builtwith.com/${encodedHost}`,
  },
  {
    name: "DNS Dumpster",
    domain: "dnsdumpster.com",
    description: "DNS recon tool, to map out a domain from it's DNS records",
    mark: "DD",
    accent: "#00d12f",
    href: () => "https://dnsdumpster.com/",
  },
  {
    name: "BGP Tools",
    domain: "bgp.tools",
    description: "View realtime BGP data for any ASN, Prefix or DNS",
    mark: "BG",
    accent: "#f5f5f5",
    href: ({ encodedHost }) => `https://bgp.tools/dns/${encodedHost}`,
  },
  {
    name: "Similar Web",
    domain: "similarweb.com",
    description: "View approx traffic and engagement stats for a website",
    mark: "SW",
    accent: "#ff7a1a",
    href: ({ encodedHost }) => `https://www.similarweb.com/website/${encodedHost}/`,
  },
  {
    name: "Blacklist Checker",
    domain: "blacklistchecker.com",
    description: "Check if a domain, IP or email is present on the top blacklists",
    mark: "BL",
    accent: "#2388ff",
    href: ({ encodedHost }) => `https://blacklistchecker.com/check/${encodedHost}`,
  },
  {
    name: "Cloudflare Radar",
    domain: "radar.cloudflare.com",
    description: "View traffic source locations for a domain through Cloudflare",
    mark: "CF",
    accent: "#ff9d2e",
    href: ({ encodedHost }) => `https://radar.cloudflare.com/domains/domain/${encodedHost}`,
  },
  {
    name: "Mozilla HTTP Observatory",
    domain: "developer.mozilla.org",
    description: "Assesses website security posture by analyzing various security headers and practices",
    mark: "MO",
    accent: "#f5f5f5",
    iconDomain: "developer.mozilla.org",
    href: ({ encodedHost }) => `https://developer.mozilla.org/en-US/observatory/analyze?host=${encodedHost}`,
  },
  {
    name: "AbuseIPDB",
    domain: "abuseipdb.com",
    description: "Checks a website against Zscaler's dynamic risk scoring engine",
    mark: "AB",
    accent: "#ff334e",
    href: ({ encodedHost }) => `https://www.abuseipdb.com/check/${encodedHost}`,
  },
  {
    name: "IBM X-Force Exchange",
    domain: "exchange.xforce.ibmcloud.com",
    description: "View shared human and machine generated threat intelligence",
    mark: "XF",
    accent: "#6b879d",
    href: ({ encodedUrl }) => `https://exchange.xforce.ibmcloud.com/url/${encodedUrl}`,
  },
  {
    name: "URLVoid",
    domain: "urlvoid.com",
    description: "Checks a website across 30+ blocklist engines and website reputation services",
    mark: "UV",
    accent: "#ff9800",
    href: ({ encodedHost }) => `https://www.urlvoid.com/scan/${encodedHost}/`,
  },
  {
    name: "URLhaus",
    domain: "urlhaus.abuse.ch",
    description: "Checks if the site is in URLhaus's malware URL exchange",
    mark: "UH",
    accent: "#c01818",
    href: ({ encodedHost }) => `https://urlhaus.abuse.ch/browse.php?search=${encodedHost}`,
  },
  {
    name: "ANY.RUN",
    domain: "any.run",
    description: "An interactive malware and web sandbox",
    mark: "AR",
    accent: "#39d7ff",
    href: () => "https://any.run/",
  },
];

function faviconUrl(tool: ResearchTool) {
  return `https://www.google.com/s2/favicons?domain=${tool.iconDomain ?? tool.domain}&sz=64`;
}

function ToolIcon({ tool }: { tool: ResearchTool }) {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className="h-10 w-10 shrink-0 border border-white/10 bg-[#080A0B] flex items-center justify-center overflow-hidden"
      style={{ boxShadow: `inset 0 0 0 1px ${tool.accent}55` }}
      aria-hidden="true"
    >
      {failed ? (
        <span
          className="h-full w-full flex items-center justify-center font-mono text-[11px] font-bold text-[#070B0F]"
          style={{ backgroundColor: tool.accent }}
        >
          {tool.mark}
        </span>
      ) : (
        <img
          src={faviconUrl(tool)}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-8 w-8 object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}

export function ResearchToolsCard({ report }: Props) {
  const hostname = report.hostname || report.target;
  const normalizedUrl = report.normalizedUrl || `https://${hostname}`;
  const encodedHost = encodeURIComponent(hostname);
  const encodedUrl = encodeURIComponent(normalizedUrl);
  const hrefInput = { hostname, normalizedUrl, encodedHost, encodedUrl };

  return (
    <section className="bg-[#202322] border border-primary-fixed/10 p-3 md:p-4">
      <h2 className="font-mono text-xl md:text-2xl font-bold text-primary-fixed mb-5">
        External Tools for Further Research
      </h2>

      <div className="grid gap-1.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,20rem),1fr))]">
        {RESEARCH_TOOLS.map((tool) => (
          <a
            key={tool.name}
            href={tool.href(hrefInput)}
            target="_blank"
            rel="noreferrer"
            className="group bg-[#0D0F10] border border-black shadow-[3px_3px_0_#050505] min-h-[92px] p-2 hover:border-primary-fixed/50 hover:bg-[#111618] transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-mono text-[15px] leading-tight font-bold text-white truncate">
                  {tool.name}
                </h3>
                <span className="font-mono text-[12px] leading-tight text-primary-fixed underline underline-offset-2 truncate block">
                  {tool.domain}
                </span>
              </div>
              <span className="font-mono text-[10px] text-primary-fixed/20 group-hover:text-primary-fixed/70">
                EXT
              </span>
            </div>

            <div className="mt-2 flex items-center gap-3">
              <ToolIcon tool={tool} />
              <p className="font-mono text-[12px] leading-[1.1rem] text-[#d7e8ff]">
                {tool.description}
              </p>
            </div>
          </a>
        ))}
      </div>

      <p className="font-mono text-[11px] leading-relaxed text-white/45 mt-7">
        These tools are not affiliated with XyaVora-Scan. Please use them at your own risk.
      </p>
    </section>
  );
}
