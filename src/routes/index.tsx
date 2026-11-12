import { createFileRoute } from "@tanstack/react-router";
import OnboardingHeader from "@/components/OnboardingHeader";
import IntakeForm from "@/components/IntakeForm";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => (typeof search["session_id"] === "string" ? { session_id: search["session_id"] } : {}),
  head: () => ({
    meta: [
      { title: "Step 1: Client Intake Form | Lead Genisys Onboarding" },
      {
        name: "description",
        content:
          "Start your Lead Genisys onboarding by completing the client intake form so we can build your lead generation system.",
      },
      { property: "og:title", content: "Step 1: Client Intake Form | Lead Genisys Onboarding" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const { session_id } = Route.useSearch();
  return (
    <div className="flex min-h-screen flex-col gradient-hero">
      <OnboardingHeader current={1} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-medium tracking-tight text-ink md:text-4xl">
            Please fill out this client intake form
          </h1>
          <p className="mx-auto max-w-2xl text-lg font-normal text-muted-foreground">
            This gives our team everything needed to build your campaigns. Complete every field, and
            please don't rush through it — the detail you give us here is exactly what your campaigns
            are built from.
          </p>
        </div>

        <IntakeForm sessionId={session_id ?? ""} />
      </main>
    </div>
  );
}
