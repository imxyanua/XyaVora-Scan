import type { TechStackItem, TechCategory } from "@/types";

interface Props {
  techStack: TechStackItem[];
}

const CATEGORY_PREFIX: Record<TechCategory, string> = {
  "JavaScript Framework": "JS",
  "CSS Framework":        "CSS",
  "CDN":                  "CDN",
  "Web Server":           "SRV",
  "CMS":                  "CMS",
  "Analytics":            "ANL",
  "Hosting":              "HST",
  "Database":             "DB",
  "Other":                "EXT",
};

const CONFIDENCE_COLOR: Record<TechStackItem["confidence"], string> = {
  high:   "text-primary-fixed",
  medium: "text-secondary-container",
  low:    "text-primary-fixed/50",
};

export function TechStackCard({ techStack }: Props) {
  return (
    <div className="card-panel p-4 flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-primary-fixed/20 pb-2 mb-3 shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase">
          SYS.TECH_STACK_DETECT
        </h3>
        <span className="font-mono text-[11px] text-primary-fixed/40">[FINGERPRINT]</span>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        {techStack.map((tech) => {
          const prefix = CATEGORY_PREFIX[tech.category];
          const colorCls = CONFIDENCE_COLOR[tech.confidence];
          return (
            <span
              key={tech.name}
              className={`border border-primary-fixed/30 bg-primary-fixed/5 px-2 py-1 font-mono text-sm flex items-center gap-1 ${colorCls}`}
            >
              <span className="text-[10px] text-primary-fixed/50">[{prefix}]</span>
              {tech.name}
              {tech.version && (
                <span className="text-[10px] text-primary-fixed/40"> v{tech.version}</span>
              )}
            </span>
          );
        })}
      </div>

      {techStack.length === 0 && (
        <p className="font-mono text-sm text-on-surface-variant/40">
          [-] No technologies detected
        </p>
      )}
    </div>
  );
}
