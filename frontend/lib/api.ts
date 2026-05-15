import type { ApiResponse, HistoryResponse } from "@/types";
import { getBackendUrl } from "@/lib/backendUrl";

// Server-side only — not exposed to the browser.
// Client components must use a Next.js Route Handler to proxy instead.
export async function analyzeDomain(
  target: string,
  options?: { forceRefresh?: boolean; saveHistory?: boolean },
): Promise<ApiResponse> {
  try {
    const apiUrl = getBackendUrl();
    const res = await fetch(`${apiUrl}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target,
        force_refresh: options?.forceRefresh ?? false,
        save_history: options?.saveHistory ?? false,
      }),
      cache: "no-store",
    });

    const body = await res.json();

    if (!res.ok) {
      return { success: false, error: body.error ?? `HTTP ${res.status}` };
    }

    return body as ApiResponse;
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Could not reach backend",
    };
  }
}

export async function getHistory(): Promise<HistoryResponse> {
  try {
    const apiUrl = getBackendUrl();
    const res = await fetch(`${apiUrl}/api/history`, { cache: "no-store" });
    const body = await res.json();
    return body as HistoryResponse;
  } catch {
    return { success: false, data: [] };
  }
}

export async function getReportById(id: string): Promise<ApiResponse> {
  try {
    const apiUrl = getBackendUrl();
    const res = await fetch(`${apiUrl}/api/history/${id}`, { cache: "no-store" });
    const body = await res.json();
    if (!res.ok) return { success: false, error: body.error ?? `HTTP ${res.status}` };
    return body as ApiResponse;
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Could not reach backend" };
  }
}
