import type { TechStackItem, TechCategory } from "@/types";
import { DetailPanel } from "./DetailPanel";
import { SourceQualityBadge, type SourceQuality } from "./SourceQualityBadge";

interface Props {
  techStack: TechStackItem[];
}

const CATEGORY_PREFIX: Record<TechCategory, string> = {
  "Web Server":           "SRV",
  "CDN":                  "CDN",
  "Hosting":              "HST",
  "Backend Framework":    "BEF",
  "JavaScript Framework": "JS",
  "CSS Framework":        "CSS",
  "CMS":                  "CMS",
  "Analytics":            "ANL",
  "Database":             "DB",
  "Other":                "EXT",
};

const CONFIDENCE_COLOR: Record<TechStackItem["confidence"], string> = {
  high:   "text-primary-fixed",
  medium: "text-secondary-container",
  low:    "text-primary-fixed/65",
};

type TechIconMeta = {
  label: string;
  cls: string;
  logo?: {
    slug: string;
    color: string;
  };
};

const CATEGORY_ICON: Record<TechCategory, TechIconMeta> = {
  "Web Server":           { label: "S",  cls: "bg-[#24433b] text-primary-fixed border-primary-fixed/25" },
  "CDN":                  { label: "E",  cls: "bg-[#18354a] text-secondary-fixed border-secondary-fixed/25" },
  "Hosting":              { label: "H",  cls: "bg-[#302946] text-[#c9b7ff] border-[#c9b7ff]/25" },
  "Backend Framework":    { label: "B",  cls: "bg-[#403220] text-[#ffce7a] border-[#ffce7a]/25" },
  "JavaScript Framework": { label: "JS", cls: "bg-[#3f3915] text-[#f7df1e] border-[#f7df1e]/25" },
  "CSS Framework":        { label: "C",  cls: "bg-[#15384a] text-[#72d8ff] border-[#72d8ff]/25" },
  "CMS":                  { label: "M",  cls: "bg-[#342234] text-[#ff9ce8] border-[#ff9ce8]/25" },
  "Analytics":            { label: "A",  cls: "bg-[#29371b] text-[#a9e870] border-[#a9e870]/25" },
  "Database":             { label: "D",  cls: "bg-[#23354a] text-[#9ed0ff] border-[#9ed0ff]/25" },
  "Other":                { label: "*",  cls: "bg-[#2a2f31] text-white/70 border-white/15" },
};

