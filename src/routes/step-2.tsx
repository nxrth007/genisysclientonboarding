import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import OnboardingHeader from "@/components/OnboardingHeader";

export const Route = createFileRoute("/step-3")({
  head: () => ({
    meta: [
      { title: "You're In | Lead Genisys Onboarding" },
      {
        name: "description",
        content: "You're onboarded with Lead Genisys. Your team will reach out in your private Slack channel.",
      },
      { property: "og:title", content: "You're In | Lead Genisys Onboarding" },
      {
        property: "og:description",
        content: "You're onboarded with Lead Genisys. Your team will reach out in your private Slack channel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Step3,
});

const checklist = [
  {
    title: "We're building your system",
    body: "Our team is already working with the details and files you sent.",
  },
  {
    title: "Watch your Slack channel",
    body: "We'll post updates, questions and your launch timing there.",
  },
  {
    title: "Turn on Slack notifications",
    body: "Install Slack on your phone so you don't miss a message from us.",
  },
];

function Step3() {
  return (
    <div className="flex min-h-screen flex-col gradient-hero">
      <OnboardingHeader current={3} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="space-y-3 text-center">
          <p className="text-sm text-primary">Last step</p>
          <h1 className="text-3xl font-medium tracking-tight text-ink md:text-4xl">You're in</h1>
          <p className="mx-auto max-w-2xl text-lg font-normal text-muted-foreground">
            Welcome to Lead Genisys. Here's what happens next.
          </p>
        </div>

        <ol className="mx-auto mt-10 max-w-xl divide-y border-y text-left">
          {checklist.map((item, i) => (
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
            <Link to="/step-2">Back</Link>
          </Button>
          <Button asChild variant="brand" size="lg" className="w-full sm:w-[320px]">
            <a href="https://app.slack.com" target="_blank" rel="noreferrer">
              Open Slack
            </a>
          </Button>
        </div>
      </main>
    </div>
  );
}
