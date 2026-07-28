"use client";

export default function GlobalError() {
  return (
    <html lang="en">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", fontFamily: "system-ui" }}>
          <section style={{ maxWidth: "640px", textAlign: "center" }}>
            <h1>Chopra Capital is temporarily unavailable.</h1>
            <p>Please refresh the page. If the problem continues, try again in a few minutes.</p>
            <button type="button" onClick={() => window.location.reload()}>
              Refresh
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
