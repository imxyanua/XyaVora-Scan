import type { PageMetadataResult } from "@/types";
import { AppIcon } from "@/components/ui/AppIcon";

interface Props {
  metadata: PageMetadataResult;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 px-5 py-1.5 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
      <span className="font-mono text-sm text-white font-bold shrink-0">
        {label}
      </span>
      <span className="font-mono text-sm text-white text-right break-all">
        {value || "Unknown"}
      </span>
    </div>
  );
}

export function PageMetadataCard({ metadata }: Props) {
  const title = metadata.ogTitle || metadata.title;
  const description = metadata.ogDescription || metadata.description;

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex flex-col">
      <div className="px-5 pt-5 pb-3 flex justify-between items-start shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Page Metadata
        </h3>
        <span className="font-mono text-[11px] text-white/70">
          {metadata.error ? "[ERR]" : "[META]"}
        </span>
      </div>

      {metadata.error ? (
        <p className="font-mono text-sm text-error/70 px-4 py-4">[-] {metadata.error}</p>
      ) : (
        <>
          <div className="px-5 py-4 space-y-3 border-b border-primary-fixed/10 bg-[#151918]">
            <div className="flex gap-3 items-start">
              {metadata.faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={metadata.faviconUrl} alt="" className="w-8 h-8 border border-primary-fixed/20 bg-[#070B0F]" />
              ) : (
                <AppIcon name="http" className="text-2xl text-primary-fixed/70 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-mono text-sm text-white font-bold leading-snug">
                  {title || "No title detected"}
                </p>
                {description && (
                  <p className="font-mono text-xs text-[#d7e8ff]/75 leading-relaxed mt-1">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div>
            <Row label="Language" value={metadata.language} />
            <Row label="Canonical" value={metadata.canonicalUrl} />
            <Row label="OG Image" value={metadata.ogImage} />
            <Row label="Robots" value={metadata.robots} />
            <Row label="Noindex" value={metadata.noindex ? "YES" : "NO"} />
            <Row label="Nofollow" value={metadata.nofollow ? "YES" : "NO"} />
          </div>
        </>
      )}
    </div>
  );
}
