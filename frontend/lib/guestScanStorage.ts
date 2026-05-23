import type { ScanReport } from "@/types";

const INDEX_KEY = "xyavora.guestScans.v1";
const REPORT_PREFIX = "xyavora.guestReport.v1:";
const CHANGE_EVENT = "xyavora:guest-scans-updated";
const MAX_GUEST_SCANS = 10;
let cachedIndexRaw: string | null = null;
let cachedIndex: GuestScanEntry[] = [];
const cachedReports = new Map<string, { raw: string | null; report: ScanReport | null }>();

export type GuestScanEntry = {
  scanId: string;
  target: string;
  hostname: string;
  normalizedUrl: string;
  scanTime: string;
  storedAt: string;
  score: number;
  grade: ScanReport["grade"];
  status: ScanReport["status"];
  summary: string;
  findingsCount: number;
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function reportKey(scanId: string) {
  return `${REPORT_PREFIX}${scanId}`;
}

function readIndex(): GuestScanEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(INDEX_KEY);
    if (raw === cachedIndexRaw) return cachedIndex;
    if (!raw) {
      cachedIndexRaw = null;
      cachedIndex = [];
      return cachedIndex;
    }
    const parsed = JSON.parse(raw);
    cachedIndexRaw = raw;
    cachedIndex = Array.isArray(parsed) ? parsed : [];
    return cachedIndex;
  } catch {
    cachedIndexRaw = null;
    cachedIndex = [];
    return cachedIndex;
  }
}

function writeIndex(entries: GuestScanEntry[]) {
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

function notifyGuestScansChanged() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function compactReport(report: ScanReport): ScanReport {
  return {
    ...report,
    screenshot: {
      ...report.screenshot,
      base64: undefined,
      mobileBase64: undefined,
    },
  };
}

export function saveGuestScan(scanId: string, report: ScanReport) {
  if (!isBrowser() || !scanId) return;

  const entry: GuestScanEntry = {
    scanId,
    target: report.target,
    hostname: report.hostname,
    normalizedUrl: report.normalizedUrl,
    scanTime: report.scanTime,
    storedAt: new Date().toISOString(),
    score: report.score,
    grade: report.grade,
    status: report.status,
    summary: report.summary,
    findingsCount: report.findings.length,
  };

  const existing = readIndex().filter((item) => item.scanId !== scanId);
  const next = [entry, ...existing].slice(0, MAX_GUEST_SCANS);
  const removed = existing.slice(MAX_GUEST_SCANS - 1);

  try {
    const compacted = compactReport(report);
    const raw = JSON.stringify(compacted);
    window.localStorage.setItem(reportKey(scanId), raw);
    cachedReports.set(scanId, { raw, report });
    writeIndex(next);
    removed.forEach((item) => window.localStorage.removeItem(reportKey(item.scanId)));
    notifyGuestScansChanged();
  } catch {
    try {
      window.localStorage.removeItem(reportKey(scanId));
      writeIndex(next);
      notifyGuestScansChanged();
    } catch {
      // Ignore storage failures. Guest history is a convenience layer only.
    }
  }
}

export function getGuestScans(): GuestScanEntry[] {
  return readIndex();
}

export function getGuestScanReport(scanId: string): ScanReport | null {
  if (!isBrowser() || !scanId) return null;
  try {
    const raw = window.localStorage.getItem(reportKey(scanId));
    const cached = cachedReports.get(scanId);
    if (cached && cached.raw === raw) return cached.report;
    const report = raw ? (JSON.parse(raw) as ScanReport) : null;
    cachedReports.set(scanId, { raw, report });
    return report;
  } catch {
    return null;
  }
}

export function deleteGuestScan(scanId: string) {
  if (!isBrowser() || !scanId) return;
  const next = readIndex().filter((item) => item.scanId !== scanId);
  window.localStorage.removeItem(reportKey(scanId));
  writeIndex(next);
  notifyGuestScansChanged();
}

export function clearGuestScans() {
  if (!isBrowser()) return;
  readIndex().forEach((item) => window.localStorage.removeItem(reportKey(item.scanId)));
  window.localStorage.removeItem(INDEX_KEY);
  notifyGuestScansChanged();
}

export function subscribeGuestScans(callback: () => void) {
  if (!isBrowser()) return () => {};

  function onStorage(event: StorageEvent) {
    if (event.key === INDEX_KEY || event.key?.startsWith(REPORT_PREFIX)) {
      callback();
    }
  }

  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}
