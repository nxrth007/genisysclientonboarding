/**
 * The files a client attaches to the intake form: photos of their work, their logo,
 * and the CP-575 letter. This is the part with no browser in it (the tests load it):
 * which picked files are kept, how each is named in storage, what is remembered
 * between visits, and what to say when an upload fails. The uploading itself is in
 * src/components/FileUploads.tsx.
 *
 * Why it's built this way (2026-11-17, after clients lost their photos): files used
 * to sit in the page's memory until Submit, then upload one after another at full
 * size with no progress shown. A refresh, a phone putting the tab to sleep while the
 * client confirmed their email, or one failed upload lost all of them. Now each file
 * uploads as soon as it can, is shrunk first, and is remembered once it's up.
 */

export const MAX_PHOTOS = 20;
export const MAX_CP575 = 1;
/** Storage refuses anything bigger; photos are shrunk well under this before upload. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const BUCKET = "intake-uploads";

export type UploadKind = "photo" | "cp575";
export type UploadStatus = "waiting" | "preparing" | "uploading" | "done" | "error";

export type UploadItem = {
  /** Also the file's folder in storage, so two photos named IMG_0001.jpg never collide. */
  id: string;
  kind: UploadKind;
  name: string;
  size: number;
  type: string;
  status: UploadStatus;
  /** Where it is in the bucket, once uploaded. */
  path?: string;
  error?: string;
  /** Worth knowing but not a failure (an iPhone HEIC photo, say). */
  note?: string;
  /** A picture of it for the page; never saved. */
  previewUrl?: string;
  /** The file itself until it's uploaded; never saved. */
  file?: File;
  /** Photos are shrunk once before they upload. */
  prepared?: boolean;
  tries: number;
};

export const TOO_BIG = "This file is too big. Please keep files under 25 MB.";
export const tooMany = (max: number) => `Only ${max} files can be sent. The first ${max} you added are kept; remove one to swap it.`;

const IMAGE_NAME = /\.(jpe?g|png|gif|webp|heic|heif|svg|bmp|tiff?|avif)$/i;
export const isImageFile = (f: { name: string; type: string }) => f.type.startsWith("image/") || IMAGE_NAME.test(f.name);
export const isHeic = (f: { name: string; type: string }) => /\.(heic|heif)$/i.test(f.name) || /image\/hei[cf]/i.test(f.type);

function fresh(file: File, kind: UploadKind, id: string): UploadItem {
  // Photos are shrunk before their size is judged; anything else over the limit is told so now.
  const tooBig = file.size > MAX_FILE_BYTES && !isImageFile(file);
  return {
    id,
    kind,
    name: file.name,
    size: file.size,
    type: file.type,
    status: tooBig ? "error" : "waiting",
    ...(tooBig ? { error: TOO_BIG } : {}),
    file,
    tries: 0,
  };
}

/**
 * Picked files added to the list. Photos: no file twice (same name and size), at
 * most MAX_PHOTOS in all, and the count that didn't fit. The CP-575: one file; a
 * new pick replaces it.
 */
export function addFiles(
  items: UploadItem[],
  picked: File[],
  kind: UploadKind,
  newId: () => string,
): { items: UploadItem[]; added: number; skipped: number } {
  if (kind === "cp575") {
    const file = picked[0];
    if (!file) return { items, added: 0, skipped: 0 };
    return { items: [...items.filter((i) => i.kind !== "cp575"), fresh(file, kind, newId())], added: 1, skipped: Math.max(0, picked.length - 1) };
  }
  const mine = items.filter((i) => i.kind === "photo");
  const seen = new Set(mine.map((i) => `${i.name}|${i.size}`));
  let room = MAX_PHOTOS - mine.length;
  const out = [...items];
  let added = 0;
  let skipped = 0;
  for (const file of picked) {
    const key = `${file.name}|${file.size}`;
    if (seen.has(key)) continue;
    if (room <= 0) {
      skipped++;
      continue;
    }
    seen.add(key);
    room--;
    added++;
    out.push(fresh(file, kind, newId()));
  }
  return { items: out, added, skipped };
}

/** A storage name from theirs: letters, digits, dots and dashes, at most 60 characters, extension kept. */
export function safeFileName(name: string): string {
  const cleaned = name.trim().replace(/[^a-zA-Z0-9._-]+/g, "_");
  const dot = cleaned.lastIndexOf(".");
  const ext = dot > 0 ? cleaned.slice(dot).replace(/[^a-zA-Z0-9.]/g, "").slice(0, 10) : "";
  const base = (dot > 0 ? cleaned.slice(0, dot) : cleaned).replace(/^[_.]+|[_.]+$/g, "").slice(0, 60 - ext.length) || "file";
  return `${base}${ext}`;
}

/**
 * The file's place in the bucket: the signed-in user's folder (the storage rule
 * insists on it), then "returning" (the one second folder the rule allows
 * everyone; checkout-named folders are only allowed for test ids, and the
 * submission ledger, not the path, ties files to a checkout), then a folder of
 * its own. The Hub reads the CP-575 by its "cp575-" name.
 */
