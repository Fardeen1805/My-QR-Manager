"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { safeDestination } from "@/lib/urls";

type QRRecord = { id:string; code:string; title:string; destination_url:string; is_active:boolean; created_at:string; };
export default function Dashboard() {
  const [userEmail,setUserEmail] = useState("");
  const [rows,setRows] = useState<QRRecord[]>([]);
  const [title,setTitle] = useState("");
  const [code,setCode] = useState("");
  const [destination,setDestination] = useState("");
  const [editing,setEditing] = useState<string|null>(null);
  const [search,setSearch] = useState("");
  const [message,setMessage] = useState("");
  const [busy,setBusy] = useState(false);
  const [qrImage,setQrImage] = useState("");
  const [appUrl,setAppUrl] = useState("");
  const supabase = createClient();

  const load = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setMessage("Supabase is not configured. Please update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local with your real project credentials and restart the dev server.");
      return;
    }
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data?.user) { window.location.href="/login"; return; }
      setUserEmail(data.user.email ?? "");
      const { data: rowsData, error } = await supabase.from("qr_codes").select("id,code,title,destination_url,is_active,created_at").order("created_at",{ascending:false}).limit(500);
      if (error) setMessage(error.message); else setRows((rowsData ?? []) as QRRecord[]);
    } catch (err) {
      const rawMsg = err instanceof Error ? err.message : "Failed to connect to Supabase.";
      if (/failed to fetch|networkerror|fetch failed/i.test(rawMsg)) {
        setMessage("Could not connect to Supabase (\"Failed to fetch\"). Please check that NEXT_PUBLIC_SUPABASE_URL in .env.local is valid and reachable, and restart your server.");
      } else {
        setMessage(rawMsg);
      }
    }
  }, [supabase]);

  useEffect(() => { setAppUrl(process.env.NEXT_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")); load(); }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMessage("");
    const cleanUrl = safeDestination(destination);
    if (!cleanUrl) { setMessage("Enter a valid http:// or https:// destination URL."); return; }
    const cleanCode = code.trim();
    if (!/^[A-Za-z0-9_-]{2,64}$/.test(cleanCode)) { setMessage("Code must be 2–64 characters and use only letters, numbers, _ or -."); return; }
    setBusy(true);
    try {
      const {data:{user}} = await supabase.auth.getUser();
      if (!user) throw new Error("Please sign in again.");
      const payload = {code:cleanCode,title:title.trim()||cleanCode,destination_url:cleanUrl,is_active:true,user_id:user.id};
      const result = editing
        ? await supabase.from("qr_codes").update({title:payload.title,destination_url:cleanUrl}).eq("id",editing).select().single()
        : await supabase.from("qr_codes").insert(payload).select().single();
      if (result.error) throw result.error;
      setMessage(editing ? "Destination updated." : "QR code created.");
      setTitle("");setCode("");setDestination("");setEditing(null);setQrImage("");
      await load();
      const baseUrl = appUrl || (typeof window !== "undefined" ? window.location.origin : "");
      const redirectUrl = `${baseUrl.replace(/\/$/,"")}/r/${encodeURIComponent(cleanCode)}`;
      setQrImage(await QRCode.toDataURL(redirectUrl,{width:280,margin:2,errorCorrectionLevel:"H"}));
    } catch(err) { setMessage(err instanceof Error ? err.message : "Could not save QR code."); }
    finally { setBusy(false); }
  }

  function edit(row:QRRecord) { setEditing(row.id);setTitle(row.title);setCode(row.code);setDestination(row.destination_url);setQrImage("");window.scrollTo({top:0,behavior:"smooth"}); }
  async function toggle(row:QRRecord) {
    const {error} = await supabase.from("qr_codes").update({is_active:!row.is_active}).eq("id",row.id);
    if(error) setMessage(error.message); else {setMessage(`Code ${row.code} ${row.is_active?"disabled":"enabled"}.`);await load();}
  }
  async function remove(row:QRRecord) {
    if(!window.confirm(`Delete ${row.code}? This cannot be undone.`)) return;
    const {error}=await supabase.from("qr_codes").delete().eq("id",row.id);
    if(error) setMessage(error.message); else {setMessage(`Deleted ${row.code}.`);await load();}
  }
  async function download(row:QRRecord) {
    try {
      const baseUrl = appUrl || (typeof window !== "undefined" ? window.location.origin : "");
      const url=`${baseUrl.replace(/\/$/,"")}/r/${encodeURIComponent(row.code)}`;
      const data=await QRCode.toDataURL(url,{width:900,margin:3});
      const a=document.createElement("a");a.href=data;a.download=`${row.code}.png`;a.click();
    }
    catch { setMessage("Could not generate QR image."); }
  }
  async function logout() { await supabase.auth.signOut();window.location.href="/"; }
  const visible=rows.filter(r=>`${r.code} ${r.title} ${r.destination_url}`.toLowerCase().includes(search.toLowerCase()));

  return <main className="shell"><header className="topbar"><Link href="/" className="brand" style={{textDecoration:"none",color:"inherit"}}>My <span>QR</span> Manager</Link><div className="nav"><span>{userEmail}</span><button className="btn secondary" onClick={logout}>Sign out</button></div></header><div className="wrap">
    <div className="hero"><div><h1>QR dashboard</h1><p className="muted">Create, organize, and update your dynamic QR destinations.</p></div><span className="status">{rows.length} codes loaded</span></div>
    <div className="cards"><div className="card"><div className="muted">Total QR codes</div><div className="stat">{rows.length}</div></div><div className="card"><div className="muted">Active codes</div><div className="stat">{rows.filter(r=>r.is_active).length}</div></div><div className="card"><div className="muted">Redirect URL base</div><div style={{fontSize:14,fontWeight:700,marginTop:12,overflowWrap:"anywhere"}}>{appUrl}/r/CODE</div></div></div>
    <div className="content-grid"><section className="card"><h2>{editing?"Edit QR destination":"Create a dynamic QR code"}</h2><p className="muted">The printed QR points to your own /r/CODE URL. Change the destination later without changing that QR.</p><form onSubmit={submit}>
      <label className="field">Code / ID<input required disabled={!!editing} placeholder="e.g. S01 or BLR01" value={code} onChange={e=>setCode(e.target.value)} /></label>
      <label className="field">Label / customer name<input placeholder="e.g. Cafe review card" value={title} onChange={e=>setTitle(e.target.value)} /></label>
      <label className="field">Destination URL<input type="url" required placeholder="https://g.page/r/your-review-link" value={destination} onChange={e=>setDestination(e.target.value)} /></label>
      <div className="form-actions"><button className="btn" disabled={busy}>{busy?"Saving…":editing?"Save destination":"Create QR code"}</button>{editing&&<button type="button" className="btn secondary" onClick={()=>{setEditing(null);setTitle("");setCode("");setDestination("");}}>Cancel edit</button>}</div>
    </form>{message&&<div className={`notice ${/error|could not|failed|invalid|duplicate|unique/i.test(message)?"error":""}`}>{message}</div>}{qrImage&&<><h2 style={{marginTop:22}}>QR code preview</h2><div className="qr-preview"><img src={qrImage} alt="Generated QR code" /></div><a className="btn" href={qrImage} download={`${code||"qr-code"}.png`}>Download PNG</a></>}</section>
    <section className="card"><h2>Quick notes</h2><p className="muted">• Each code must be unique within the database.</p><p className="muted">• Only HTTP and HTTPS destination URLs are accepted.</p><p className="muted">• A redirect URL works only after this app is deployed and the code exists in Supabase.</p><p className="muted">• This starter does not yet provide scan analytics or bulk CSV import.</p><div className="notice">Do not put a Supabase service-role key in browser code or in a public GitHub repository.</div></section></div>
    <section className="card" style={{marginTop:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><h2 style={{margin:0}}>Your QR codes</h2><input aria-label="Search QR codes" placeholder="Search codes, labels, URLs…" value={search} onChange={e=>setSearch(e.target.value)} style={{border:"1px solid #ddd",borderRadius:8,padding:10,minWidth:230}} /></div><div className="table-wrap"><table><thead><tr><th>Code</th><th>Label</th><th>Destination</th><th>Status</th><th>Actions</th></tr></thead><tbody>{visible.map(row=><tr key={row.id}><td><code>{row.code}</code></td><td>{row.title}</td><td style={{maxWidth:240,overflowWrap:"anywhere"}}>{row.destination_url}</td><td><span className={`status ${row.is_active?"":"off"}`}>{row.is_active?"Active":"Disabled"}</span></td><td style={{whiteSpace:"nowrap"}}><button className="small-btn" onClick={()=>edit(row)}>Edit</button><button className="small-btn" onClick={()=>download(row)}>PNG</button><button className="small-btn" onClick={()=>toggle(row)}>{row.is_active?"Disable":"Enable"}</button><button className="small-btn" onClick={()=>remove(row)}>Delete</button></td></tr>)}</tbody></table>{visible.length===0&&<p className="muted" style={{padding:12}}>No QR codes found. Create your first code above.</p>}</div></section>
  </div><footer className="footer">My QR Manager · Protect your account and environment variables.</footer></main>;
}
