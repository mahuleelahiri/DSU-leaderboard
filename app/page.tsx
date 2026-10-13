"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Award, KeyRound, ShieldCheck } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("switch") === "1") return;
    const savedCode = window.localStorage.getItem("clubhouse-code");
    if (savedCode) router.replace(`/c/${encodeURIComponent(savedCode)}`);
  }, [router]);

  function openClub(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(normalized)) {
      setError("Enter the six-character code shared by your club.");
      return;
    }
    setError("");
    router.push(`/c/${encodeURIComponent(normalized)}`);
  }

  return <main className="access-page">
    <header className="club-header"><Link className="brand" href="/"><span className="brand-mark"><Award size={19} /></span><span>Clubhouse<span className="brand-dot">.</span></span></Link><Link className="quiet-link admin-link" href="/super-admin"><ShieldCheck size={15} /> Super admin</Link></header>
    <div className="access-main">
      <section className="access-copy">
        <p className="eyebrow"><span className="access-spark" /> YOUR PEOPLE. YOUR PROGRESS.</p>
        <h1>Make your<br /><span>mark.</span></h1>
        <p className="intro-copy">A shared board for showing up, building skills, and celebrating the little wins.</p>
      </section>
      <section className="access-panel">
        <div className="access-panel-icon"><KeyRound size={20} /></div>
        <p className="eyebrow">ENTER YOUR CLUB</p>
        <h2>Have an access code?</h2>
        <p className="panel-copy">Your club admin has the six-character code.</p>
        <form className="access-form" onSubmit={openClub}>
          <label htmlFor="club-code">Club code</label>
          <input id="club-code" className="field code-field" autoCapitalize="characters" autoComplete="off" maxLength={6} placeholder="e.g. 7KDM4R" value={code} onChange={(event) => setCode(event.target.value.replace(/[^a-zA-Z2-9]/g, "").slice(0, 6).toUpperCase())} />
          {error && <p className="error-copy" role="alert">{error}</p>}
          <button className="button-primary" type="submit" disabled={code.length !== 6}>Open leaderboard <ArrowRight size={16} /></button>
        </form>
        <p className="access-privacy">No account needed to view. Your club code stays on this device.</p>
      </section>
    </div>
    <footer className="club-footer"><span>GOOD THINGS ADD UP.</span><span>Clubhouse <i className="brand-dot">·</i> A place to belong</span></footer>
  </main>;
}
