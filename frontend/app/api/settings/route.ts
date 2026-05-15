import { NextRequest, NextResponse } from "next/server";
import { getBackendUrl } from "@/lib/backendUrl";

export async function GET() {
  try {
    const backendUrl = getBackendUrl();
    const res  = await fetch(`${backendUrl}/api/settings`, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend unreachable";
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const backendUrl = getBackendUrl();
    const body = await req.json();
    const res  = await fetch(`${backendUrl}/api/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Backend unreachable";
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
