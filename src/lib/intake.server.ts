import { FIELDS_AFTER_FILES, FIELDS_BEFORE_FILES, SHEET_HEADERS } from "./intake-fields";
import { buildIntakeWebhookPayload, sendIntakeWebhooks } from "./intake-webhook.server";
import { onboardToSlack } from "./slack.server";

const SPREADSHEET_ID = "1NGkkUtVM0tf1J8G8ibCLQ0LIB9RK_EtnXgipHizYCIs";
const SHEET_NAME = "Sheet1";
const GATEWAY = "https://connector-gateway.lovable.dev/google_sheets/v4";
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 5;

export type IntakeSubmission = {
  answers: Record<string, string>;
  filePaths: string[];
};

function gatewayHeaders() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_SHEETS_API_KEY"];
  if (!lovableKey || !connectionKey) {
    throw new Error("Google Sheets connection is not configured");
  }
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
    "Content-Type": "application/json",
  };
}

async function sheetsFetch(path: string, init: RequestInit) {
  const res = await fetch(`${GATEWAY}/spreadsheets/${SPREADSHEET_ID}${path}`, {
    ...init,
    headers: gatewayHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Google Sheets request failed [${res.status}]: ${body}`);
    throw new Error(`Google Sheets request failed [${res.status}]: ${body}`);
  }
  return res.json();
}

async function ensureHeaderRow() {
  const existing = (await sheetsFetch(`/values/${SHEET_NAME}!A1:AZ1`, { method: "GET" })) as {
    values?: string[][];
  };
  const current = existing.values?.[0] ?? [];
  const matches =
    SHEET_HEADERS.length === current.length &&
    SHEET_HEADERS.every((header, index) => header === current[index]);
  if (matches) return;
  await sheetsFetch(
    `/values/${SHEET_NAME}!A1?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ values: [SHEET_HEADERS] }) },
  );
}

async function signFiles(filePaths: string[]): Promise<string[]> {
  if (filePaths.length === 0) return [];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const urls: string[] = [];
  for (const path of filePaths) {
    const { data, error } = await supabaseAdmin.storage
      .from("intake-uploads")
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error) {
      console.error(`Could not sign upload ${path}: ${error.message}`);
      continue;
    }
    if (data?.signedUrl) urls.push(data.signedUrl);
  }
  return urls;
}

export async function recordIntakeSubmission({ answers, filePaths }: IntakeSubmission) {
  await ensureHeaderRow();
  const submittedAt = new Date().toISOString();
  const fileUrls = await signFiles(filePaths);
  const payload = buildIntakeWebhookPayload(answers, fileUrls, submittedAt);
  const row = [
    submittedAt,
    ...FIELDS_BEFORE_FILES.map((field) => answers[field.id] ?? ""),
    fileUrls.join("\n"),
    ...FIELDS_AFTER_FILES.map((field) => answers[field.id] ?? ""),
  ];
  await sheetsFetch(
    `/values/${SHEET_NAME}!A1:AZ1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", body: JSON.stringify({ values: [row] }) },
  );
  const [, slack] = await Promise.all([sendIntakeWebhooks(payload), onboardToSlack(payload)]);
  return { ok: true as const, payload, slack };
}