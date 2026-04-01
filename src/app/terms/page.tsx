import Link from "next/link";
import Nav from "@/components/layout/Nav";
import { COLORS } from "@/lib/constants";

export default function Terms() {
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
          Terms of Service
        </h1>
        <p className="mono" style={{ color: COLORS.textDim, fontSize: 12, marginBottom: 56 }}>
          Last updated: April 1, 2025
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

          <Section title="1. Acceptance of Terms">
            By accessing or using ResumAI (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. We reserve the right to update these terms at any time, and continued use of the Service constitutes acceptance of any changes.
          </Section>

          <Section title="2. Description of Service">
            ResumAI is an AI-powered resume tailoring platform that uses large language models to help users adapt their resumes to specific job descriptions. The Service includes resume storage, AI analysis, CV generation, and application tracking features. The Service is intended for personal, non-commercial use unless otherwise agreed in writing.
          </Section>

          <Section title="3. Account Registration">
            You must create an account to access most features of the Service. You agree to provide accurate, current, and complete information during registration and to keep your account credentials secure. You are responsible for all activity that occurs under your account. We reserve the right to suspend or terminate accounts that violate these terms.
          </Section>

          <Section title="4. User Content">
            You retain ownership of all content you upload to ResumAI, including resume text and personal information (&ldquo;User Content&rdquo;). By uploading User Content, you grant ResumAI a limited, non-exclusive license to process and store that content solely for the purpose of providing the Service to you. We do not sell, share, or use your resume data to train AI models without your explicit consent.
          </Section>

          <Section title="5. AI-Generated Output">
            ResumAI uses third-party AI models (including Groq and Llama 3.3) to generate tailored resume content. AI-generated output is provided &ldquo;as is&rdquo; and may contain inaccuracies. You are solely responsible for reviewing, verifying, and approving any content before using it in job applications. ResumAI does not guarantee employment outcomes or the accuracy of match scores.
          </Section>

          <Section title="6. Prohibited Use">
            You agree not to: (a) upload false, misleading, or fabricated professional information; (b) use the Service to generate content for others for commercial gain without authorization; (c) attempt to reverse-engineer, scrape, or abuse the Service&apos;s AI infrastructure; (d) use the Service in any way that violates applicable laws or regulations.
          </Section>

          <Section title="7. Intellectual Property">
            The ResumAI platform, branding, design, and underlying technology are owned by ResumAI and protected by applicable intellectual property laws. You may not copy, reproduce, or distribute any part of the Service without prior written permission.
          </Section>

          <Section title="8. Limitation of Liability">
            To the maximum extent permitted by law, ResumAI shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to loss of employment opportunity, data loss, or reliance on AI-generated content.
          </Section>

          <Section title="9. Termination">
            We may suspend or terminate your access to the Service at any time for violation of these terms or for any other reason at our sole discretion. Upon termination, your right to use the Service ceases immediately. You may request deletion of your account and associated data at any time by contacting us.
          </Section>

          <Section title="10. Contact">
            For questions about these Terms of Service, please contact us at{" "}
            <a href="mailto:support@resumai.app" style={{ color: COLORS.accent, textDecoration: "none" }}>
              support@resumai.app
            </a>.
          </Section>

        </div>

        <div style={{
          marginTop: 64, paddingTop: 32, borderTop: `1px solid ${COLORS.border}`,
          display: "flex", gap: 24,
        }}>
          <Link href="/privacy" style={{ color: COLORS.textDim, fontSize: 13, fontFamily: "'DM Mono', monospace", textDecoration: "none" }}>
            Privacy Policy →
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
