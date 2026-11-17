import { useCallback, useEffect, useRef, useState } from "react";
import { Check, FileText, Loader2, RotateCcw, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  addFiles,
  BUCKET,
  fromDraftSaved,
  fromSavedPaths,
  MAX_CP575,
  MAX_FILE_BYTES,
  MAX_PHOTOS,
  ownedBy,
  storagePath,
  toDraftSaved,
  TOO_BIG,
  toSessionSaved,
  tooMany,
  uploadedPaths,
  uploadErrorText,
  uploadsSummary,
  type UploadItem,
  type UploadKind,
} from "@/lib/intake-uploads";
import { canPreview, preparePhoto } from "@/lib/photo-prep";
import { cn } from "@/lib/utils";

/**
 * The intake form's file uploads (the rules are in src/lib/intake-uploads.ts).
 *
 * Each file is shrunk, then uploaded as soon as the client's email is confirmed
 * (two at a time, three tries each), with a picture and a status under it, a
 * Retry, and an × to take it out. What's uploaded is remembered in this tab and
 * in the saved draft, so a refresh, a sleeping phone tab or coming back later
 * doesn't lose it. Submit waits for anything still uploading and sends the paths.
 */

const AT_ONCE = 2;
const TRIES = 3;
/** Submit gives up waiting for uploads after this long. */
const WAIT_MS = 10 * 60_000;
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`);

export type IntakeUploads = ReturnType<typeof useIntakeUploads>;

export function useIntakeUploads({ sessionId, signedIn }: { sessionId: string; signedIn: boolean }) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [notice, setNotice] = useState("");
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const signedInRef = useRef(signedIn);
  signedInRef.current = signedIn;
  const busy = useRef(new Set<string>());
  const [restored, setRestored] = useState(false);
  const storageKey = `lead-genisys-uploads:${sessionId || "returning"}`;

  const update = useCallback((id: string, change: (item: UploadItem) => UploadItem) => {
    setItems((prev) => prev.map((i) => (i.id === id ? change(i) : i)));
  }, []);

  // What this tab already uploaded (a refresh, or the tab put to sleep while they confirmed their email).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as unknown;
      const back = fromSavedPaths(saved, null, sessionId);
      if (back.length) setItems((prev) => [...prev, ...back.filter((b) => !prev.some((p) => p.id === b.id))]);
    } catch {
      /* Storage is optional. */
    }
    setRestored(true);
  }, [sessionId, storageKey]);

  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(toSessionSaved(items)));
    } catch {
      /* Storage may be disabled. */
    }
  }, [items, restored, storageKey]);

  // Pictures of the files are page-only: freed when the form goes away.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);
  const preview = (file: File): string | undefined => {
    if (!canPreview(file) || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return undefined;
    const url = URL.createObjectURL(file);
    previews.current.add(url);
    return url;
  };

  /** One file, as far as it can go now: shrunk first; uploaded once the client is signed in. */
  const advance = useCallback(
    async (item: UploadItem) => {
      if (busy.current.has(item.id)) return;
      busy.current.add(item.id);
      try {
        let file = item.file;
        if (!file) return;
        if (!item.prepared) {
          update(item.id, (i) => ({ ...i, status: "preparing" }));
          const prep = await preparePhoto(file);
          file = prep.file;
          const ready = file;
          const url = preview(ready);
          update(item.id, (i) => ({
            ...i,
            file: ready,
            size: ready.size,
            type: ready.type,
            prepared: true,
            status: "waiting",
            ...(prep.note ? { note: prep.note } : {}),
            ...(url ? { previewUrl: url } : {}),
          }));
          if (ready.size > MAX_FILE_BYTES) {
            update(item.id, (i) => ({ ...i, status: "error", error: TOO_BIG }));
            return;
          }
        }
        if (!signedInRef.current) return;
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user.id;
        if (!userId) return;
        update(item.id, (i) => ({ ...i, status: "uploading" }));
        const path = storagePath(userId, sessionId, item, file.name);
        for (let attempt = 1; ; attempt++) {
          const { error } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, { upsert: false, ...(file.type ? { contentType: file.type } : {}) });
          const why = error ? uploadErrorText(error.message) : null;
          if (!why || why.alreadyThere) {
            update(item.id, (i) => {
              const { file: _sent, ...rest } = i;
              return { ...rest, status: "done", path, tries: attempt };
            });
            return;
          }
          if (!why.retryable || attempt >= TRIES) {
            update(item.id, (i) => ({ ...i, status: "error", error: why.text, tries: attempt }));
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
        }
      } catch (err) {
        const why = uploadErrorText(err instanceof Error ? err.message : String(err));
        update(item.id, (i) => ({ ...i, status: "error", error: why.text || "This file didn’t upload. Tap Retry, or remove it." }));
      } finally {
        busy.current.delete(item.id);
      }
    },
    [sessionId, update],
  );

  // Two files at a time: shrinking can start straight away, uploading once signed in.
  useEffect(() => {
    let slots = AT_ONCE - items.filter((i) => i.status === "preparing" || i.status === "uploading").length;
    for (const i of items) {
      if (slots <= 0) break;
      if (i.status !== "waiting" || !i.file || busy.current.has(i.id)) continue;
      if (i.prepared && !signedIn) continue;
      slots--;
      void advance(i);
    }
  }, [items, signedIn, advance]);

  const add = useCallback((picked: File[], kind: UploadKind) => {
    setItems((prev) => {
      const r = addFiles(prev, picked, kind, newId);
      if (kind === "photo") setNotice(r.skipped ? tooMany(MAX_PHOTOS) : "");
      return r.items;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const gone = prev.find((i) => i.id === id);
      if (gone?.previewUrl) {
        URL.revokeObjectURL(gone.previewUrl);
        previews.current.delete(gone.previewUrl);
      }
      return prev.filter((i) => i.id !== id);
    });
    setNotice("");
  }, []);

  const retry = useCallback((id: string) => {
    update(id, (i) => {
      const { error: _old, ...rest } = i;
      return { ...rest, status: "waiting", tries: 0 };
    });
  }, [update]);

  /** The signed-in client is known: uploads saved in their draft come back, and nobody else's stay. */
  const claim = useCallback((userId: string, draft: unknown) => {
    const saved = draft && typeof draft === "object" ? (draft as Record<string, unknown>)["uploadedFiles"] : undefined;
    const back = fromDraftSaved(saved, userId, sessionId);
    setItems((prev) => {
      const kept = ownedBy(prev, userId);
      return [...kept, ...back.filter((b) => !kept.some((k) => k.id === b.id))];
    });
  }, [sessionId]);

  /** What the saved draft keeps of the uploads. */
  const draftValue = useCallback((userId: string) => toDraftSaved(itemsRef.current, userId, sessionId), [sessionId]);

  /** Resolves once nothing is still shrinking or uploading; rejects while a file has failed. */
  const waitForUploads = useCallback(
    () =>
      new Promise<void>((resolve, reject) => {
        const started = Date.now();
        const check = () => {
          const list = itemsRef.current;
          const failed = list.filter((i) => i.status === "error").length;
          if (failed) {
            reject(new Error(failed === 1 ? "1 file didn’t upload. Tap Retry next to it, or remove it, then submit again." : `${failed} files didn’t upload. Tap Retry next to each, or remove them, then submit again.`));
            return;
          }
          if (!list.some((i) => i.status !== "done")) {
            resolve();
            return;
          }
          if (Date.now() - started > WAIT_MS) {
            reject(new Error("Your files are taking too long to upload. Check your connection and try again."));
            return;
          }
          setTimeout(check, 300);
        };
        check();
      }),
    [],
  );

  const done = items.filter((i) => i.status === "done").length;
  const failed = items.filter((i) => i.status === "error").length;
  return {
    items,
    notice,
    add,
    remove,
    retry,
    claim,
    draftValue,
    waitForUploads,
    paths: () => uploadedPaths(itemsRef.current),
    done,
    failed,
    pending: items.length - done - failed,
    total: items.length,
  };
}

export function FileUploads({
  uploads,
  kind,
  inputId,
  label,
  description,
  hint,
  accept,
  signedIn,
}: {
  uploads: IntakeUploads;
  kind: UploadKind;
  inputId: string;
  label: string;
  description: string;
  hint: string;
  accept: string;
  signedIn: boolean;
}) {
  const mine = uploads.items.filter((i) => i.kind === kind);
  const max = kind === "photo" ? MAX_PHOTOS : MAX_CP575;
  const full = kind === "photo" && mine.length >= max;
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const summary = uploadsSummary(uploads.items, kind, signedIn);
  const pick = (files: FileList | File[] | null) => {
    const list = files ? Array.from(files) : [];
    if (list.length) uploads.add(list, kind);
  };
  return (
    <div id={`field-${inputId}`} className="rounded-xl border bg-card p-5">
      <label htmlFor={inputId} className="block text-base font-normal text-ink">
        {label}
      </label>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files);
        }}
        className={cn(
          "mt-3 flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-input px-4 py-5 text-center",
          dragging && "border-primary bg-primary/5",
        )}
      >
        <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
        <Button type="button" variant="outline" disabled={full} onClick={() => input.current?.click()}>
          {kind === "cp575"
            ? mine.length
              ? "Choose a different file"
              : "Choose a file"
            : full
              ? `${max} files added`
              : mine.length
                ? "Add more"
                : "Choose photos or files"}
        </Button>
        <p className="text-xs text-muted-foreground">{hint}</p>
        <input
          ref={input}
          id={inputId}
          type="file"
          multiple={kind === "photo"}
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            pick(e.target.files);
            // So the same file can be picked again after it was removed.
            e.target.value = "";
          }}
        />
      </div>
      {kind === "photo" && uploads.notice ? (
        <p className="mt-2 text-sm text-amber-700 dark:text-amber-400" role="status">
          {uploads.notice}
        </p>
      ) : null}
      {mine.length > 0 ? (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {mine.map((item) => (
            <UploadTile key={item.id} item={item} signedIn={signedIn} onRemove={() => uploads.remove(item.id)} onRetry={() => uploads.retry(item.id)} />
          ))}
        </ul>
      ) : null}
      {summary ? (
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          {summary}
        </p>
      ) : null}
    </div>
  );
}

function UploadTile({ item, signedIn, onRemove, onRetry }: { item: UploadItem; signedIn: boolean; onRemove: () => void; onRetry: () => void }) {
  const working = item.status === "preparing" || item.status === "uploading";
  const state =
    item.status === "done"
      ? "Uploaded"
      : item.status === "preparing"
        ? "Preparing…"
        : item.status === "uploading"
          ? "Uploading…"
          : item.status === "error"
            ? (item.error ?? "Didn’t upload")
            : signedIn
              ? "Waiting its turn"
              : "Uploads once you're signed in";
  return (
    <li className={cn("relative overflow-hidden rounded-lg border bg-background", item.status === "error" && "border-destructive/60")}>
      <div className="relative flex aspect-[4/3] items-center justify-center bg-muted/40">
        {item.previewUrl ? (
          <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <FileText className="h-8 w-8 text-muted-foreground" aria-hidden />
        )}
        {working ? (
          <span className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
          </span>
        ) : null}
        {item.status === "done" ? (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-primary p-0.5 text-primary-foreground" aria-hidden>
            <Check className="h-3 w-3" />
          </span>
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.name}`}
          className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-foreground shadow hover:bg-background"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
      <div className="p-2">
        <p className="truncate text-xs text-foreground" title={item.name}>
          {item.name}
        </p>
        <p className={cn("mt-0.5 text-[11px] leading-snug", item.status === "error" ? "text-destructive" : "text-muted-foreground")}>{state}</p>
        {item.note ? <p className="mt-0.5 text-[11px] leading-snug text-amber-700 dark:text-amber-400">{item.note}</p> : null}
        {item.status === "error" && item.file ? (
          <button type="button" onClick={onRetry} className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary underline-offset-2 hover:underline">
            <RotateCcw className="h-3 w-3" aria-hidden /> Retry
          </button>
        ) : null}
      </div>
    </li>
  );
}
