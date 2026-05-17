import type { PageMetadataResult } from "@/types";
import { AppIcon } from "@/components/ui/AppIcon";

interface Props {
  metadata: PageMetadataResult;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="data-grid-row flex justify-between gap-4 px-4 py-2.5">
      <span className="font-mono text-[10px] text-primary-fixed/40 uppercase tracking-widest shrink-0">
        {label}
      </span>
      <span className="font-mono text-[11px] text-primary-fixed/70 text-right break-all">
        {value || "-"}
      </span>
    </div>
  );
}

export function PageMetadataCard({ metadata }: Props) {
  const title = metadata.ogTitle || metadata.title;
  const description = metadata.ogDescription || metadata.description;

  return (
    <div className="card-panel flex flex-col">
      <div className="p-3 border-b border-primary-fixed/20 bg-[#070B0F] flex justify-between items-center shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-primary-fixed/60 uppercase">
          SYS.PAGE_METADATA
        </h3>
        <span className="font-mono text-[11px] text-primary-fixed/40">
          {metadata.error ? "[ERR]" : "[META]"}
        </span>
      </div>

      {metadata.error ? (
        <p className="font-mono text-sm text-error/70 px-4 py-4">[-] {metadata.error}</p>
      ) : (
        <>
          <div className="p-4 space-y-3 border-b border-primary-fixed/10">
            <div className="flex gap-3 items-start">
              {metadata.faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={metadata.faviconUrl} alt="" className="w-6 h-6 border border-primary-fixed/20" />
              ) : (
                <AppIcon name="http" className="text-2xl text-primary-fixed/30 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-mono text-sm text-primary-fixed font-bold leading-snug">
                  {title || "No title detected"}
                </p>
                {description && (
                  <p className="font-mono text-[11px] text-primary-fixed/50 leading-relaxed mt-1">
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
