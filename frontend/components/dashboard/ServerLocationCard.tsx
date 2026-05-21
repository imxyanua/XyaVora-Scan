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

type GeoPoint = readonly [longitude: number, latitude: number];

const LAND_MASSES: Array<{ name: string; points: GeoPoint[] }> = [
  {
    name: "North America",
    points: [
      [-168, 71], [-149, 69], [-132, 58], [-124, 49], [-117, 36], [-109, 28],
      [-97, 22], [-88, 17], [-81, 9], [-76, 19], [-82, 25], [-80, 32],
      [-73, 41], [-63, 49], [-58, 58], [-75, 65], [-96, 70], [-124, 74],
      [-150, 72], [-168, 71],
    ],
  },
  {
    name: "Greenland",
    points: [[-52, 83], [-25, 77], [-31, 66], [-45, 60], [-62, 61], [-72, 70], [-52, 83]],
  },
  {
    name: "South America",
    points: [
      [-81, 12], [-70, 8], [-54, 5], [-43, -8], [-36, -23], [-48, -37],
      [-65, -55], [-74, -45], [-72, -28], [-79, -8], [-81, 12],
    ],
  },
  {
    name: "Europe",
    points: [
      [-11, 72], [11, 71], [31, 63], [44, 54], [38, 43], [25, 37],
      [13, 42], [2, 43], [-9, 36], [-15, 51], [-11, 72],
    ],
  },
  {
    name: "Africa",
    points: [
      [-18, 35], [9, 37], [33, 31], [51, 12], [44, -12], [31, -34],
      [18, -35], [5, -25], [-8, -4], [-17, 14], [-18, 35],
    ],
  },
  {
    name: "Asia",
    points: [
      [25, 71], [59, 70], [94, 72], [132, 61], [168, 55], [160, 43],
      [139, 35], [124, 22], [106, 18], [99, 5], [88, 22], [77, 9],
      [68, 25], [50, 25], [39, 43], [27, 56], [25, 71],
    ],
  },
  {
    name: "Southeast Asia",
    points: [[96, 21], [112, 18], [124, 9], [122, -7], [107, -6], [99, 5], [96, 21]],
  },
  {
    name: "Australia",
    points: [[112, -11], [153, -15], [154, -34], [135, -43], [113, -33], [112, -11]],
  },
  {
    name: "Antarctica",
    points: [[-180, -63], [-120, -70], [-55, -66], [10, -72], [82, -66], [150, -70], [180, -63], [180, -90], [-180, -90], [-180, -63]],
  },
];

const MAP_MARKERS: GeoPoint[] = [
  [-3, 54], [139, 38], [121, 14], [103, 1], [144, -6], [47, -20],
];

function projectGeoPoint([longitude, latitude]: GeoPoint) {
  const x = ((longitude + 180) / 360) * 1000;
  const y = ((90 - latitude) / 180) * 500;
  return `${x.toFixed(1)} ${y.toFixed(1)}`;
}

function geoPath(points: GeoPoint[]) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"}${projectGeoPoint(point)}`).join(" ") + " Z";
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
            shapeRendering="geometricPrecision"
          >
            {LAND_MASSES.map((mass) => (
              <path key={mass.name} d={geoPath(mass.points)} />
            ))}
          </g>
          <g fill="rgba(183,255,60,0.38)" stroke="none">
            {MAP_MARKERS.map((point) => {
              const [x, y] = projectGeoPoint(point).split(" ");
              return <circle key={`${point[0]}-${point[1]}`} cx={x} cy={y} r="3" />;
            })}
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
