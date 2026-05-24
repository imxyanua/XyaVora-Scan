import type { PageMetadataResult } from "@/types";
import { DetailPanel } from "./DetailPanel";
import { SourceQualityBadge } from "./SourceQualityBadge";

interface Props {
  metadata: PageMetadataResult;
}

type SignalStatus = "pass" | "warn" | "fail" | "missing";

type Signal = {
  label: string;
  status: SignalStatus;
  value: string;
  note: string;
};

const STATUS: Record<SignalStatus, { badge: string; text: string }> = {
  pass: { badge: "status-pass", text: "[OK]" },
  warn: { badge: "status-warn", text: "[REVIEW]" },
  fail: { badge: "status-fail", text: "[BLOCK]" },
  missing: { badge: "status-missing", text: "[-]" },
};

function hasIssue(metadata: PageMetadataResult, issue: string) {
  return metadata.metadataIssues?.includes(issue) ?? false;
}

function buildSignals(metadata: PageMetadataResult): Signal[] {
  const socialTagsPresent = Boolean(metadata.socialTagsPresent);
  const socialImagePresent = Boolean(metadata.socialImagePresent);
  const titleIssue = hasIssue(metadata, "missing-title")
    ? "missing"
    : hasIssue(metadata, "title-too-short") || hasIssue(metadata, "title-too-long")
      ? "warn"
      : "pass";
  const descriptionIssue = hasIssue(metadata, "missing-description")
    ? "missing"
    : hasIssue(metadata, "description-too-short") || hasIssue(metadata, "description-too-long")
      ? "warn"
      : "pass";
  const canonicalStatus = hasIssue(metadata, "missing-canonical")
    ? "missing"
    : hasIssue(metadata, "canonical-host-differs")
      ? "warn"
      : "pass";
  const robotsStatus = metadata.noindex ? "fail" : metadata.nofollow ? "warn" : "pass";
  const socialStatus = !socialTagsPresent
    ? "missing"
    : !socialImagePresent
      ? "warn"
      : "pass";

  return [
    {
      label: "Title",
      status: titleIssue,
      value: metadata.title ? `${metadata.titleLength ?? metadata.title.length} chars` : "Missing",
      note: "Useful page title for tabs, bookmarks, search results, and previews.",
    },
    {
      label: "Description",
      status: descriptionIssue,
      value: metadata.description ? `${metadata.descriptionLength ?? metadata.description.length} chars` : "Missing",
      note: "Human-readable summary used by search and link previews.",
    },
    {
      label: "Canonical",
      status: canonicalStatus,
      value: metadata.canonicalUrl ?? "Missing",
      note: "Preferred URL declared by the page.",
    },
    {
      label: "Robots",
      status: robotsStatus,
      value: metadata.robots ?? "No explicit robots tag",
      note: "Flags noindex/nofollow directives when present in page HTML.",
    },
    {
      label: "Social Preview",
      status: socialStatus,
      value: socialImagePresent ? "Image ready" : socialTagsPresent ? "Tags without image" : "Missing",
      note: "Open Graph and Twitter metadata for shared links.",
    },
  ];
}

export function PageQualityCard({ metadata }: Props) {
  const signals = buildSignals(metadata);
  const failCount = signals.filter((signal) => signal.status === "fail").length;
  const reviewCount = signals.filter((signal) => signal.status === "warn" || signal.status === "missing").length;
  const overall = metadata.error ? "fail" : failCount ? "fail" : reviewCount ? "warn" : "pass";
  const detailItems = [
    { label: "Metadata Quality", value: metadata.metadataQuality },
    { label: "Issues", value: metadata.metadataIssues?.join("\n") },
    { label: "Title Length", value: metadata.titleLength },
    { label: "Description Length", value: metadata.descriptionLength },
    { label: "Canonical URL", value: metadata.canonicalUrl },
    { label: "Canonical Matches Host", value: metadata.canonicalMatchesFinalHost },
    { label: "Robots", value: metadata.robots },
    { label: "Open Graph Title", value: metadata.ogTitle },
    { label: "Open Graph Description", value: metadata.ogDescription },
    { label: "Open Graph Image", value: metadata.ogImage },
    { label: "Open Graph URL", value: metadata.ogUrl },
    { label: "Twitter Title", value: metadata.twitterTitle },
    { label: "Twitter Description", value: metadata.twitterDescription },
    { label: "Twitter Image", value: metadata.twitterImage },
    { label: "Evidence", value: metadata.metadataEvidence?.join("\n") },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 shrink-0">
        <div>
          <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
            Page Quality
          </h3>
          <p className="mt-2 font-mono text-[11px] leading-relaxed text-[#d7e8ff]/60">
            Metadata completeness for search, sharing, canonical URLs, and robots directives.
          </p>
        </div>
        <span className={`status-badge ${STATUS[overall].badge} text-[10px] shrink-0`}>
          {overall === "pass" ? "Clean" : overall === "warn" ? "Review" : "Issue"}
        </span>
      </div>

      {metadata.error ? (
        <p className="px-5 py-4 font-mono text-sm text-error/70">[-] {metadata.error}</p>
      ) : (
        <>
          <div className="px-5 pb-3 flex flex-wrap items-center gap-2">
            <SourceQualityBadge source="page" />
            {metadata.metadataQuality && (
              <span className="font-mono text-[10px] text-[#d7e8ff]/55">
                {metadata.metadataQuality.toUpperCase()} QUALITY
              </span>
            )}
          </div>
          <div className="font-mono text-sm flex-1">
            {signals.map((signal) => {
              const status = STATUS[signal.status];
              return (
                <div
                  key={signal.label}
                  className="px-5 py-3 border-t border-primary-fixed/10 hover:bg-primary-fixed/[0.04] transition-colors"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-bold text-white">{signal.label}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-[#d7e8ff]/60">
                        {signal.note}
                      </p>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <span className={`status-badge ${status.badge} text-[10px]`}>
                        {status.text}
                      </span>
                      <p className="mt-1 max-w-[17rem] break-words text-[11px] text-white">
                        {signal.value}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!metadata.error && <DetailPanel items={detailItems} label="Page Quality Details" />}
    </div>
  );
}
