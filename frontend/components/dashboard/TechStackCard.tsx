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
  low:    "text-primary-fixed/50",
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
    <div className="card-panel p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-primary-fixed/20 pb-2 mb-3 shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase">
          SYS.TECH_STACK_DETECT
        </h3>
        <span className="font-mono text-[11px] text-primary-fixed/40">[FINGERPRINT]</span>
      </div>

      {techStack.length === 0 ? (
        <p className="font-mono text-sm text-on-surface-variant/40">
          [-] No technologies detected
        </p>
      ) : (
        <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
          {categories.map((cat) => (
            <div key={cat}>
              <p className="font-mono text-[9px] tracking-widest text-primary-fixed/30 uppercase mb-1.5">
                {cat}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {grouped[cat].map((tech) => {
                  const prefix = CATEGORY_PREFIX[tech.category];
                  const colorCls = CONFIDENCE_COLOR[tech.confidence];
                  return (
                    <span
                      key={tech.name}
                      className={`border border-primary-fixed/25 bg-primary-fixed/5 px-2 py-0.5 font-mono text-[11px] flex items-center gap-1 ${colorCls}`}
                    >
                      <span className="text-[9px] text-primary-fixed/40">[{prefix}]</span>
                      {tech.name}
                      {tech.version && (
                        <span className="text-[9px] text-primary-fixed/35"> v{tech.version}</span>
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
