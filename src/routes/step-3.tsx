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
          "Your launch call is booked. Check your email to confirm the onboarding call and accept the calendar invite.",
      },
      { property: "og:title", content: "You're Booked | Lead Genisys Onboarding" },
      {
        property: "og:description",
        content:
          "Your launch call is booked. Check your email to confirm the onboarding call and accept the calendar invite.",
      },
    ],
  }),
  component: Step3,
});

const checklist = [
  {
    title: "Open your email inbox",
    body: "Look for the confirmation email from Lead Genisys. Check spam or promotions if it isn't in your primary inbox.",
  },
  {
    title: "Confirm the onboarding call",
    body: "Click the confirmation link in that email so your launch call is locked in with our team.",
  },
  {
    title: "Accept the calendar invite",
    body: "Add the invite to your calendar so you get reminders and the meeting link ahead of the call.",
  },
  {
    title: "Accept the Slack invite",
    body: "You'll also get a Slack invite by email. Accept it to join your dedicated channel.",
  },
  {
    title: "Get into Slack",
    body: "Slack is where you'll be communicating with us day to day, so sign in before the call.",
  },
];

function Step3() {
  return (
    <div className="flex min-h-screen flex-col gradient-hero">
      <OnboardingHeader current={3} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="space-y-3 text-center">
          <p className="text-sm text-primary">Last step</p>
          <h1 className="text-3xl font-medium tracking-tight text-ink md:text-4xl">You're booked</h1>
          <p className="mx-auto max-w-2xl text-lg font-normal text-muted-foreground">
            A few things left: confirm the onboarding call in your email, accept the calendar invite,
            and join us in Slack.
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

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Your spot isn't final until the email confirmation is clicked.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline" size="lg" className="w-full sm:w-[320px]">
            <Link to="/step-2">Back to booking</Link>
          </Button>
          <Button asChild variant="brand" size="lg" className="w-full sm:w-[320px]">
            <a href="https://mail.google.com" target="_blank" rel="noreferrer">
              Open my email
            </a>
          </Button>
        </div>
      </main>
    </div>
  );
}