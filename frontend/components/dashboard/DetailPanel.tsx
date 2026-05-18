type DetailItem = {
  label: string;
  value?: string | number | boolean | null;
};

type Props = {
  items: DetailItem[];
  label?: string;
};

function formatValue(value: DetailItem["value"]) {
  if (value === undefined || value === null || value === "") return "Unknown";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function DetailPanel({ items, label = "Details" }: Props) {
  const visibleItems = items.filter((item) => item.value !== undefined && item.value !== null && item.value !== "");
  if (visibleItems.length === 0) return null;

  return (
    <details className="border-t border-primary-fixed/10 bg-[#151918]">
      <summary className="cursor-pointer select-none px-5 py-2 font-mono text-xs font-bold text-primary-fixed hover:bg-primary-fixed/[0.04]">
        {label}
      </summary>
      <div className="max-h-[280px] overflow-auto border-t border-primary-fixed/10">
        {visibleItems.map((item) => (
          <div
            key={`${item.label}:${formatValue(item.value)}`}
            className="grid gap-1 border-b border-primary-fixed/10 px-5 py-2 last:border-b-0 md:grid-cols-[150px_minmax(0,1fr)]"
          >
            <span className="font-mono text-[11px] font-bold text-white">
              {item.label}
            </span>
            <span className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-[#d7e8ff]/75">
              {formatValue(item.value)}
            </span>
          </div>
        ))}
      </div>
    </details>
  );
}
