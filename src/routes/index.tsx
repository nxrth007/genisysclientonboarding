import { createFileRoute } from "@tanstack/react-router";
import OnboardingHeader from "@/components/OnboardingHeader";
import IntakeForm from "@/components/IntakeForm";

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

        <IntakeForm />
      </main>
    </div>
  );
}
