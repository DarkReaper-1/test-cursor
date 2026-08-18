export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        margin: 0,
        background: "#141210",
        color: "#F4EFE6",
        fontFamily: "Georgia, 'Times New Roman', serif",
        padding: 48,
      }}
    >
      <p style={{ letterSpacing: "0.2em", fontSize: 12, color: "#A89F91" }}>HELIX API</p>
      <h1 style={{ fontWeight: 500, fontSize: 42 }}>Operator services</h1>
      <p style={{ maxWidth: 520, lineHeight: 1.6, color: "#A89F91" }}>
        Server-authoritative progression for Helix. Try{" "}
        <code style={{ color: "#D4A574" }}>GET /api/v1/health</code>.
      </p>
    </main>
  );
}
