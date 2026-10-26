import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | undefined;

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  if (
    url.includes("YOUR_PROJECT") ||
    key.includes("YOUR_SUPABASE") ||
    url.trim() === "" ||
    key.trim() === ""
  ) {
    return false;
  }
  return true;
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://unconfigured.supabase.co";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "unconfigured-key";
  if (!client) {
    client = createBrowserClient(url, key);
  }
  return client;
}
