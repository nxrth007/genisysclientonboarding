import { Link } from "@tanstack/react-router";

import OnboardingHeader from "@/components/OnboardingHeader";
import { POLICIES, type PolicyKey } from "@/lib/policies";

export default function PolicyPage({ policyKey }: { policyKey: PolicyKey }) {
  const policy = POLICIES[policyKey];
  return (
    <div className="flex min-h-screen flex-col gradient-hero">
      <OnboardingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <p className="text-sm text-primary">Lead Genisys</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-ink">{policy.title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Version {policy.version}. The box below is the exact policy text your acceptance record
          hashes.
          {policy.draft
            ? " This page is a draft and needs the owner's legal review before it is treated as final."
            : " This is the Terms of Service published for Lead Genisys sign-up, last updated August 6, 2026."}
        </p>
        <pre className="mt-6 whitespace-pre-wrap rounded-xl border bg-card p-5 font-sans text-sm leading-relaxed text-foreground">
          {policy.text}
        </pre>
        <p className="mt-8 text-sm text-muted-foreground">
          <Link to="/" className="underline underline-offset-2">
            Back to the intake form
          </Link>
        </p>
      </main>
    </div>
  );
}
