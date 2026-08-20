import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardList, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import OnboardingHeader from "@/components/OnboardingHeader";

const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSedo_EdleV9-SOkeVhG6tWeEpAWDzFc_Pg4V_0SuZdJMOAsvQ/viewform";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Step 1: Client Intake Form | Lead Genisys Onboarding" },
      {
        name: "description",
        content:
          "Start your Lead Genisys onboarding by completing the client intake form so we can build your lead generation system.",
      },
      { property: "og:title", content: "Step 1: Client Intake Form | Lead Genisys Onboarding" },
      {
        property: "og:description",
        content:
          "Start your Lead Genisys onboarding by completing the client intake form so we can build your lead generation system.",
      },
    ],
  }),
  component: Step1,
});

function Step1() {
  return (
    <div className="flex min-h-screen flex-col gradient-hero">
      <OnboardingHeader current={1} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Step 1 of 3</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Please fill out this client intake form
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            This gives our team everything needed to build your campaigns. Complete every field, then
            continue to book your launch call.
          </p>
        </div>

        <div className="shadow-card mx-auto mt-10 max-w-xl rounded-xl border bg-card p-8 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList className="size-6" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-ink">Client Intake Form</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Takes about 10 minutes. Have your business details, targeting areas and brand assets handy
            before you start.
          </p>
          <Button asChild size="xl" variant="brand" className="mt-6 w-full sm:w-auto">
            <a href={FORM_URL} target="_blank" rel="noreferrer">
              Open the intake form
              <ExternalLink />
            </a>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Opens in a new tab — keep this page open so you can continue.
          </p>
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild variant="outline" size="lg">
            <Link to="/step-2">
              I've submitted the form — continue to Step 2
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
