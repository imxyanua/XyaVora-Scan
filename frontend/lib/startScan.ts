export function normalizeScanTarget(input: string) {
  const value = input.trim();
  if (!value) return "";

  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    return url.hostname.toLowerCase();
  } catch {
    return value
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/[/?#].*$/, "");
  }
}

export function createScanUrl(target: string) {
  const normalizedTarget = normalizeScanTarget(target);
  const scanId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `/scanning?target=${encodeURIComponent(normalizedTarget)}&scanId=${encodeURIComponent(scanId)}`;
}

export function startScan(target: string) {
  window.location.assign(createScanUrl(target));
}
