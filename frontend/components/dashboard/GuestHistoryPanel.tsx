"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { AppIcon } from "@/components/ui/AppIcon";
import { ScanLink } from "@/components/scan/ScanLink";
import {
  clearGuestScans,
  deleteGuestScan,
  getGuestScans,
  subscribeGuestScans,
  type GuestScanEntry,
} from "@/lib/guestScanStorage";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB");
}

export function GuestHistoryPanel() {
  const items = useSyncExternalStore<GuestScanEntry[]>(
    subscribeGuestScans,
    getGuestScans,
    () => [],
  );

  function removeScan(scanId: string) {
    deleteGuestScan(scanId);
  }

  function clearAll() {
    clearGuestScans();
  }

  return (
    <div className="p-4 md:p-8 w-full max-w-5xl mx-auto space-y-6">
      <div className="pb-4 border-b border-primary-fixed/15 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="font-mono text-[10px] text-primary-fixed/30 uppercase tracking-widest block mb-1">
            &gt; GUEST_BROWSER_HISTORY
          </span>
          <h1 className="font-mono text-xl font-bold text-primary-fixed">Recent Guest Scans</h1>
          <p className="mt-2 font-mono text-[11px] text-[#d7e8ff]/60 max-w-2xl">
            Stored in this browser only. Reports are kept without screenshot base64 to avoid filling local storage.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/scan" className="btn-primary px-4 py-2 text-xs">
            NEW SCAN
          </Link>
          {items.length > 0 && (
            <button type="button" onClick={clearAll} className="btn-ghost px-4 py-2 text-xs">
              CLEAR
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card-panel p-8 flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <AppIcon name="history" className="text-4xl text-primary-fixed/40 shrink-0" />
            <div className="min-w-0">
              <p className="font-mono text-sm text-primary-fixed font-bold">
                NO_GUEST_SCANS_STORED
              </p>
              <p className="font-mono text-[11px] text-primary-fixed/45 leading-relaxed mt-2">
                Run a scan and the latest guest reports will appear here automatically.
              </p>
            </div>
          </div>
          <Link href="/scan" className="btn-primary px-5 py-2 text-xs w-fit">
            START SCAN
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {items.map((item) => (
            <article
              key={item.scanId}
              className="bg-[#202322] border border-primary-fixed/10 shadow-[3px_3px_0_#050505] p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-mono text-lg font-bold text-primary-fixed break-all">
                      {item.hostname}
                    </h2>
                    <span className="status-badge status-pass text-[10px]">
                      {item.grade}
                    </span>
                    <span className="font-mono text-[10px] text-[#d7e8ff]/55">
                      SCORE {item.score}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-[#d7e8ff]/60">
                    Scanned {formatDate(item.scanTime)} - stored {formatDate(item.storedAt)}
                  </p>
                  <p className="mt-2 font-mono text-[11px] text-[#d7e8ff]/75 leading-relaxed">
                    {item.summary}
                  </p>
                  <p className="mt-2 font-mono text-[10px] text-primary-fixed/45">
                    {item.findingsCount} findings - browser-only guest record
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/report/${encodeURIComponent(item.hostname)}?guestScanId=${encodeURIComponent(item.scanId)}`}
                    className="btn-primary px-3 py-2 text-xs"
                  >
                    VIEW
                  </Link>
                  <ScanLink target={item.hostname} className="btn-ghost px-3 py-2 text-xs">
                    RESCAN
                  </ScanLink>
                  <button
                    type="button"
                    onClick={() => removeScan(item.scanId)}
                    className="btn-ghost px-3 py-2 text-xs"
                  >
                    DELETE
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
