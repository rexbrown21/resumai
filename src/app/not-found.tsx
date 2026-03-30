import Link from "next/link";
import { COLORS } from "@/lib/constants";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: COLORS.bg, padding: "40px 20px",
    }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{
          width: 48, height: 48, background: COLORS.accent,
          clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)",
          margin: "0 auto 32px",
        }} />

        <div className="tag" style={{ marginBottom: 20, display: "inline-block" }}>404</div>

        <h1 style={{
          fontSize: 56, fontWeight: 800, letterSpacing: "-0.04em",
          color: COLORS.text, lineHeight: 1, marginBottom: 16,
        }}>
          Page not<br />
          <span style={{ color: COLORS.accent }}>found.</span>
        </h1>

        <p className="mono" style={{
          color: COLORS.textDim, fontSize: 13, lineHeight: 1.8, marginBottom: 40,
        }}>
          The page you&apos;re looking for doesn&apos;t exist<br />or may have been moved.
        </p>

        <Link href="/" className="btn-primary" style={{
          padding: "12px 32px", borderRadius: 2,
          textDecoration: "none", display: "inline-block",
        }}>
          Back to home →
        </Link>
      </div>
    </div>
  );
}