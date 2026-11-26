import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import OnboardingHeader from "@/components/OnboardingHeader";
import { Button } from "@/components/ui/button";
import { onConsentChange, readChoice, saveChoices } from "@/lib/consent";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [
    { title: "Privacy & Tracking Choices | Lead Genisys Onboarding" },
    { name: "description", content: "How Lead Genisys uses onboarding information and how to turn off advertising tracking." },
    { property: "og:title", content: "Privacy & Tracking Choices | Lead Genisys Onboarding" },
    { property: "og:description", content: "Manage advertising tracking and learn how your onboarding information is used." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: Privacy,
});

function Privacy() {
  const [disabled, setDisabled] = useState(false);
  useEffect(() => {
    const refresh = () => setDisabled(readChoice("advertising") === "denied");
    refresh();
    return onConsentChange(refresh);
  }, []);
  return <div className="min-h-screen gradient-hero">
    <OnboardingHeader />
    <main className="mx-auto max-w-3xl space-y-6 px-4 py-12 text-foreground">
      <h1 className="text-3xl font-medium text-ink">Privacy & tracking choices</h1>
      <p>Updated November 26, 2026. We use the details and files you submit to verify your customer access, build your marketing system, and coordinate onboarding. Our team uses Google Sheets, our Hub, and Slack to fulfill your onboarding.</p>
      <h2 className="text-xl font-medium">Advertising measurement</h2>
      <p>Where permitted, Meta Pixel shares page visits, page addresses without checkout IDs or other search parameters, browser and device information, IP address, and advertising cookie identifiers with Meta. Meta may use this information for ad measurement, remarketing, and advertising optimization. We do not send your intake answers, EIN, uploaded documents, email address, or phone number through this Pixel, and automatic form collection is disabled.</p>
      <p>Without advertising permission, Meta tracking stays off in the EU/EEA, UK, Switzerland, Canada, and places we cannot determine. Elsewhere it can run unless you opt out. Your browser’s Global Privacy Control signal also turns it off. Turning it off does not affect your ability to complete onboarding.</p>
      <p>Necessary sign-in and hosting storage keeps this site working. Lovable’s visit counting does not use analytics cookies or identify visitors.</p>
      <Button variant="outline" onClick={() => saveChoices({ advertising: "denied" })} disabled={disabled}>
        {disabled ? "Advertising tracking is off" : "Turn off advertising tracking"}
      </Button>
      <p className="text-sm text-muted-foreground">Your choice applies to future visits in this browser and updates other open tabs. To request access, deletion, or help with privacy choices, email <a href="mailto:ethan@leadgenisys.com" className="underline">ethan@leadgenisys.com</a>.</p>
    </main>
  </div>;
}