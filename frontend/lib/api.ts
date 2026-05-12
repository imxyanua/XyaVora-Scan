import type { ApiResponse } from "@/types";

// Server-side only — not exposed to the browser.
// Client components must use a Next.js Route Handler to proxy instead.
const API_URL = process.env.API_URL ?? "http://localhost:8000";

export async function analyzeDomain(target: string): Promise<ApiResponse> {
  try {
    const res = await fetch(`${API_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
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
