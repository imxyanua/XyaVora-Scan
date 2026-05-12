// TODO: Replace with real API calls when backend is ready
import type { ApiResponse } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function analyzeDomain(target: string): Promise<ApiResponse> {
  const res = await fetch(`${API_BASE}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target }),
  });

  if (!res.ok) {
    return { success: false, error: `HTTP ${res.status}` };
  }

  return res.json() as Promise<ApiResponse>;
}