export function storagePath(userId: string, _sessionId: string, item: Pick<UploadItem, "id" | "kind">, name: string): string {
  return `${userId}/returning/${item.id}/${item.kind === "cp575" ? "cp575-" : ""}${safeFileName(name)}`;
}

const SAVED_PATH = /^[0-9a-f-]{36}\/(cs_(?:test|live)_[A-Za-z0-9]+|returning)\/([0-9a-f-]{36})\/((cp575-)?[A-Za-z0-9._-]{1,70})$/;

/** What this tab remembers of uploaded files (sessionStorage), so a refresh doesn't lose them. */
export function toSessionSaved(items: UploadItem[]): string[] {
  return items.flatMap((i) => (i.status === "done" && i.path ? [i.path] : []));
}

/**
 * Uploaded files back from a saved list of paths: those in the shared
 * "returning" folder, or in this checkout's own folder (older uploads), and,
 * once the signed-in user is known, only theirs (`userId` null means not yet).
 */
export function fromSavedPaths(paths: unknown, userId: string | null, sessionId: string): UploadItem[] {
  if (!Array.isArray(paths)) return [];
  const out: UploadItem[] = [];
  for (const p of paths) {
    if (typeof p !== "string") continue;
    const m = SAVED_PATH.exec(p);
    if (!m) continue;
    const [, session, id, file, cp] = m;
    if ((session !== "returning" && session !== sessionId) || (userId && !p.startsWith(`${userId}/`))) continue;
    if (!id || !file || out.some((i) => i.id === id)) continue;
    out.push({ id, kind: cp ? "cp575" : "photo", name: cp ? file.slice(6) : file, size: 0, type: "", status: "done", path: p, prepared: true, tries: 0 });
  }
  return out;
}

/** Only this user's uploads are kept (a tab remembered someone else's, say). */
export function ownedBy(items: UploadItem[], userId: string): UploadItem[] {
  return items.filter((i) => !i.path || i.path.startsWith(`${userId}/`));
}

/** What the saved draft keeps (the answers record takes strings): the paths without the user's folder. */
export function toDraftSaved(items: UploadItem[], userId: string, _sessionId: string): string {
  const prefix = `${userId}/returning/`;
  return JSON.stringify(toSessionSaved(items).filter((p) => p.startsWith(prefix)).map((p) => p.slice(prefix.length)));
}

export function fromDraftSaved(value: unknown, userId: string, sessionId: string): UploadItem[] {
  if (typeof value !== "string" || !value.startsWith("[")) return [];
  try {
    const list = JSON.parse(value) as unknown;
    const prefix = `${userId}/returning/`;
    return fromSavedPaths(Array.isArray(list) ? list.map((p) => (typeof p === "string" ? prefix + p : p)) : [], userId, sessionId);
  } catch {
    return [];
  }
}

/** The uploaded paths in the order they're sent: photos as listed, the CP-575 last. */
export function uploadedPaths(items: UploadItem[]): string[] {
  const done = items.filter((i) => i.status === "done" && i.path);
  return [...done.filter((i) => i.kind === "photo"), ...done.filter((i) => i.kind === "cp575")].map((i) => i.path as string);
}

/** Storage's error, in the client's words, and whether trying again by itself can help. */
export function uploadErrorText(raw: string): { text: string; retryable: boolean; alreadyThere?: boolean } {
  const m = raw.toLowerCase();
  if (/already exists|duplicate/.test(m)) return { text: "", retryable: false, alreadyThere: true };
  if (/row-level security|violates|unauthorized|jwt|not authenticated|no api key|\b40[13]\b/.test(m)) {
    return { text: "Confirm your account email at the bottom of the form, then tap Retry.", retryable: false };
  }
  if (/payload too large|maximum allowed size|exceeded|too large|\b413\b/.test(m)) return { text: TOO_BIG, retryable: false };
  if (/failed to fetch|network|load failed|timeout|timed out|aborted|\b50[234]\b|socket/.test(m)) {
    return { text: "The connection dropped. Check your signal and tap Retry.", retryable: true };
  }
  return { text: "This file didn’t upload. Tap Retry, or remove it and add it again.", retryable: true };
}

/** One line under the file list. */
export function uploadsSummary(items: UploadItem[], kind: UploadKind, signedIn: boolean): string {
  const mine = items.filter((i) => i.kind === kind);
  if (!mine.length) return "";
  const done = mine.filter((i) => i.status === "done").length;
  const failed = mine.filter((i) => i.status === "error").length;
  const parts: string[] = [];
  if (kind === "photo") parts.push(`${mine.length} of ${MAX_PHOTOS} added`);
  if (done) parts.push(`${done} uploaded`);
  if (failed) parts.push(`${failed} didn’t upload`);
  if (!signedIn && done < mine.length - failed) parts.push("the rest upload once you're signed in (bottom of the form)");
  return parts.join(" · ");
}
