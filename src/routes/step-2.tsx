import { createFileRoute } from "@tanstack/react-router";
import OnboardingHeader from "@/components/OnboardingHeader";

export const Route = createFileRoute("/step-2")({
  head: () => ({
    meta: [
      { title: "You're In | Lead Genisys Onboarding" },
      {
        name: "description",
        content: "Welcome to Lead Genisys. Here's what happens next: your system build, launch call, and first leads.",
      },
      { property: "og:title", content: "You're In | Lead Genisys Onboarding" },
      {
        property: "og:description",
        content: "Welcome to Lead Genisys. Here's what happens next: your system build, launch call, and first leads.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Step2,
});

const checklist = [
  {
    title: "We're building your system",
    body: "Our team is already working with the details and files you sent.",
  },
  {
    title: "Launch call in 5 days",
    body: "We'll meet in five days to walk you through your new marketing system.",
  },
  {
    title: "Lead generation",
    body: "Expect leads to start coming in from us after a few weeks.",
  },
];

function Step2() {
  return (
    <div className="flex min-h-screen flex-col gradient-hero">
      <OnboardingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="space-y-3 text-center">
          <h1 className="text-3xl font-medium tracking-tight text-ink md:text-4xl">You're in</h1>
          <p className="mx-auto max-w-2xl text-lg font-normal text-muted-foreground">
            Welcome to Lead Genisys.
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
      </main>
    </div>
  );
}
