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
        <svg
          viewBox="0 0 1000 500"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="Approximate equirectangular world map"
        >
          <defs>
            <pattern id="location-grid" width="83.333" height="83.333" patternUnits="userSpaceOnUse">
              <path d="M 83.333 0 L 0 0 0 83.333" fill="none" stroke="rgba(183,255,60,0.055)" strokeWidth="1" />
            </pattern>
            <radialGradient id="location-ocean" cx="50%" cy="42%" r="72%">
              <stop offset="0%" stopColor="#101716" />
              <stop offset="62%" stopColor="#080d0f" />
              <stop offset="100%" stopColor="#05080a" />
            </radialGradient>
          </defs>
          <rect width="1000" height="500" fill="url(#location-ocean)" />
          <rect width="1000" height="500" fill="url(#location-grid)" />
          <g stroke="rgba(183,255,60,0.07)" strokeWidth="1">
            <path d="M0 250H1000" />
            <path d="M500 0V500" />
            <path d="M0 83.333H1000M0 166.666H1000M0 333.333H1000M0 416.666H1000" />
            <path d="M166.666 0V500M333.333 0V500M666.666 0V500M833.333 0V500" />
          </g>
          <g
            fill="rgba(183,255,60,0.105)"
            stroke="rgba(183,255,60,0.42)"
            strokeLinejoin="round"
            strokeWidth="1.6"
          >
            <path d="M82 136C111 91 160 71 214 84C238 70 282 87 308 119C348 124 366 153 338 181C309 198 300 228 266 239C237 248 232 277 207 291C181 305 164 279 146 255C124 247 113 224 98 205C82 184 66 166 82 136Z" />
            <path d="M114 207C144 210 170 219 199 235C225 247 251 244 273 258C250 270 226 270 202 260C180 251 160 246 138 246C121 240 110 225 114 207Z" />
            <path d="M286 290C320 298 347 325 351 360C354 394 331 418 315 455C297 433 284 406 269 376C253 344 254 316 286 290Z" />
            <path d="M300 58C332 31 384 33 405 67C391 100 353 111 316 94C293 84 282 72 300 58Z" />
            <path d="M446 126C465 109 493 108 516 121C507 142 478 149 454 145C438 142 434 135 446 126Z" />
            <path d="M501 163C530 146 568 153 589 181C617 217 613 269 592 319C573 360 540 351 516 321C495 293 477 247 482 210C484 189 489 174 501 163Z" />
            <path d="M546 106C596 82 655 87 696 116C733 116 770 135 801 165C840 201 834 241 793 252C752 262 716 246 679 228C650 244 615 236 590 211C565 187 540 170 513 162C506 139 520 120 546 106Z" />
            <path d="M642 219C662 237 680 258 696 283C677 287 655 271 638 248C627 234 626 223 642 219Z" />
            <path d="M699 259C725 263 758 272 774 292C751 300 720 293 698 278C686 270 688 262 699 259Z" />
            <path d="M777 331C821 319 872 336 908 378C873 423 812 418 764 389C742 366 748 341 777 331Z" />
            <path d="M623 371C643 373 654 396 643 421C624 416 615 397 623 371Z" />
          </g>
          <g fill="rgba(183,255,60,0.38)" stroke="none">
            <path d="M428 128l13-8 13 8-7 13h-14z" />
            <path d="M836 204l12-8 15 7-3 14-17 3z" />
            <path d="M866 224l11-5 13 7-5 12-15 1z" />
            <path d="M457 102l9-5 10 7-4 9h-12z" />
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
