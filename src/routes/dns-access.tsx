import { createFileRoute } from "@tanstack/react-router";

import { DNS_ACCESS_EMAIL } from "@/lib/intake-fields";

export const Route = createFileRoute("/dns-access")({
  head: () => ({
    meta: [
      { title: "How to Give DNS Access | Lead Genisys Onboarding" },
      {
        name: "description",
        content:
          "Step-by-step instructions for granting Lead Genisys DNS access to your domain at GoDaddy, Namecheap, Cloudflare, Squarespace, Wix, Hostinger and more.",
      },
      { property: "og:title", content: "How to Give DNS Access | Lead Genisys Onboarding" },
      {
        property: "og:description",
        content:
          "Step-by-step instructions for granting Lead Genisys DNS access to your domain at your registrar.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DnsAccess,
});

const registrars: { name: string; steps: string[] }[] = [
  {
    name: "GoDaddy",
    steps: [
      "Sign in at godaddy.com and open Account Settings → Delegate Access.",
      "Under \"People who can access my account\", click Invite to Access.",
      `Enter the name "Lead Genisys" and the email ${DNS_ACCESS_EMAIL}.`,
      "Choose the access level \"Products, Domains & Purchase\" (Domains access is the part we need).",
      "Click Invite. We'll accept the invite and handle the DNS records.",
    ],
  },
  {
    name: "Namecheap",
    steps: [
      "Sign in at namecheap.com and open Profile → Manage Users (or Account → Users).",
      "Click Add User / Invite user.",
      `Enter ${DNS_ACCESS_EMAIL} and give the user access to the domain in question.`,
      "Save and send the invite.",
      "If your plan doesn't offer user access, use the fallback option at the bottom of this page instead.",
    ],
  },
  {
    name: "Cloudflare",
    steps: [
      "Sign in at dash.cloudflare.com and select your account (not the individual domain).",
      "Open Manage Account → Members → Invite.",
      `Enter ${DNS_ACCESS_EMAIL}.`,
      "Scope the invite to your domain and choose the DNS role (or Administrator if roles aren't available).",
      "Send the invite.",
    ],
  },
  {
    name: "Squarespace (formerly Google Domains)",
    steps: [
      "Sign in at squarespace.com and open the site or domain dashboard.",
      "Go to Settings → Permissions → Invite Contributor.",
      `Enter ${DNS_ACCESS_EMAIL} and choose the Administrator permission so DNS can be edited.`,
      "Send the invitation.",
    ],
  },
  {
    name: "Wix",
    steps: [
      "Sign in at wix.com and open your site dashboard.",
      "Go to Settings → Roles & Permissions → Invite People.",
      `Enter ${DNS_ACCESS_EMAIL} and assign the Website Manager or Admin role.`,
      "Send the invite.",
    ],
  },
  {
    name: "Hostinger",
    steps: [
      "Sign in at hpanel.hostinger.com.",
      "Open Account Sharing (under your account menu) → Add member.",
      `Enter ${DNS_ACCESS_EMAIL} and grant access to your domain / DNS zone editor.`,
      "Confirm to send the invite.",
    ],
  },
  {
    name: "Bluehost / HostGator",
    steps: [
      "Sign in to your hosting account and open Domains → your domain.",
      "Look for Users, Account Access, or Delegate Access.",
      `Add ${DNS_ACCESS_EMAIL} with permission to manage DNS or advanced DNS records.`,
      "If your plan has no user sharing, use the fallback option below.",
    ],
  },
  {
    name: "My registrar isn't listed",
    steps: [
      "Look in your account for anything named Users, Team, Members, Delegate Access, or Permissions.",
      `Invite ${DNS_ACCESS_EMAIL} with permission to manage DNS records.`,
      "If there is no way to invite a user, message us in Slack — we'll send you the exact DNS records to paste in yourself, and we'll walk through it together on your launch call.",
    ],
  },
];

function DnsAccess() {
  return (
    <div className="flex min-h-screen flex-col gradient-hero">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <div className="space-y-3 text-center">
          <p className="text-sm text-primary">Bringing your own domain</p>
          <h1 className="text-3xl font-medium tracking-tight text-ink md:text-4xl">
            How to give us DNS access
          </h1>
          <p className="mx-auto max-w-2xl text-lg font-normal text-muted-foreground">
            Your domain stays yours. We only need permission to manage its DNS records so your site,
            tracking number, and email can go live.
          </p>
        </div>

        <div className="mt-8 rounded-xl border bg-card p-5">
          <p className="text-sm font-normal text-muted-foreground">
            Invite this email at your registrar:
          </p>
          <p className="mt-1 text-lg font-medium text-ink">{DNS_ACCESS_EMAIL}</p>
          <p className="mt-3 text-sm font-normal text-muted-foreground">
            Never share your account password with anyone — including us. Every option below uses
            your registrar's own invite or delegate feature instead.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {registrars.map((registrar) => (
            <details key={registrar.name} className="rounded-xl border bg-card p-5">
              <summary className="cursor-pointer text-base font-medium text-ink">
                {registrar.name}
              </summary>
              <ol className="mt-4 space-y-3">
                {registrar.steps.map((step, i) => (
                  <li key={step} className="flex gap-3 text-sm font-normal text-muted-foreground">
                    <span className="text-primary">{i + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </details>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Once the invite is accepted we'll confirm in Slack and take it from there.
        </p>
      </main>
    </div>
  );
}
