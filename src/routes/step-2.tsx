import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import OnboardingHeader from "@/components/OnboardingHeader";

const BOOKING_URL = "https://api.leadconnectorhq.com/widget/booking/UNKaVSykfrG4sGyD5Bti";

export const Route = createFileRoute("/step-2")({
  head: () => ({
    meta: [
      { title: "Step 2: Book Your Launch Call | Lead Genisys Onboarding" },
      {
        name: "description",
        content:
          "Schedule your Lead Genisys launch call for five days from today so your campaigns go live on time.",
      },
      { property: "og:title", content: "Step 2: Book Your Launch Call | Lead Genisys Onboarding" },
      {
        property: "og:description",
        content:
          "Schedule your Lead Genisys launch call for five days from today so your campaigns go live on time.",
      },
    ],
  }),
  component: Step2,
});

function Step2() {
  return (
    <div className="flex min-h-screen flex-col gradient-hero">
      <OnboardingHeader current={2} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Step 2 of 3</p>
          <h1 className="text-3xl font-bold tracking-tight text-ink md:text-4xl">
            Please book your launch call
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            Pick a time starting 5 days from now so our team has time to build your system before we
            meet.
          </p>
        </div>

        <div className="mt-8 overflow-hidden rounded-xl border bg-card shadow-card">
          <iframe
            src={BOOKING_URL}
            id="UNKaVSykfrG4sGyD5Bti_booking"
            title="Book your launch call"
            className="h-[1060px] w-full border-0"
          />
        </div>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="outline" size="lg">
            <Link to="/">Back to Step 1</Link>
          </Button>
          <Button asChild size="xl" variant="brand">
            <Link to="/step-3">
              I've booked my call — Final Step
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}