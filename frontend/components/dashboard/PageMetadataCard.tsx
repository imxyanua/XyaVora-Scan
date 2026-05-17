import type { PageMetadataResult } from "@/types";
import { AppIcon } from "@/components/ui/AppIcon";

interface Props {
  metadata: PageMetadataResult;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-2.5 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
      <span className="font-mono text-[10px] text-primary-fixed/45 uppercase tracking-widest shrink-0">
        {label}
      </span>
      <span className="font-mono text-[11px] text-[#d7e8ff] text-right break-all">
        {value || "-"}
      </span>
    </div>
  );
}

export function PageMetadataCard({ metadata }: Props) {
  const title = metadata.ogTitle || metadata.title;
  const description = metadata.ogDescription || metadata.description;

  return (
    <div className="bg-[#0D0F10] border border-primary-fixed/15 shadow-[3px_3px_0_#050505] flex flex-col">
      <div className="p-3 border-b border-primary-fixed/20 bg-[#151918] flex justify-between items-center shrink-0">
        <h3 className="font-mono text-[11px] tracking-widest text-white uppercase">
          SYS.PAGE_METADATA
        </h3>
        <span className="font-mono text-[11px] text-primary-fixed">
          {metadata.error ? "[ERR]" : "[META]"}
        </span>
      </div>

      {metadata.error ? (
        <p className="font-mono text-sm text-error/70 px-4 py-4">[-] {metadata.error}</p>
      ) : (
        <>
          <div className="p-4 space-y-3 border-b border-primary-fixed/10 bg-[#101415]">
            <div className="flex gap-3 items-start">
              {metadata.faviconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={metadata.faviconUrl} alt="" className="w-7 h-7 border border-primary-fixed/20 bg-[#070B0F]" />
              ) : (
                <AppIcon name="http" className="text-2xl text-primary-fixed/70 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-mono text-sm text-white font-bold leading-snug">
                  {title || "No title detected"}
                </p>
                {description && (
                  <p className="font-mono text-[11px] text-[#d7e8ff]/75 leading-relaxed mt-1">
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
