import { driver, type DriveStep, type Side } from "driver.js";

/**
 * Each step lists one or more candidate selectors in priority order. The first
 * one that resolves to a *visible* element is used. This matters on mobile:
 * the nav links (tailor/resumes/tracker) are hidden via `nav-mobile-hidden`,
 * so we fall back to the equivalent on-page dashboard elements. If none are
 * visible, the step renders as a centered popover instead of a broken spotlight
 * pinned to a zero-size (display:none) element in the top-left corner.
 */
type StepDef = {
  selectors?: string[];
  title: string;
  description: string;
};

const STEP_DEFS: StepDef[] = [
  {
    selectors: ['[data-tour="welcome"]'],
    title: "Welcome to RezumeAI!",
    description: "Let's take a quick tour of what you can do here.",
  },
  {
    selectors: ['[data-tour="tailor-link"]', '[data-tour="generate-link"]'],
    title: "Tailor your resume",
    description:
      "Paste a job description and your resume — AI rewrites it to match, with an ATS match score.",
  },
  {
    selectors: ['[data-tour="generate-link"]'],
    title: "Generate from scratch",
    description:
      "No resume yet? Fill in your profile once and generate a tailored CV from scratch for any job.",
  },
  {
    selectors: ['[data-tour="resumes-link"]', '[data-tour="resumes-link-alt"]'],
    title: "Your resume vault",
    description:
      "Every tailored resume gets saved here automatically — find them anytime.",
  },
  {
    selectors: ['[data-tour="tracker-link"]', '[data-tour="tracker-link-alt"]'],
    title: "Track your applications",
    description:
      "Track every application, its status, and follow-up dates in one place.",
  },
  {
    selectors: ['[data-tour="profile-link"]'],
    title: "Complete your profile",
    description:
      "Complete your profile once to unlock CV generation and faster tailoring.",
  },
  {
    title: "You're all set!",
    description:
      "Need a refresher? Click the help icon in the dashboard anytime to replay this tour.",
  },
];

/** Returns the element only if it is actually rendered with a non-zero box. */
function findVisible(selector: string): HTMLElement | null {
  const el = document.querySelector(selector) as HTMLElement | null;
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 ? el : null;
}

export function startOnboardingTour() {
  const viewportH = window.innerHeight;

  const steps: DriveStep[] = STEP_DEFS.map((def) => {
    let element: HTMLElement | undefined;
    if (def.selectors) {
      for (const selector of def.selectors) {
        const found = findVisible(selector);
        if (found) {
          element = found;
          break;
        }
      }
    }

    // Keep popovers on-screen: open below elements in the top ~45% of the
    // viewport, above elements lower down. (Ignored for element-less steps.)
    let side: Side = "bottom";
    if (element) {
      const rect = element.getBoundingClientRect();
      side = rect.top + rect.height / 2 < viewportH * 0.45 ? "bottom" : "top";
    }

    return {
      element,
      popover: {
        title: def.title,
        description: def.description,
        side,
        align: "center",
      },
    };
  });

  const tour = driver({
    showProgress: true,
    allowClose: true, // lets users press ESC / click the overlay to skip
    popoverClass: "rezumeai-tour",
    steps,
  });

  tour.drive();
}
