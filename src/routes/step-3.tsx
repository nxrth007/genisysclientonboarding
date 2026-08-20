import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Mail, CalendarCheck, ShieldCheck } from "lucide-react";
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
    icon: Mail,
    title: "Open your email inbox",
    body: "Look for the confirmation email from Lead Genisys. Check spam or promotions if it isn't in your primary inbox.",
  },
  {
    icon: CheckCircle2,
    title: "Confirm the onboarding call",
    body: "Click the confirmation link in that email so your launch call is locked in with our team.",
  },
  {
    icon: CalendarCheck,
    title: "Accept the calendar invite",
    body: "Add the invite to your calendar so you get the reminders and the meeting link ahead of the call.",
  },
];

function Step3() {
  return (
    <div className="flex min-h-screen flex-col gradient-hero">
      <OnboardingHeader current={3} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="space-y-4 text-center">
          <span className="gradient-primary shadow-button mx-auto flex size-16 items-center justify-center rounded-full text-primary-foreground">
            <CheckCircle2 className="size-8" />
          </span>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Last step</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">You're booked</h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            One thing left: go into your email and confirm the onboarding call and the invite.
          </p>
        </div>

        <ol className="mt-10 space-y-4">
          {checklist.map((item, i) => (
            <li
              key={item.title}
              className="shadow-card flex gap-4 rounded-xl border bg-card p-6 text-left"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold text-ink">
                  {i + 1}. {item.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          Your spot isn't final until the email confirmation is clicked.
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline" size="lg">
            <Link to="/step-2">Back to booking</Link>
          </Button>
          <Button asChild size="lg" variant="brand">
            <a href="https://mail.google.com" target="_blank" rel="noreferrer">
              Open my email
            </a>
          </Button>
        </div>
      </main>
    </div>
  );
}