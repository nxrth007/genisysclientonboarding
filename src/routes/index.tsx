import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import OnboardingHeader from "@/components/OnboardingHeader";

const FORM_EMBED_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSedo_EdleV9-SOkeVhG6tWeEpAWDzFc_Pg4V_0SuZdJMOAsvQ/viewform?embedded=true";

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
          <p className="text-sm text-primary">Step 1 of 3</p>
          <h1 className="text-3xl font-medium tracking-tight text-ink md:text-4xl">
            Please fill out this client intake form
          </h1>
          <p className="mx-auto max-w-2xl text-lg font-normal text-muted-foreground">
            This gives our team everything needed to build your campaigns. Complete every field, then
            continue to book your launch call.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border bg-card">
          <iframe
            src={FORM_EMBED_URL}
            title="Client intake form"
            loading="lazy"
            className="h-[2400px] w-full"
          />
        </div>

        <div className="mt-8 flex justify-center">
          <Button asChild variant="brand" size="lg" className="w-full sm:w-[320px]">
            <Link to="/step-2">
              Continue to Step 2
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
