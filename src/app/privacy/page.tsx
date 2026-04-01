import Link from "next/link";
import Nav from "@/components/layout/Nav";
import { COLORS } from "@/lib/constants";

export default function Privacy() {
  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh" }}>
      <Nav />
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "120px 24px 80px" }}>

        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: COLORS.textDim, fontSize: 13, fontFamily: "'DM Mono', monospace",
          textDecoration: "none", marginBottom: 48,
        }}>
          ← Back to home
        </Link>

        <div className="tag" style={{ marginBottom: 16, display: "inline-block" }}>Legal</div>
        <h1 style={{
          fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em",
          color: COLORS.text, marginBottom: 8,
        }}>
          Privacy Policy
        </h1>
        <p className="mono" style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 56 }}>
          Last updated: April 1, 2025
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

          <Section title="1. Overview">
            ResumAI (&ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use the ResumAI platform. By using the Service, you consent to the practices described in this policy.
          </Section>

          <Section title="2. Information We Collect">
            We collect the following categories of information:{" "}
            <br /><br />
            <strong style={{ color: COLORS.text }}>Account data:</strong> Your email address and password (hashed) when you register.{" "}
            <br /><br />
            <strong style={{ color: COLORS.text }}>Resume and profile data:</strong> Resume text, work experience, skills, education, and any other professional information you enter into the platform.{" "}
            <br /><br />
            <strong style={{ color: COLORS.text }}>Usage data:</strong> Pages visited, features used, and interaction patterns collected via Vercel Analytics and PostHog to improve the product.{" "}
            <br /><br />
            <strong style={{ color: COLORS.text }}>Job data:</strong> Job descriptions you submit for tailoring. These are processed in real time and not permanently stored beyond your session.
          </Section>

          <Section title="3. How We Use Your Information">
            We use your data solely to provide and improve the Service: (a) to authenticate your account and secure your session; (b) to process your resume and generate tailored output using AI; (c) to store your resumes and application history for your own access; (d) to analyze aggregate usage patterns and improve product performance. We do not sell your personal data to third parties.
          </Section>

          <Section title="4. AI Processing">
            Resume content you submit for tailoring is sent to Groq&apos;s API, which powers the Llama 3.3 70B model used by ResumAI. This data is subject to{" "}
            <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.accent, textDecoration: "none" }}>
              Groq&apos;s Privacy Policy
            </a>. We do not use your resume content to train AI models, and we do not share identifiable resume data with any other third parties.
          </Section>

          <Section title="5. Data Storage">
            Your account and resume data are stored in Supabase (PostgreSQL), hosted on AWS infrastructure in secure, access-controlled environments. Data is encrypted at rest and in transit. We retain your data for as long as your account is active. You may request full deletion of your data at any time.
          </Section>

          <Section title="6. Cookies and Analytics">
            We use cookies for authentication session management. We also use PostHog and Vercel Analytics to collect anonymized usage data. These tools may set cookies in your browser. You can disable cookies in your browser settings, though this may affect core functionality.
          </Section>

          <Section title="7. Data Sharing">
            We do not sell, rent, or share your personal data with third parties except: (a) service providers necessary to operate the platform (Supabase, Groq, Vercel); (b) when required by law or valid legal process; (c) to protect the rights, safety, or property of ResumAI or its users.
          </Section>

          <Section title="8. Your Rights">
            You have the right to: access the personal data we hold about you; correct inaccurate data; request deletion of your account and all associated data; withdraw consent for data processing at any time. To exercise these rights, contact us at{" "}
            <a href="mailto:support@resumai.app" style={{ color: COLORS.accent, textDecoration: "none" }}>
              support@resumai.app
            </a>.
          </Section>

          <Section title="9. Children's Privacy">
            The Service is not directed at individuals under the age of 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.
          </Section>

          <Section title="10. Changes to This Policy">
            We may update this Privacy Policy from time to time. We will notify you of significant changes by posting a notice on the platform or by email. Continued use of the Service after changes take effect constitutes acceptance of the updated policy.
          </Section>

          <Section title="11. Contact">
            For privacy-related questions or data requests, contact us at{" "}
            <a href="mailto:support@resumai.app" style={{ color: COLORS.accent, textDecoration: "none" }}>
              support@resumai.app
            </a>.
          </Section>

        </div>

        <div style={{
          marginTop: 64, paddingTop: 32, borderTop: `1px solid ${COLORS.border}`,
          display: "flex", gap: 24,
        }}>
          <Link href="/terms" style={{ color: COLORS.textDim, fontSize: 13, fontFamily: "'DM Mono', monospace", textDecoration: "none" }}>
            Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 style={{
        fontSize: 16, fontWeight: 700, color: COLORS.text,
        marginBottom: 12, letterSpacing: "-0.01em",
      }}>
        {title}
      </h2>
      <p style={{
        color: COLORS.textDim, fontSize: 14, lineHeight: 1.8,
        fontFamily: "'DM Mono', monospace",
      }}>
        {children}
      </p>
    </div>
  );
}
