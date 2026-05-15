export function createScanUrl(target: string) {
  const scanId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `/scanning?target=${encodeURIComponent(target)}&scanId=${encodeURIComponent(scanId)}`;
}

export function startScan(target: string) {
  window.location.assign(createScanUrl(target));
}
