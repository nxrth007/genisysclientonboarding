import type { IntakeWebhookPayload } from "./intake-webhook.server";

export type SlackOnboardResult = {
  ok: boolean;
  channelName?: string;
  invited?: boolean;
  error?: string;
};

/**
 * Calls Slack with the custom bot token (SLACK_BOT_TOKEN) when present,
 * otherwise through the linked Slack connector (SLACK_API_KEY via gateway).
 */
async function slackFetch(method: string, body: Record<string, unknown>): Promise<any> {
  const botToken = process.env["SLACK_BOT_TOKEN"];
  let url: string;
  let headers: Record<string, string>;
  if (botToken) {
    url = `https://slack.com/api/${method}`;
    headers = { Authorization: `Bearer ${botToken}` };
  } else {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const connKey = process.env["SLACK_API_KEY"];
    if (!lovableKey || !connKey) throw new Error("Slack is not configured");
    url = `https://connector-gateway.lovable.dev/slack/api/${method}`;
    headers = { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": connKey };
  }
  const res = await fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} failed [${res.status}]: ${text.slice(0, 300)}`);
  const data = JSON.parse(text);
  if (!data.ok) throw new Error(`${method}: ${data.error ?? "unknown_error"}`);
  return data;
}

function slugify(name: string) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `client-${slug || "new"}`.slice(0, 70);
}

async function createChannel(base: string): Promise<{ id: string; name: string }> {
  for (let i = 0; i < 10; i++) {
    const name = i === 0 ? base : `${base}-${i + 1}`;
    try {
      const data = await slackFetch("conversations.create", { name, is_private: true });
      return { id: data.channel.id, name: data.channel.name };
    } catch (e) {
      if (e instanceof Error && e.message.includes("name_taken")) continue;
      throw e;
    }
  }
  throw new Error("Could not find a free channel name");
}

function alertChannel() {
  return (process.env["SLACK_ALERT_CHANNEL"] ?? "new-clients").replace(/^#/, "");
}

async function postAlert(text: string) {
  try {
    await slackFetch("chat.postMessage", { channel: alertChannel(), text });
  } catch (e) {
    console.error("Slack alert failed", e);
  }
}

function summary(payload: IntakeWebhookPayload) {
  const a = payload.answers;
  return [
    `*New client intake:* ${a.businessName || a.fullName}`,
    `• Name: ${a.fullName}`,
    `• Email: ${a.leadEmail}`,
    `• Phone: ${a.customerPhone}`,
    `• Cities: ${a.cities}`,
    `• Website: ${a.website}`,
    `• Own domain: ${a.bringingOwnDomain}${a.domainName ? ` (${a.domainName})` : ""}`,
    payload.files.length ? `• Files: ${payload.files.length} uploaded` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Never throws: Slack problems must not break the client's submission. */
export async function onboardToSlack(payload: IntakeWebhookPayload): Promise<SlackOnboardResult> {
  const a = payload.answers;
  let channel: { id: string; name: string } | undefined;
  try {
    channel = await createChannel(slugify(a.businessName || a.fullName || ""));

    const teamEmails = (process.env["SLACK_TEAM_EMAILS"] ?? "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const userIds: string[] = [];
    for (const email of teamEmails) {
      try {
        const u = await slackFetch("users.lookupByEmail", { email });
        userIds.push(u.user.id);
      } catch (e) {
        console.error(`Slack lookup failed for ${email}`, e);
      }
    }
    if (userIds.length) {
      try {
        await slackFetch("conversations.invite", { channel: channel.id, users: userIds.join(",") });
      } catch (e) {
        console.error("Slack team invite failed", e);
      }
    }

    await slackFetch("chat.postMessage", {
      channel: channel.id,
      text: `Welcome ${a.fullName}! This is your private channel with the Lead Genisys team.`,
    });

    await slackFetch("conversations.inviteShared", { channel: channel.id, emails: [a.leadEmail] });

    await postAlert(`${summary(payload)}\n• Channel: #${channel.name} — Slack invite sent to ${a.leadEmail}`);
    return { ok: true, channelName: channel.name, invited: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("Slack onboarding failed", error);
    await postAlert(
      `${summary(payload)}\n:warning: Automatic Slack invite failed (${error}).${
        channel ? ` Channel #${channel.name} was created.` : ""
      } Please invite ${a.leadEmail} manually.`,
    );
    return { ok: false, channelName: channel?.name, invited: false, error };
  }
}
