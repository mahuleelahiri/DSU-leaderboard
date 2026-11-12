"use client";

/** Last-resort boundary when the root layout itself fails; must render <html>. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f6f6f8", color: "#0e0f13" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 20 }}>Clubhouse is having trouble</h1>
          <p style={{ color: "#6b7080" }}>Please try again in a moment.{error.digest ? ` (ref: ${error.digest})` : ""}</p>
          <button onClick={() => retry()} style={{ marginTop: 16, padding: "10px 16px", borderRadius: 10, border: 0, background: "#5546e8", color: "#fff", cursor: "pointer" }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