const TECH_ICON: Record<string, TechIconMeta> = {
  "nginx": { label: "N", cls: "bg-[#163b25] text-[#5ee687] border-[#5ee687]/25", logo: { slug: "nginx", color: "009639" } },
  "Apache": { label: "A", cls: "bg-[#3d2025] text-[#ff8e96] border-[#ff8e96]/25", logo: { slug: "apache", color: "D22128" } },
  "Cloudflare": { label: "CF", cls: "bg-[#402a12] text-[#f48120] border-[#f48120]/30", logo: { slug: "cloudflare", color: "F38020" } },
  "AWS CloudFront": { label: "AWS", cls: "bg-[#3b2c12] text-[#ff9900] border-[#ff9900]/30", logo: { slug: "amazoncloudfront", color: "FF9900" } },
  "Fastly": { label: "F", cls: "bg-[#3a181b] text-[#ff6b78] border-[#ff6b78]/25", logo: { slug: "fastly", color: "FF282D" } },
  "Vercel": { label: "V", cls: "bg-black text-white border-white/25", logo: { slug: "vercel", color: "FFFFFF" } },
  "Netlify": { label: "N", cls: "bg-[#0b3636] text-[#00c7b7] border-[#00c7b7]/30", logo: { slug: "netlify", color: "00C7B7" } },
  "Webflow": { label: "W", cls: "bg-[#102a52] text-[#6bb8ff] border-[#6bb8ff]/30", logo: { slug: "webflow", color: "4353FF" } },
  "Wix": { label: "W", cls: "bg-[#102a52] text-[#8ebdff] border-[#8ebdff]/30", logo: { slug: "wix", color: "0C6EFC" } },
  "Squarespace": { label: "S", cls: "bg-black text-white border-white/25", logo: { slug: "squarespace", color: "FFFFFF" } },
  "Framer": { label: "F", cls: "bg-[#151525] text-[#9ea8ff] border-[#9ea8ff]/30", logo: { slug: "framer", color: "0055FF" } },
  "Shopify": { label: "S", cls: "bg-[#223a17] text-[#95bf47] border-[#95bf47]/30", logo: { slug: "shopify", color: "7AB55C" } },
  "WordPress": { label: "WP", cls: "bg-[#112f45] text-[#8dc8e8] border-[#8dc8e8]/30", logo: { slug: "wordpress", color: "21759B" } },
  "WooCommerce": { label: "WC", cls: "bg-[#35234a] text-[#c6a7ff] border-[#c6a7ff]/30", logo: { slug: "woocommerce", color: "96588A" } },
  "Drupal": { label: "D", cls: "bg-[#143552] text-[#76b7e8] border-[#76b7e8]/30", logo: { slug: "drupal", color: "0678BE" } },
  "Joomla": { label: "J", cls: "bg-[#33321a] text-[#f2d35b] border-[#f2d35b]/30", logo: { slug: "joomla", color: "F44321" } },
  "React": { label: "R", cls: "bg-[#0d3140] text-[#61dafb] border-[#61dafb]/30", logo: { slug: "react", color: "61DAFB" } },
  "Next.js": { label: "N", cls: "bg-black text-white border-white/25", logo: { slug: "nextdotjs", color: "FFFFFF" } },
  "Vue.js": { label: "V", cls: "bg-[#173c2f] text-[#42b883] border-[#42b883]/30", logo: { slug: "vuedotjs", color: "4FC08D" } },
  "Nuxt.js": { label: "N", cls: "bg-[#123d2c] text-[#00dc82] border-[#00dc82]/30", logo: { slug: "nuxtdotjs", color: "00DC82" } },
  "Angular": { label: "A", cls: "bg-[#3d1720] text-[#ff6680] border-[#ff6680]/30", logo: { slug: "angular", color: "DD0031" } },
  "Svelte": { label: "S", cls: "bg-[#3d2116] text-[#ff7a45] border-[#ff7a45]/30", logo: { slug: "svelte", color: "FF3E00" } },
  "SvelteKit": { label: "SK", cls: "bg-[#3d2116] text-[#ff7a45] border-[#ff7a45]/30", logo: { slug: "svelte", color: "FF3E00" } },
  "Astro": { label: "A", cls: "bg-[#291f3f] text-[#d5b4ff] border-[#d5b4ff]/30", logo: { slug: "astro", color: "BC52EE" } },
  "Vite": { label: "V", cls: "bg-[#282447] text-[#c7b9ff] border-[#c7b9ff]/30", logo: { slug: "vite", color: "646CFF" } },
  "jQuery": { label: "JQ", cls: "bg-[#143152] text-[#8bc8ff] border-[#8bc8ff]/30", logo: { slug: "jquery", color: "0769AD" } },
  "Bootstrap": { label: "B", cls: "bg-[#2f2048] text-[#caa8ff] border-[#caa8ff]/30", logo: { slug: "bootstrap", color: "7952B3" } },
  "Tailwind CSS": { label: "TW", cls: "bg-[#123d46] text-[#38bdf8] border-[#38bdf8]/30", logo: { slug: "tailwindcss", color: "06B6D4" } },
  "Laravel": { label: "L", cls: "bg-[#401b18] text-[#ff6b5f] border-[#ff6b5f]/30", logo: { slug: "laravel", color: "FF2D20" } },
  "Django": { label: "D", cls: "bg-[#113728] text-[#73d39c] border-[#73d39c]/30", logo: { slug: "django", color: "44B78B" } },
  "PHP": { label: "P", cls: "bg-[#252b54] text-[#b8c2ff] border-[#b8c2ff]/30", logo: { slug: "php", color: "777BB4" } },
  "Express": { label: "EX", cls: "bg-[#222] text-white/80 border-white/20", logo: { slug: "express", color: "FFFFFF" } },
  "Google Analytics": { label: "GA", cls: "bg-[#3d2b12] text-[#f9ab00] border-[#f9ab00]/30", logo: { slug: "googleanalytics", color: "E37400" } },
  "Google Tag Manager": { label: "GT", cls: "bg-[#123047] text-[#8ab4f8] border-[#8ab4f8]/30", logo: { slug: "googletagmanager", color: "246FDB" } },
  "Facebook Pixel": { label: "FB", cls: "bg-[#142c54] text-[#8bb7ff] border-[#8bb7ff]/30", logo: { slug: "facebook", color: "0866FF" } },
  "Microsoft Clarity": { label: "CL", cls: "bg-[#122f4d] text-[#8fc8ff] border-[#8fc8ff]/30", logo: { slug: "microsoftclarity", color: "0078D4" } },
  "Stripe": { label: "ST", cls: "bg-[#252553] text-[#b3b8ff] border-[#b3b8ff]/30", logo: { slug: "stripe", color: "635BFF" } },
  "PayPal": { label: "PP", cls: "bg-[#143152] text-[#8bc8ff] border-[#8bc8ff]/30", logo: { slug: "paypal", color: "003087" } },
  "Sentry": { label: "SE", cls: "bg-[#2d2044] text-[#c7a8ff] border-[#c7a8ff]/30", logo: { slug: "sentry", color: "362D59" } },
  "Intercom": { label: "IC", cls: "bg-[#102f4d] text-[#7dc4ff] border-[#7dc4ff]/30", logo: { slug: "intercom", color: "6AFDEF" } },
  "Zendesk": { label: "ZD", cls: "bg-[#12342c] text-[#89e6c7] border-[#89e6c7]/30", logo: { slug: "zendesk", color: "03363D" } },
  "HubSpot": { label: "HS", cls: "bg-[#3d2114] text-[#ff9b6b] border-[#ff9b6b]/30", logo: { slug: "hubspot", color: "FF7A59" } },
  "Crisp": { label: "CR", cls: "bg-[#102b4a] text-[#80c7ff] border-[#80c7ff]/30", logo: { slug: "crisp", color: "1E88E5" } },
  "Tidio": { label: "TD", cls: "bg-[#21341b] text-[#a7e87a] border-[#a7e87a]/30", logo: { slug: "tidio", color: "17C95F" } },
  "Firebase": { label: "FB", cls: "bg-[#3b2d11] text-[#ffcb63] border-[#ffcb63]/30", logo: { slug: "firebase", color: "FFCA28" } },
  "Supabase": { label: "SB", cls: "bg-[#123527] text-[#68e5a2] border-[#68e5a2]/30", logo: { slug: "supabase", color: "3ECF8E" } },
};

