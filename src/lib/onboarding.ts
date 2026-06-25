import { driver } from "driver.js";

/**
 * Launches the dashboard spotlight onboarding tour.
 * Targets are matched via `data-tour="..."` attributes on the dashboard
 * page title and the nav links (see Nav.tsx and dashboard/page.tsx).
 */
export function startOnboardingTour() {
  const tour = driver({
    showProgress: true,
    allowClose: true, // lets users press ESC / click the overlay to skip
    steps: [
      {
        element: '[data-tour="welcome"]',
        popover: {
          title: "Welcome to RezumeAI!",
          description: "Let's take a quick tour of what you can do here.",
        },
      },
      {
        element: '[data-tour="tailor-link"]',
        popover: {
          title: "Tailor your resume",
          description:
            "Paste a job description and your resume — AI rewrites it to match, with an ATS match score.",
        },
      },
      {
        element: '[data-tour="generate-link"]',
        popover: {
          title: "Generate from scratch",
          description:
            "No resume yet? Fill in your profile once and generate a tailored CV from scratch for any job.",
        },
      },
      {
        element: '[data-tour="resumes-link"]',
        popover: {
          title: "Your resume vault",
          description:
            "Every tailored resume gets saved here automatically — find them anytime.",
        },
      },
      {
        element: '[data-tour="tracker-link"]',
        popover: {
          title: "Track your applications",
          description:
            "Track every application, its status, and follow-up dates in one place.",
        },
      },
      {
        element: '[data-tour="profile-link"]',
        popover: {
          title: "Complete your profile",
          description:
            "Complete your profile once to unlock CV generation and faster tailoring.",
        },
      },
      {
        popover: {
          title: "You're all set!",
          description:
            "Need a refresher? Click the help icon in the dashboard anytime to replay this tour.",
        },
      },
    ],
  });

  tour.drive();
}
