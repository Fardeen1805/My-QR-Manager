import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  if (!/^[A-Za-z0-9_-]{2,64}$/.test(code)) {
    return new NextResponse("Invalid QR code", { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || url.includes("YOUR_PROJECT") || anonKey.includes("YOUR_SUPABASE")) {
    return new NextResponse("Redirect service is not configured. Please set your Supabase credentials in .env.local.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    // Public anon key is designed for browser/public use; the RPC exposes only an active destination.
    const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    type ResolveResult = { destination_url: string };
    const { data, error } = await supabase
      .rpc("resolve_qr_code", { p_code: code })
      .maybeSingle<ResolveResult>();

    if (error || !data?.destination_url) {
      return new NextResponse("This QR code is unavailable.", { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    let destination: URL;
    try { destination = new URL(data.destination_url); }
    catch { return new NextResponse("Invalid destination URL.", { status: 500 }); }
    if (destination.protocol !== "https:" && destination.protocol !== "http:") {
      return new NextResponse("Invalid destination URL.", { status: 500 });
    }

    return NextResponse.redirect(destination, 302);
  } catch {
    return new NextResponse("Redirect service temporarily unavailable.", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
