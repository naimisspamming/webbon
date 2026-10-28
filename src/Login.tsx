import { useState } from "react";
import type { FormEvent } from "react";

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not sign in.");
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f7f7f4",fontFamily:"Inter,system-ui,sans-serif",color:"#20211f"}}>
      <section style={{width:"100%",maxWidth:420,background:"#fff",border:"1px solid #e9e9e4",borderRadius:22,padding:32,boxShadow:"0 18px 60px rgba(25,25,20,.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:32}}>
          <span style={{width:38,height:38,display:"grid",placeItems:"center",borderRadius:12,background:"#22251f",color:"#fff",fontWeight:800,fontSize:20}}>W</span>
          <strong style={{fontSize:24,letterSpacing:"-1px"}}>webbon<span style={{color:"#a1ff3a"}}>.</span></strong>
        </div>
        <p style={{margin:"0 0 8px",fontSize:12,fontWeight:700,letterSpacing:1.5,color:"#777"}}>PRIVATE WORKSPACE</p>
        <h1 style={{margin:"0 0 8px",fontSize:30,letterSpacing:"-1px"}}>Welcome back.</h1>
        <p style={{margin:"0 0 28px",color:"#777",lineHeight:1.6}}>Sign in to manage your websites and projects.</p>
        <form onSubmit={submit} style={{display:"grid",gap:16}}>
          <label style={{display:"grid",gap:8,fontSize:13,fontWeight:600}}>Email address
            <input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={{boxSizing:"border-box",width:"100%",padding:"13px 14px",border:"1px solid #deded7",borderRadius:10,fontSize:15,outlineColor:"#a1ff3a"}} />
          </label>
          <label style={{display:"grid",gap:8,fontSize:13,fontWeight:600}}>Password
            <input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" style={{boxSizing:"border-box",width:"100%",padding:"13px 14px",border:"1px solid #deded7",borderRadius:10,fontSize:15,outlineColor:"#a1ff3a"}} />
          </label>
          {error && <p role="alert" style={{margin:0,padding:12,borderRadius:9,background:"#fff0ed",color:"#a32f1e",fontSize:13}}>{error}</p>}
          <button disabled={busy} type="submit" style={{marginTop:4,padding:"14px 16px",border:0,borderRadius:10,background:"#22251f",color:"#fff",fontWeight:700,fontSize:15,cursor:busy?"wait":"pointer",opacity:busy ? 0.7 : 1}}>{busy?"Signing in…":"Sign in"}</button>
        </form>
        <p style={{margin:"22px 0 0",fontSize:12,color:"#888",lineHeight:1.6}}>Private access for the Webbon account owner.</p>
      </section>
    </main>
  );
}
