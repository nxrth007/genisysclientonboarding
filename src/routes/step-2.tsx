import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import OnboardingHeader from "@/components/OnboardingHeader";

export const Route = createFileRoute("/step-2")({
  head: () => ({
    meta: [
      { title: "Step 2: Join Us on Slack | Lead Genisys Onboarding" },
      {
        name: "description",
        content:
          "Accept your Slack invite to join your private Lead Genisys channel, where we'll communicate day to day.",
      },
      { property: "og:title", content: "Step 2: Join Us on Slack | Lead Genisys Onboarding" },
      {
        property: "og:description",
        content:
          "Accept your Slack invite to join your private Lead Genisys channel, where we'll communicate day to day.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Step2,
});

const steps = [
  {
    title: "Check your email",
    body: "We just sent a Slack invite to the lead email you gave us. Look in spam or promotions if you don't see it.",
  },
  {
    title: "Accept the invite",
    body: "Click the link in the email. If you already use Slack, you can accept it from your current workspace.",
  },
  {
    title: "Say hello in your channel",
    body: "Your private channel with our team is ready. That's where we'll talk day to day.",
  },
];

function Step2() {
  return (
    <div className="flex min-h-screen flex-col gradient-hero">
      <OnboardingHeader current={2} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="space-y-3 text-center">
          <p className="text-sm text-primary">Step 2 of 3</p>
          <h1 className="text-3xl font-medium tracking-tight text-ink md:text-4xl">
            Join us on Slack
          </h1>
          <p className="mx-auto max-w-2xl text-lg font-normal text-muted-foreground">
            We've set up a private Slack channel just for you. Accept the invite to get started.
          </p>
        </div>

        <ol className="mx-auto mt-10 max-w-xl divide-y border-y text-left">
          {steps.map((item, i) => (
            <li key={item.title} className="flex gap-4 py-5">
              <span className="text-base text-primary">{i + 1}.</span>
              <div>
                <h2 className="text-base font-medium text-ink">{item.title}</h2>
                <p className="mt-1 text-sm font-normal text-muted-foreground">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline" size="lg" className="w-full sm:w-[320px]">
            <a href="https://app.slack.com" target="_blank" rel="noopener noreferrer">
              Open Slack
              <ExternalLink />
            </a>
          </Button>
          <Button asChild variant="brand" size="lg" className="w-full sm:w-[320px]">
            <Link to="/step-3">
              I've joined Slack
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
