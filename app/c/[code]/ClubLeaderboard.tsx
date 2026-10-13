"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PublicClub } from "@/lib/club";

export default function ClubLeaderboard({ code }: { code: string }) {
  const clubCode = String(code ?? "").trim().toUpperCase();
  const [club, setClub] = useState<PublicClub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadClub() {
      try {
        const response = await fetch(`/api/club/${encodeURIComponent(clubCode)}`);
        if (!response.ok) {
          throw new Error("Club not found");
        }
        const data = (await response.json()) as PublicClub;
        if (active) {
          setClub(data);
          setError("");
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load this club.");
          setClub(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadClub();
    return () => {
      active = false;
    };
  }, [clubCode]);

  return (
    <main className="club-page">
      <header className="club-header">
        <div className="brand-row">
          <Link className="brand" href="/">
            <span className="brand-mark">★</span>
            <span>Clubhouse</span>
          </Link>
          <Link className="quiet-link admin-link" href={`/c/${encodeURIComponent(clubCode)}/admin`}>
            Admin sign-in
          </Link>
        </div>
      </header>

      <div className="board-shell">
        {loading && <div className="board-loading">Loading leaderboard…</div>}

        {!loading && error && (
          <section className="login-panel">
            <div className="login-icon">
              <span>⚠️</span>
            </div>
            <p className="eyebrow">CLUB BOARD</p>
            <h1>Club not found.</h1>
            <p className="intro-copy">The access code {clubCode} does not match a club in the Neon database.</p>
            <Link className="button-primary" href="/">
              Back to club search
            </Link>
          </section>
        )}

        {!loading && club && (
          <>
            <section className="board-topbar">
              <div>
                <p className="eyebrow">LIVE LEADERBOARD</p>
                <h1>{club.name}</h1>
              </div>
              <div className="season-badge">{club.season_name ?? "No active season"}</div>
            </section>

            <section className="leaderboard-grid">
              {club.domains.map((domain) => (
                <article key={domain.id} className="domain-card">
                  <div className="domain-header">
                    <h2>{domain.name}</h2>
                    <span>{domain.member_count} members</span>
                  </div>

                  <div className="member-list">
                    {domain.members.length === 0 ? (
                      <p className="empty-state">No active members in this domain yet.</p>
                    ) : (
                      domain.members.map((member) => (
                        <div key={member.id} className="member-row">
                          <div className="member-meta">
                            <div className="avatar">{member.name.charAt(0).toUpperCase()}</div>
                            <div>
                              <strong>{member.name}</strong>
                              <small>#{member.rank}</small>
                            </div>
                          </div>
                          <span className="member-score">{member.marks} pts</span>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
