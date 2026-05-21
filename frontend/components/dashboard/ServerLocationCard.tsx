import type { ServerLocationResult } from "@/types";
import { DetailPanel } from "./DetailPanel";
import { SourceQualityBadge } from "./SourceQualityBadge";

type Props = {
  location: ServerLocationResult;
};

function fmt(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "Unknown";
  return String(value);
}

function coordinateToPercent(latitude?: number, longitude?: number) {
  if (latitude === undefined || longitude === undefined) return null;
  const x = ((longitude + 180) / 360) * 100;
  const y = ((90 - latitude) / 180) * 100;
  return {
    left: `${Math.max(0, Math.min(100, x))}%`,
    top: `${Math.max(0, Math.min(100, y))}%`,
  };
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-primary-fixed/10 px-5 py-1.5 last:border-b-0 hover:bg-primary-fixed/[0.04] transition-colors">
      <span className="shrink-0 font-mono text-sm font-bold text-white">{label}</span>
      <span className="min-w-0 break-words text-right font-mono text-sm text-[#d7e8ff]">
        {fmt(value)}
      </span>
    </div>
  );
}

function WorldMap({ location }: { location: ServerLocationResult }) {
  const marker = coordinateToPercent(location.latitude, location.longitude);

  return (
    <div className="mx-5 my-4 overflow-hidden border border-primary-fixed/10 bg-[#070B0F]">
      <div className="relative aspect-[2/1]">
        <svg viewBox="0 0 1000 500" className="absolute inset-0 h-full w-full" role="img" aria-label="Approximate world map">
          <defs>
            <pattern id="location-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(183,255,60,0.07)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="1000" height="500" fill="#0a0f0f" />
          <rect width="1000" height="500" fill="url(#location-grid)" />
          <g fill="none" stroke="rgba(183,255,60,0.34)" strokeWidth="2">
            <path d="M150 120 250 80 330 135 300 210 230 245 145 210 105 160Z" />
            <path d="M260 250 330 285 350 380 300 455 245 360Z" />
            <path d="M450 95 520 75 610 120 675 95 785 145 820 235 720 260 630 215 540 245 465 190Z" />
            <path d="M510 250 600 275 635 360 580 455 520 375Z" />
            <path d="M735 300 835 315 900 385 845 430 760 390Z" />
            <path d="M425 115 455 95 485 120 470 145 435 145Z" />
          </g>
          <g fill="rgba(183,255,60,0.08)" stroke="rgba(183,255,60,0.1)" strokeWidth="1">
            <path d="M150 120 250 80 330 135 300 210 230 245 145 210 105 160Z" />
            <path d="M260 250 330 285 350 380 300 455 245 360Z" />
            <path d="M450 95 520 75 610 120 675 95 785 145 820 235 720 260 630 215 540 245 465 190Z" />
            <path d="M510 250 600 275 635 360 580 455 520 375Z" />
            <path d="M735 300 835 315 900 385 845 430 760 390Z" />
          </g>
        </svg>
        {marker ? (
          <div className="absolute -translate-x-1/2 -translate-y-1/2" style={marker}>
            <span className="block h-3 w-3 border border-primary-fixed bg-primary-fixed shadow-[0_0_18px_rgba(183,255,60,0.9)]" />
            <span className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 border border-primary-fixed/30" />
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="border border-primary-fixed/20 bg-[#070B0F]/80 px-3 py-2 font-mono text-xs text-primary-fixed/60">
              LOCATION UNKNOWN
            </span>
          </div>
        )}
      </div>
      {location.latitude !== undefined && location.longitude !== undefined && (
        <p className="border-t border-primary-fixed/10 px-3 py-1 text-right font-mono text-[11px] text-[#d7e8ff]/55">
          Latitude: {location.latitude}, Longitude: {location.longitude}
        </p>
      )}
    </div>
  );
}

export function ServerLocationCard({ location }: Props) {
  const cityLine = [location.postal, location.city, location.region].filter(Boolean).join(", ");
  const currency = location.currency && location.currencyCode
    ? `${location.currency} (${location.currencyCode})`
    : location.currency || location.currencyCode;
  const detailItems = [
    { label: "IP", value: location.ip },
    { label: "City", value: cityLine },
    { label: "Region", value: location.region },
    { label: "Country", value: location.countryCode ? `${location.country} (${location.countryCode})` : location.country },
    { label: "Timezone", value: location.timezone },
    { label: "Languages", value: location.languages?.join(", ") },
    { label: "Currency", value: currency },
    { label: "Latitude", value: location.latitude },
    { label: "Longitude", value: location.longitude },
    { label: "Organization", value: location.organization },
    { label: "ISP", value: location.isp },
    { label: "ASN", value: location.asn },
    { label: "Source", value: location.source },
    { label: "Location Evidence", value: location.locationEvidence?.join("\n") },
  ];

  return (
    <div className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] flex h-full flex-col">
      <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3 shrink-0">
        <h3 className="font-mono text-2xl font-bold text-primary-fixed leading-none">
          Server Location
        </h3>
        <SourceQualityBadge source={location.error ? "missing" : "estimated"} />
      </div>

      {location.error ? (
        <p className="font-mono text-sm text-status-warn/75 px-5 py-4">[LOCATION_UNAVAILABLE] {location.error}</p>
      ) : (
        <>
          <div className="font-mono text-sm">
            <Row label="City" value={cityLine} />
            <Row label="Country" value={location.countryCode ? `${location.country} ${location.countryCode}` : location.country} />
            <Row label="Timezone" value={location.timezone} />
            <Row label="Languages" value={location.languages?.join(", ")} />
            <Row label="Currency" value={currency} />
            <Row label="IP" value={location.ip} />
          </div>
          <WorldMap location={location} />
        </>
      )}
      {!location.error && <DetailPanel items={detailItems} />}
    </div>
  );
}
