import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import OnboardingHeader from "@/components/OnboardingHeader";

export const Route = createFileRoute("/step-3")({
  head: () => ({
    meta: [
      { title: "You're Booked | Lead Genisys Onboarding" },
      {
        name: "description",
        content:
          "Your launch call is booked. Confirm the call in your email, accept the calendar invite, then join our Slack workspace.",
      },
      { property: "og:title", content: "You're Booked | Lead Genisys Onboarding" },
      {
        property: "og:description",
        content:
          "Your launch call is booked. Confirm the call in your email, accept the calendar invite, then join our Slack workspace.",
      },
    ],
  }),
  component: Step3,
});

const checklist = [
  {
    title: "Open your email inbox",
    body: "Look for the email from Lead Genisys — check spam or promotions if it isn't in your primary inbox.",
  },
  {
    title: "Confirm the onboarding call",
    body: "Click the confirmation link in that email so your launch call is locked in with our team.",
  },
  {
    title: "Accept the calendar invite",
    body: "Add it to your calendar so you get the reminders and the meeting link before the call.",
  },
  {
    title: "Accept the Slack invite",
    body: "You'll also get an invite to our Slack workspace — accept it from the same inbox.",
  },
  {
    title: "Get into Slack",
    body: "Set up your Slack account and say hello in your channel. This is where you'll be communicating with us day to day.",
  },
];

function Step3() {
  return (
    <div className="flex min-h-screen flex-col gradient-hero">
      <OnboardingHeader current={3} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="space-y-4 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Last step</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">You're booked</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            A few things left: confirm the onboarding call and invite in your email, then accept the
            Slack invite and get into Slack — that's where we'll be communicating with you.
          </p>
        </div>

        <ol className="mx-auto mt-10 max-w-xl divide-y border-t border-b">
          {checklist.map((item, i) => (
            <li key={item.title} className="flex gap-4 py-5 text-left">
              <span className="w-6 shrink-0 pt-0.5 text-sm font-semibold text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="font-semibold text-ink">{item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Your spot isn't final until you click the confirmation in your email.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline" size="lg">
            <Link to="/step-2">Back to booking</Link>
          </Button>
          <Button asChild size="xl" variant="brand">
            <a href="https://mail.google.com" target="_blank" rel="noreferrer">
              Open my email
            </a>
          </Button>
        </div>
      </main>
    </div>
  );
}