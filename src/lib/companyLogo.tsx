"use client";

import { useState } from "react";

/**
 * Company logo lookup for resume and application cards.
 *
 * We hold company *names*, not domains, so a name is mapped to a domain and
 * handed to a key-free logo CDN. Any miss falls back to an initial in a circle,
 * so a dead or blocked provider degrades quietly rather than breaking a card.
 */

type LogoProvider = (domain: string) => string;

const PROVIDERS = {
  // Verified responding (HTTP 200, image/x-icon) when this was written.
  duckduckgo: (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,

  // Also key-free, and serves larger raster sizes than DDG.
  google: (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,

  // Clearbit's free Logo API. `logo.clearbit.com` no longer has a DNS record —
  // HubSpot retired the endpoint after acquiring Clearbit, so every request
  // fails to resolve and every card would show its initial instead. Kept here
  // only so the original choice is documented.
  clearbit: (domain: string) => `https://logo.clearbit.com/${domain}`,
} satisfies Record<string, LogoProvider>;

/** Switch providers by changing this one value. */
const LOGO_PROVIDER: keyof typeof PROVIDERS = "google";

// Nigerian and African companies a generic name-to-domain guess gets wrong,
// plus the global employers that show up most often.
const KNOWN_DOMAINS: Record<string, string> = {
  "flutterwave": "flutterwave.com",
  "paystack": "paystack.com",
  "interswitch": "interswitchgroup.com",
  "mtn nigeria": "mtn.com",
  "mtn": "mtn.com",
  "access bank": "accessbankplc.com",
  "zenith bank": "zenithbank.com",
  "gtbank": "gtbank.com",
  "gtco": "gtbank.com",
  "guaranty trust": "gtbank.com",
  "kuda": "kuda.com",
  "piggyvest": "piggyvest.com",
  "cowrywise": "cowrywise.com",
  "andela": "andela.com",
  "moniepoint": "moniepoint.com",
  "opay": "opay.com",
  "carbon": "getcarbon.co",
  "multichoice": "multichoice.com",
  "dstv": "dstv.com",
  "bolt": "bolt.eu",
  "uber": "uber.com",
  "google": "google.com",
  "microsoft": "microsoft.com",
  "amazon": "amazon.com",
  "meta": "meta.com",
  "apple": "apple.com",
  "netflix": "netflix.com",
  "spotify": "spotify.com",
  "airbnb": "airbnb.com",
  "stripe": "stripe.com",
  "notion": "notion.so",
  "figma": "figma.com",
  "shopify": "shopify.com",
  "bp": "bp.com",
  "shell": "shell.com",
  "chevron": "chevron.com",
  "total": "totalenergies.com",
  "sahara group": "sahara-group.com",
  "dangote": "dangote.com",
  "firstbank": "firstbanknigeria.com",
  "first bank": "firstbanknigeria.com",
  "uba": "ubagroup.com",
  "united bank": "ubagroup.com",
  "stanbic": "stanbicibtcbank.com",
  "union bank": "unionbankng.com",
  "wema bank": "wemabank.com",
  "sterling bank": "sterling.ng",
  "proxima fusion": "proximafusion.com",
  "valsoft": "valsoftcorp.com",
  "undp": "undp.org",
  "un": "un.org",
};

// Longest keys first so "mtn nigeria" wins over "mtn" and "union bank" over
// "un", regardless of object insertion order.
const KNOWN_KEYS = Object.keys(KNOWN_DOMAINS).sort((a, b) => b.length - a.length);

const LEGAL_SUFFIXES =
  /\b(ltd|limited|plc|inc|corp|corporation|group|holdings|nigeria|technologies|tech|solutions|services|global)\b/g;

export function getCompanyLogoUrl(companyName: string): string {
  if (!companyName) return "";

  const normalized = companyName.toLowerCase().trim();
  if (!normalized) return "";

  // Match on whole words only. A bare substring test sends "Unilever" to
  // un.org and "Metalworks" to meta.com.
  for (const key of KNOWN_KEYS) {
    const pattern = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (pattern.test(normalized)) {
      return PROVIDERS[LOGO_PROVIDER](KNOWN_DOMAINS[key]);
    }
  }

  // Otherwise guess a domain: drop legal suffixes and anything that can't
  // appear in a hostname, then assume .com.
  const cleaned = normalized
    .replace(LEGAL_SUFFIXES, "")
    .replace(/[^a-z0-9]/g, "");

  if (!cleaned) return "";
  return PROVIDERS[LOGO_PROVIDER](`${cleaned}.com`);
}

export function CompanyLogo({
  company,
  size = 24,
  className = "",
}: {
  company: string;
  size?: number;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const logoUrl = getCompanyLogoUrl(company);

  if (!company || hasError || !logoUrl) {
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.45,
          fontWeight: 600,
          color: "var(--text-dim)",
          flexShrink: 0,
          fontFamily: "'DM Mono', monospace",
          lineHeight: 1,
        }}
      >
        {company?.charAt(0)?.toUpperCase() || "?"}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className={className}
      style={{
        borderRadius: 4,
        objectFit: "contain",
        flexShrink: 0,
        background: "#fff",
        padding: 2,
      }}
      onError={() => setHasError(true)}
    />
  );
}
