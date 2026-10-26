"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email,setEmail] = useState("");
  const [password,setPassword] = useState("");
  const [mode,setMode] = useState<"login"|"signup">("login");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const router = useRouter();

  const isConfigured = isSupabaseConfigured();

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMessage("");
    if (!isSupabaseConfigured()) {
      setMessage("Supabase is not configured yet. Open .env.local, replace NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY with your real Supabase project credentials, then restart the dev server (npm run dev).");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const result = mode === "login"
        ? await supabase.auth.signInWithPassword({email,password})
        : await supabase.auth.signUp({email,password, options:{emailRedirectTo: `${window.location.origin}/dashboard`}});
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) setMessage("Account created. Check your email to confirm, then sign in.");
      else router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : "Something went wrong.";
      if (/failed to fetch|networkerror|fetch failed/i.test(rawMsg)) {
        setMessage("Could not connect to Supabase (\"Failed to fetch\"). This means the browser cannot reach your Supabase Project URL. Please check that NEXT_PUBLIC_SUPABASE_URL in .env.local is your actual Supabase URL (e.g. https://yourproject.supabase.co) and not a placeholder, and restart your dev server.");
      } else {
        setMessage(rawMsg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <Link href="/" className="brand" style={{textDecoration:"none",color:"inherit"}}>
          My <span>QR</span> Manager
        </Link>
        <Link href="/" className="nav">Home</Link>
      </header>
      <div className="wrap" style={{maxWidth:520,paddingTop:60}}>
        <div className="card">
          <h1>{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="muted">Sign in to manage your QR codes and destinations.</p>

          {!isConfigured && (
            <div className="notice error" style={{marginBottom:16}}>
              <strong>Supabase Setup Needed:</strong> Your <code>.env.local</code> currently has placeholder credentials (<code>YOUR_PROJECT</code> / <code>YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY</code>). Replace them with your real Supabase Project URL and anon key, then restart <code>npm run dev</code>.
            </div>
          )}

          <form onSubmit={submit}>
            <label className="field">
              Email address
              <input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} />
            </label>
            <label className="field">
              Password
              <input type="password" required minLength={6} autoComplete={mode==="login"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)} />
            </label>
            <button className="btn" disabled={busy} style={{width:"100%",marginTop:8}}>
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          {message && <div className={`notice ${/could not|failed|error|not configured/i.test(message) ? "error" : ""}`}>{message}</div>}

          <p className="muted" style={{marginTop:18}}>
            {mode === "login" ? "New here? " : "Already have an account? "}
            <button type="button" className="small-btn" onClick={()=>{setMode(mode==="login"?"signup":"login");setMessage("");}}>
              {mode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
