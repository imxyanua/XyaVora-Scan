import type { TechStackItem, TechCategory } from "@/types";

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

const CATEGORY_ORDER: TechCategory[] = [
  "Web Server", "CDN", "Hosting",
  "Backend Framework", "JavaScript Framework", "CSS Framework",
  "CMS", "Analytics", "Database", "Other",
];

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

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex flex-col">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Tech Stack
        </h3>
        <span className="font-mono text-[11px] text-white/70">[FINGERPRINT]</span>
      </div>

      {techStack.length === 0 ? (
        <p className="font-mono text-sm text-on-surface-variant/40 px-5 pb-5">
          [-] No technologies detected
        </p>
      ) : (
        <div className="px-5 pb-5 flex flex-col gap-4 max-h-[420px] overflow-y-auto">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="font-mono text-sm text-white font-bold mb-2">
                {cat}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {grouped[cat].map((tech) => {
                  const prefix = CATEGORY_PREFIX[tech.category];
                  const colorCls = CONFIDENCE_COLOR[tech.confidence];
                  return (
                    <span
                      key={tech.name}
                      className={`border border-primary-fixed/20 bg-[#151918] px-2 py-0.5 font-mono text-[11px] flex items-center gap-1 hover:border-primary-fixed/45 transition-colors ${colorCls}`}
                    >
                      <span className="text-[9px] text-primary-fixed/60">[{prefix}]</span>
                      {tech.name}
                      {tech.version && (
                        <span className="text-[9px] text-primary-fixed/55"> v{tech.version}</span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
