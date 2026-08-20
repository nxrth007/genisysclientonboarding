import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import OnboardingHeader from "@/components/OnboardingHeader";

const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSedo_EdleV9-SOkeVhG6tWeEpAWDzFc_Pg4V_0SuZdJMOAsvQ/viewform";
const EMBED_URL = `${FORM_URL}?embedded=true`;

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

        <div className="shadow-card mt-10 overflow-hidden rounded-xl border bg-card">
          <iframe
            src={EMBED_URL}
            title="Client intake form"
            className="h-[1400px] w-full"
            loading="lazy"
          />
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Trouble loading the form?{" "}
          <a
            href={FORM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-medium text-primary underline underline-offset-4"
          >
            Open it in a new tab
            <ExternalLink className="size-3" />
          </a>
        </p>

        <div className="mt-10 flex justify-center">
          <Button asChild variant="brand" size="xl">
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
