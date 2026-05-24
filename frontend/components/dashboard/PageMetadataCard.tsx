import type { PageMetadataResult } from "@/types";
import { AppIcon } from "@/components/ui/AppIcon";
import { DetailPanel } from "./DetailPanel";

interface Props {
  metadata: PageMetadataResult;
}

function Row({ label, value }: { label: string; value?: string | null }) {
  const displayValue = value || "Unknown";

  return (
    <div className="flex items-start justify-between gap-4 px-5 py-1.5 border-b border-primary-fixed/10 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
      <span className="font-mono text-sm text-white font-bold shrink-0">
        {label}
      </span>
      <span className="min-w-0 max-w-[68%] truncate text-right font-mono text-sm text-white" title={displayValue}>
        {displayValue}
      </span>
    </div>
  );
}

export function PageMetadataCard({ metadata }: Props) {
  const title = metadata.ogTitle || metadata.title;
  const description = metadata.ogDescription || metadata.description;
  const detailItems = [
    { label: "Title", value: metadata.title },
    { label: "Description", value: metadata.description },
    { label: "Canonical URL", value: metadata.canonicalUrl },
    { label: "Open Graph Title", value: metadata.ogTitle },
    { label: "Open Graph Description", value: metadata.ogDescription },
    { label: "Open Graph Image", value: metadata.ogImage },
    { label: "Open Graph URL", value: metadata.ogUrl },
    { label: "Twitter Title", value: metadata.twitterTitle },
    { label: "Twitter Description", value: metadata.twitterDescription },
    { label: "Twitter Image", value: metadata.twitterImage },
    { label: "Favicon", value: metadata.faviconUrl },
    { label: "Language", value: metadata.language },
    { label: "Robots", value: metadata.robots },
    { label: "Robots Directives", value: metadata.robotsDirectives?.join("\n") },
    { label: "Canonical Host", value: metadata.canonicalHost },
    { label: "Canonical Matches Host", value: metadata.canonicalMatchesFinalHost },
    { label: "Title Length", value: metadata.titleLength },
    { label: "Description Length", value: metadata.descriptionLength },
    { label: "Social Tags Present", value: metadata.socialTagsPresent },
    { label: "Social Image Present", value: metadata.socialImagePresent },
    { label: "Metadata Quality", value: metadata.metadataQuality },
    { label: "Metadata Issues", value: metadata.metadataIssues?.join("\n") },
    { label: "Metadata Evidence", value: metadata.metadataEvidence?.join("\n") },
    { label: "Noindex", value: metadata.noindex },
    { label: "Nofollow", value: metadata.nofollow },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
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
                <p className="font-mono text-sm text-white font-bold leading-snug line-clamp-2">
                  {title || "No title detected"}
                </p>
                {description && (
                  <p className="font-mono text-xs text-[#d7e8ff]/75 leading-relaxed mt-1 line-clamp-3">
                    {description}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            <Row label="Language" value={metadata.language} />
            <Row label="Canonical" value={metadata.canonicalUrl} />
            <Row label="Canonical Host" value={metadata.canonicalHost} />
            <Row label="OG Image" value={metadata.ogImage} />
            <Row label="Twitter Image" value={metadata.twitterImage} />
            <Row label="Robots" value={metadata.robots} />
            <Row label="Quality" value={metadata.metadataQuality?.toUpperCase()} />
            <Row label="Noindex" value={metadata.noindex ? "YES" : "NO"} />
            <Row label="Nofollow" value={metadata.nofollow ? "YES" : "NO"} />
          </div>
          <DetailPanel items={detailItems} />
        </>
      )}
    </div>
  );
}