const CATEGORY_ORDER: TechCategory[] = [
  "Web Server", "CDN", "Hosting",
  "Backend Framework", "JavaScript Framework", "CSS Framework",
  "CMS", "Analytics", "Database", "Other",
];

function getTechIcon(tech: TechStackItem) {
  return TECH_ICON[tech.name] ?? CATEGORY_ICON[tech.category];
}

function iconUrl(icon: TechIconMeta) {
  return icon.logo
    ? `https://cdn.simpleicons.org/${icon.logo.slug}/${icon.logo.color}`
    : null;
}

function sourceQuality(sources?: string[]): SourceQuality {
  if (!sources || sources.length === 0) return "estimated";
  if (sources.includes("header")) return "header";
  if (sources.includes("html") || sources.includes("asset-url") || sources.includes("asset-body") || sources.includes("meta")) return "page";
  if (sources.includes("cookie")) return "cookie";
  if (sources.includes("inferred")) return "inferred";
  return "estimated";
}

export function TechStackCard({ techStack }: Props) {
  const grouped = CATEGORY_ORDER.reduce<Record<string, TechStackItem[]>>(
    (acc, cat) => {
      const items = techStack.filter((t) => t.category === cat);
      if (items.length) acc[cat] = items;
      return acc;
    },
    {},
  );

  const categories = Object.keys(grouped) as TechCategory[];
  const detailItems = techStack.map((tech) => ({
    label: tech.name,
    value: [
      `category: ${tech.category}`,
      `confidence: ${tech.confidence}`,
      tech.version ? `version: ${tech.version}` : null,
      tech.sources?.length ? `sources: ${tech.sources.join(" + ")}` : null,
      tech.confidenceReason ? `confidence_reason: ${tech.confidenceReason}` : null,
      tech.evidence?.length ? `evidence: ${tech.evidence.join(" | ")}` : null,
    ].filter(Boolean).join("\n"),
  }));

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Tech Stack
        </h3>
        <span className="font-mono text-[11px] text-white/70">[FINGERPRINT]</span>
      </div>

      {techStack.length === 0 ? (
        <p className="font-mono text-sm text-on-surface-variant/40 px-5 pb-5 flex-1">
          [-] No technologies detected
        </p>
      ) : (
        <div className="flex max-h-[320px] flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5 pr-3">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="font-mono text-sm text-white font-bold mb-2">
                {cat}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {grouped[cat].map((tech) => {
                  const prefix = CATEGORY_PREFIX[tech.category];
                  const colorCls = CONFIDENCE_COLOR[tech.confidence];
                  const sources = tech.sources?.slice(0, 3) ?? [];
                  const evidence = tech.evidence?.join("\n");
                  const icon = getTechIcon(tech);
                  const externalIconUrl = iconUrl(icon);
                  return (
                    <span
                      key={tech.name}
                      title={evidence}
                      className={`inline-flex max-w-full items-start gap-2 border border-primary-fixed/20 bg-[#151918] px-2 py-1 font-mono text-[11px] hover:border-primary-fixed/45 transition-colors ${colorCls}`}
                    >
                      <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center border font-mono text-[9px] font-bold leading-none ${icon.cls}`}>
                        {externalIconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={externalIconUrl}
                            alt=""
                            className="h-4 w-4 object-contain"
                            loading="lazy"
                          />
                        ) : (
                          icon.label
                        )}
                      </span>
                      <span className="min-w-0 flex flex-col gap-0.5">
                        <span className="flex min-w-0 items-center gap-1">
                          <span className="text-[9px] text-primary-fixed/60">[{prefix}]</span>
                          <span className="truncate">{tech.name}</span>
                          {tech.version && (
                            <span className="shrink-0 text-[9px] text-primary-fixed/55"> v{tech.version}</span>
                          )}
                        </span>
                        {sources.length > 0 && (
                          <span className="flex flex-wrap items-center gap-1">
                            <SourceQualityBadge source={sourceQuality(sources)} />
                            <span className="border border-white/10 px-1.5 py-0.5 text-[9px] leading-none text-white/55">
                              {tech.confidence.toUpperCase()}
                            </span>
                            <span className="max-w-[140px] truncate text-[9px] leading-none text-white/45" title={sources.join(" + ")}>
                              {sources.join(" + ")}
                            </span>
                          </span>
                        )}
                        {tech.confidenceReason && (
                          <span className="max-w-[220px] truncate text-[9px] leading-none text-[#d7e8ff]/45" title={tech.confidenceReason}>
                            {tech.confidenceReason}
                          </span>
                        )}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <DetailPanel items={detailItems} />
    </div>
  );
}
