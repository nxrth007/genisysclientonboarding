import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowBigDown, ArrowRight, ExternalLink, Info } from "lucide-react";

import AddressAutocomplete from "@/components/AddressAutocomplete";
import { FileUploads, useIntakeUploads } from "@/components/FileUploads";
import PhoneInput from "@/components/PhoneInput";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import {
  checkAnswer,
  isAsked,
  normalizeAnswer,
  normalizeAnswers,
  type AnswerCheck,
} from "@/lib/answer-checks";
import {
  FIELDS_AFTER_FILES,
  FIELDS_BEFORE_FILES,
  FILE_FIELD_LABEL,
  INTAKE_FIELDS,
  SHEET_COLUMN_FIELDS,
  type IntakeField,
} from "@/lib/intake-fields";
import { submitIntake } from "@/lib/intake.functions";
import { intakeSchema } from "@/lib/intake-validation";
import { checkCheckout } from "@/lib/checkout.functions";
import { getCustomerAccess, saveCustomerDraft } from "@/lib/customer.functions";
import { cn } from "@/lib/utils";

const BOX =
  "mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-1 focus-visible:ring-ring";
const BOX_INVALID = "border-destructive focus-visible:ring-destructive";

/** Scroll a question into view and put the cursor in it. */
function jumpTo(id: string) {
  const box = document.getElementById(`field-${id}`);
  const control = document.getElementById(id) ?? box?.querySelector<HTMLElement>("button, input, textarea");
  box?.scrollIntoView({ behavior: "smooth", block: "center" });
  control?.focus({ preventScroll: true });
}

const emptyAnswers = Object.fromEntries(INTAKE_FIELDS.map((f) => [f.id, ""]));
function restoreAnswers(value: unknown): Record<string, string> {
  const record = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(INTAKE_FIELDS.map((field) => {
    const answer = record[field.id];
    return [field.id, typeof answer === "string" ? answer : ""];
  }));
}

export default function IntakeForm({ sessionId }: { sessionId: string }) {
  const submit = useServerFn(submitIntake);
  const check = useServerFn(checkCheckout);
  const access = useServerFn(getCustomerAccess);
  const saveDraft = useServerFn(saveCustomerDraft);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>(emptyAnswers);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const [userId, setUserId] = useState("");
  // A question's message shows once they've left it with an answer, or after they press Submit.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [addressPending, setAddressPending] = useState(false);
  const errorAtFocus = useRef<Record<string, boolean>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  // Files upload as soon as the email is confirmed; what's up is remembered (src/components/FileUploads.tsx).
  const uploads = useIntakeUploads({ sessionId, signedIn: !!verifiedEmail });
  const { claim: claimUploads, draftValue: uploadsDraftValue, done: uploadsDone, pending: uploadsPending } = uploads;
  /** The answers as the saved draft takes them, with the uploaded files. */
  const withUploads = (a: Record<string, string>, uid: string) => (uid ? { ...a, uploadedFiles: uploadsDraftValue(uid) } : a);
  const [confirming, setConfirming] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [identityMessage, setIdentityMessage] = useState("");
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [draftReady, setDraftReady] = useState(false);
  const edited = useRef(false);
  const draftKey = `lead-genisys-intake:${sessionId || "returning"}`;

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(draftKey);
      if (stored) {
        const draft = JSON.parse(stored) as Record<string, unknown>;
        setAnswers(restoreAnswers(draft));
        edited.current = true;
      }
    } catch { /* Draft storage is optional. */ }
    setDraftReady(true);
  }, [draftKey]);

  useEffect(() => {
    if (!draftReady || status === "done") return;
    try { sessionStorage.setItem(draftKey, JSON.stringify(answers)); } catch { /* Storage may be disabled. */ }
  }, [answers, draftKey, draftReady, status]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    setCheckoutMessage("Confirming your checkout…");
    void check({ data: sessionId }).then((result) => {
      if (active) setCheckoutMessage(result.valid ? "" : "We couldn't confirm this checkout link. You can still fill out the form; contact our team before submitting.");
    }).catch(() => {
      if (active) setCheckoutMessage("We couldn't confirm this checkout link. Contact our team if you need help.");
    });
    return () => { active = false; };
  }, [check, sessionId]);

  useEffect(() => {
    let active = true;
    async function restoreIdentity() {
      const { data } = await supabase.auth.getUser();
      if (!active) return;
      if (!data.user) { setVerifiedEmail(""); setUserId(""); return; }
      setUserId(data.user.id);
      setConfirming(true);
      try {
        const result = await access({ data: sessionId });
        if (!active) return;
        setVerifiedEmail(result.email);
        setAccountEmail(result.email);
        setIdentityMessage("");
        claimUploads(data.user.id, result.draft);
        if (!edited.current) {
          setAnswers({ ...restoreAnswers(result.draft), leadEmail: result.email });
        } else {
          setAnswers((prev) => ({ ...prev, leadEmail: prev["leadEmail"] || result.email }));
        }
      } catch (error) {
        if (active) { setVerifiedEmail(""); setIdentityMessage(error instanceof Error ? error.message : "We couldn't confirm your account. Please contact our team."); }
      } finally { if (active) setConfirming(false); }
    }
    void restoreIdentity();
    const refreshIdentity = () => { void restoreIdentity(); };
    window.addEventListener("lead-genisys-auth-change", refreshIdentity);
    return () => { active = false; window.removeEventListener("lead-genisys-auth-change", refreshIdentity); };
  }, [access, claimUploads, sessionId]);

  // Once a batch of uploads is in, the draft remembers them (so a new tab or a later visit has them).
  useEffect(() => {
    if (!verifiedEmail || !userId || uploadsPending || !uploadsDone) return;
    const t = setTimeout(() => {
      void saveDraft({ data: { sessionId, answers: withUploads(answersRef.current, userId) } }).catch(() => { /* The next save, or Submit, carries them. */ });
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs when uploads land, not on every keystroke
  }, [uploadsDone, uploadsPending, verifiedEmail, userId, sessionId]);

  async function sendConfirmation() {
    if (!accountEmail.trim()) { setIdentityMessage("Enter the email associated with your Lead Genisys account."); return; }
    setSendingLink(true);
    try {
      const redirect = new URL("/", window.location.origin);
      if (sessionId) redirect.searchParams.set("session_id", sessionId);
      const { error } = await supabase.auth.signInWithOtp({ email: accountEmail.trim(), options: { emailRedirectTo: redirect.href } });
      setIdentityMessage(error ? "We couldn't send your confirmation email. Please try again shortly or contact our team." : "Check your inbox for the confirmation link. After confirming, return to this tab — your answers are still here.");
    } catch { setIdentityMessage("We couldn't send your confirmation email. Please contact our team."); }
    finally { setSendingLink(false); }
  }

  async function saveProgress() {
    try {
      await saveDraft({ data: { sessionId, answers: withUploads(answers, userId) } });
      setIdentityMessage(uploadsDone ? "Your answers and uploaded files are saved. Come back with the same email to finish." : "Your answers are saved. Come back with the same email to finish.");
    } catch (error) { setIdentityMessage(error instanceof Error ? error.message : "We couldn't save your progress."); }
  }

  const setAnswer = (id: string, value: string) => {
    edited.current = true;
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  // Every question's check, kept current as they type (answer-checks.ts has the rules).
  const checks = useMemo(
    () => Object.fromEntries(INTAKE_FIELDS.map((f) => [f.id, checkAnswer(f, answers)])) as Record<string, AnswerCheck>,
    [answers],
  );

  /** What to show under a question right now. */
  function shownCheck(id: string): AnswerCheck {
    const check = checks[id] ?? {};
    if (!(submitted || touched[id])) return {};
    // A picked address is still fetching its ZIP.
    if (id === "businessAddress" && addressPending) return {};
    if (check.error) {
      // While they type, an error already showing updates as they fix it, but no new one appears.
      if (focused === id && !errorAtFocus.current[id]) return {};
      return { error: check.error };
    }
    if (check.warning && focused !== id) return { warning: check.warning };
    return {};
  }

  function onFieldFocus(id: string) {
    errorAtFocus.current[id] = !!shownCheck(id).error;
    setFocused(id);
  }

  function onFieldBlur(id: string) {
    setFocused((current) => (current === id ? null : current));
    // Tidy the answer as they leave it: (512) 555-0123, "Austin TX, Round Rock TX", https://…
    setAnswers((prev) => {
      const value = prev[id] ?? "";
      const next = normalizeAnswer(id, value);
      return next === value ? prev : { ...prev, [id]: next };
    });
    if ((answers[id] ?? "").trim()) setTouched((prev) => (prev[id] ? prev : { ...prev, [id]: true }));
  }

  /** The questions still blocking Submit, in the order they're asked. */
  const failing = submitted
    ? SHEET_COLUMN_FIELDS.filter((f) => isAsked(f, answers) && checks[f.id]?.error)
    : [];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    // Tidy every answer, including the one they were still in.
    const tidy = normalizeAnswers(answers);
    setAnswers(tidy);
    setSubmitted(true);
    const parsed = intakeSchema.safeParse({ answers: tidy, filePaths: [] });
    if (!parsed.success) {
      setStatus("error");
      const first = SHEET_COLUMN_FIELDS.find((f) => checkAnswer(f, tidy).error);
      if (first) {
        // After this render shows the messages, go to the first answer to fix.
        requestAnimationFrame(() => jumpTo(first.id));
      } else {
        setMessage("Please check your answers and try again.");
      }
      return;
    }
    if (uploads.failed) {
      setStatus("error");
      setMessage(uploads.failed === 1 ? "1 file didn’t upload. Tap Retry next to it, or remove it, then submit again." : `${uploads.failed} files didn’t upload. Tap Retry next to each, or remove them, then submit again.`);
      requestAnimationFrame(() => jumpTo("marketingContent"));
      return;
    }
    if (!verifiedEmail) {
      setStatus("idle");
      setIdentityMessage("Please confirm your account email below before submitting. You don't need to purchase again.");
      setAccountEmail((prev) => prev || answers["leadEmail"] || "");
      return;
    }
    setStatus("saving");
    try {
      // Files picked a moment ago may still be going up: the button shows how many are left.
      await uploads.waitForUploads();
      const filePaths = uploads.paths();
      await saveDraft({ data: { sessionId, answers: withUploads(parsed.data.answers, userId) } });
      await submit({ data: { answers: parsed.data.answers, filePaths, sessionId } });
      setStatus("done");
      try { sessionStorage.removeItem(draftKey); } catch { /* optional storage */ }
      queryClient.removeQueries({ queryKey: ["checkout-owner"] });
      void navigate({ to: "/step-2" });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  function renderTextField(field: IntakeField) {
    if (
      field.requiredWhen &&
      answers[field.requiredWhen.field] !== field.requiredWhen.equals
    ) {
      return null;
    }
    const { error, warning } = shownCheck(field.id);
    const messageId = `${field.id}-message`;
    const className = cn(BOX, error && BOX_INVALID);
    const value = answers[field.id] ?? "";
    const a11y = {
      "aria-invalid": error ? true : undefined,
      "aria-describedby": error || warning ? messageId : undefined,
    };
    return (
      <div
        key={field.id}
        id={`field-${field.id}`}
        className={cn("rounded-xl border bg-card p-5", error && "border-destructive/60")}
      >
        <FieldLabel field={field} htmlFor={field.id} />
        {field.note ? (
          <p className="mt-1 text-sm text-muted-foreground">{field.note}</p>
        ) : null}
        {field.alert ? (
          <p className="mt-1 text-sm text-destructive">{field.alert}</p>
        ) : null}

        {field.type === "textarea" ? (
          <textarea
            id={field.id}
            rows={4}
            value={value}
            placeholder={field.placeholder}
            onChange={(e) => setAnswer(field.id, e.target.value)}
            onFocus={() => onFieldFocus(field.id)}
            onBlur={() => onFieldBlur(field.id)}
            className={className}
            {...a11y}
          />
        ) : field.addressLookup ? (
          <AddressAutocomplete
            id={field.id}
            value={value}
            onChange={(next) => setAnswer(field.id, next)}
            placeholder={field.placeholder}
            onFocus={() => onFieldFocus(field.id)}
            onBlur={() => onFieldBlur(field.id)}
            onPendingChange={setAddressPending}
            ariaInvalid={!!error}
            ariaDescribedBy={a11y["aria-describedby"]}
            className={className}
          />
        ) : field.phone ? (
          <PhoneInput
            id={field.id}
            value={value}
            onValueChange={(next) => setAnswer(field.id, next)}
            autoComplete={field.autoComplete}
            placeholder={field.placeholder}
            onFocus={() => onFieldFocus(field.id)}
            onBlur={() => onFieldBlur(field.id)}
            className={className}
            {...a11y}
          />
        ) : (
          <input
            id={field.id}
            type={field.type}
            value={value}
            onChange={(e) => setAnswer(field.id, e.target.value)}
            autoComplete={field.autoComplete}
            inputMode={field.inputMode}
            placeholder={field.placeholder}
            {...(field.inputMode === "url" || field.type === "email"
              ? { autoCapitalize: "none", autoCorrect: "off", spellCheck: false }
              : {})}
            onFocus={() => onFieldFocus(field.id)}
            onBlur={() => onFieldBlur(field.id)}
            className={className}
            {...a11y}
          />
        )}
        <FieldMessage id={messageId} error={error} warning={warning} />
      </div>
    );
  }

  function renderRadioField(field: IntakeField) {
    const value = answers[field.id] ?? "";
    const { error } = shownCheck(field.id);
    return (
      <div
        key={field.id}
        id={`field-${field.id}`}
        className={cn("rounded-xl border bg-card p-5", error && "border-destructive/60")}
      >
        <FieldLabel field={field} />
        <div className="mt-3 flex flex-wrap gap-3">
          {(field.options ?? []).map((option) => {
            const selected = value === option;
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => setAnswer(field.id, option)}
                className={[
                  "min-w-[120px] rounded-full border px-6 py-2 text-sm font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-background text-foreground hover:border-primary/50",
                ].join(" ")}
              >
                {option}
              </button>
            );
          })}
        </div>

        {field.id === "bringingOwnDomain" && value === "No" ? (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm font-normal text-muted-foreground">
            <span className="font-medium text-ink">Please note:</span> Lead Genisys wants your
            infrastructure to be yours — you own the domain, we simply build on it. By selecting
            "No", you accept that the price of the domain you requested will still be charged on your
            next invoice.
          </div>
        ) : null}

        {field.id === "bringingOwnDomain" && value === "Yes" ? (
          <div className="mt-4 rounded-lg border bg-muted/40 p-4 pb-5">
            <p className="text-center text-sm font-normal text-muted-foreground">
              Great — we'll build on your existing domain. We just need DNS access at your registrar.
            </p>
            <div className="mt-1 flex flex-col items-center">
              <ArrowBigDown
                className="h-6 w-6 animate-bounce text-primary motion-reduce:animate-none"
                strokeWidth={2}
                aria-hidden
              />
              <Button
                asChild
                variant="outline"
                size="lg"
                className="-mt-0.5 w-full sm:w-[320px]"
              >
                <a href="/dns-access" target="_blank" rel="noopener noreferrer">
                  Open the DNS access guide
                  <ExternalLink />
                </a>
              </Button>
            </div>
          </div>
        ) : null}

        <FieldMessage id={`${field.id}-message`} error={error} />
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="mt-8 rounded-xl border bg-card p-8 text-center">
        <h2 className="text-xl font-medium text-ink">Thanks — your intake form is in.</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Our team has everything needed to start building. Taking you to the next page…
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="brand" size="lg" className="w-full sm:w-[320px]">
            <Link to="/step-2">
              Continue
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    // noValidate: the browser's own pop-ups would pre-empt the plain-English messages under each question.
    <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-6">
      {checkoutMessage ? <p className="text-sm text-muted-foreground" role="status">{checkoutMessage}</p> : null}
      {FIELDS_BEFORE_FILES.map((field) => (
        <Fragment key={field.id}>
          {field.section ? <SectionHeading section={field.section} /> : null}
          {field.type === "radio" ? renderRadioField(field) : renderTextField(field)}
        </Fragment>
      ))}

      <FileUploads
        uploads={uploads}
        kind="photo"
        inputId="marketingContent"
        label={FILE_FIELD_LABEL}
        description="Up to 20 files: your logo, photos of finished jobs, your crew, trucks and equipment. Photos are shrunk before they upload, so this is quick even from a phone."
        hint="Add them in as many goes as you like. On a phone, pick several at once from your photo library."
        accept="image/*,.heic,.heif,.pdf,.svg"
        signedIn={!!verifiedEmail}
      />

      <FileUploads
        uploads={uploads}
        kind="cp575"
        inputId="cp575Document"
        label="CP-575 Document (optional but strongly encouraged)"
        description="If you have it handy, upload your IRS CP-575 (EIN confirmation letter) — PDF or photo is fine. This helps us verify your legal business name for text messaging registration."
        hint="One file: a PDF or a clear photo of the letter."
        accept="image/*,.heic,.heif,.pdf"
        signedIn={!!verifiedEmail}
      />

      {FIELDS_AFTER_FILES.map((field) => (
        <Fragment key={field.id}>
          {field.section ? <SectionHeading section={field.section} /> : null}
          {field.type === "radio" ? renderRadioField(field) : renderTextField(field)}
        </Fragment>
      ))}

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

      {failing.length > 0 ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm" role="alert">
          <p className="font-medium text-destructive">
            {failing.length === 1
              ? "1 answer needs fixing before you can submit:"
              : `${failing.length} answers need fixing before you can submit:`}
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-foreground">
            {failing.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => jumpTo(f.id)}
                  className="text-left underline underline-offset-2 hover:text-primary"
                >
                  {f.short ?? f.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-t pt-6 space-y-3">
        {verifiedEmail ? <>
          <p className="text-sm text-muted-foreground">Account email confirmed: {verifiedEmail}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => { void saveProgress(); }}>Save progress</Button>
            <Button type="button" variant="link" onClick={async () => { await supabase.auth.signOut(); setVerifiedEmail(""); }}>Use a different account email</Button>
          </div>
        </> : <>
          <label htmlFor="account-email" className="block text-base font-normal text-ink">Confirm your Lead Genisys account email</label>
          <p className="text-sm text-muted-foreground">Use the email you signed up with. No password or new purchase needed.</p>
          <input id="account-email" type="email" autoComplete="email" value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring" />
          <Button type="button" variant="outline" disabled={sendingLink || confirming} onClick={() => { void sendConfirmation(); }}>{confirming ? "Checking your account…" : sendingLink ? "Sending…" : "Send confirmation link"}</Button>
        </>}
        {identityMessage ? <p className="text-sm text-muted-foreground" role="status">{identityMessage}</p> : null}
        <Button asChild variant="link" className="px-0"><a href="mailto:alex@leadgenisys.com">Need help? Contact Lead Genisys</a></Button>
      </div>

      <div className="flex justify-center">
        <Button
          type="submit"
          variant="brand"
          size="lg"
          disabled={status === "saving"}
          className="w-full sm:w-[320px]"
        >
          {status === "saving" ? (uploads.pending ? `Uploading files… ${uploads.done} of ${uploads.total}` : "Submitting…") : "Submit and continue"}
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
}

/** Under a question: what's wrong (red, blocks Submit) or worth a second look (amber, doesn't). */
function FieldMessage({ id, error, warning }: { id: string; error?: string | undefined; warning?: string | undefined }) {
  if (error) {
    return (
      <p id={id} className="mt-2 text-sm text-destructive" aria-live="polite">
        {error}
      </p>
    );
  }
  if (warning) {
    return (
      <p id={id} className="mt-2 text-sm text-amber-700 dark:text-amber-400" aria-live="polite">
        {warning}
      </p>
    );
  }
  return null;
}

function FieldLabel({ field, htmlFor }: { field: IntakeField; htmlFor?: string }) {
  const label = htmlFor ? (
    <label htmlFor={htmlFor} className="inline">
      {field.label} <RequiredMark field={field} />
    </label>
  ) : (
    <span>
      {field.label} <RequiredMark field={field} />
    </span>
  );

  if (!field.help) {
    return <p className="text-base font-normal text-ink">{label}</p>;
  }

  return (
    <p className="text-base font-normal text-ink">
      {label}
      <HelpChip text={field.help} />
    </p>
  );
}

function HelpChip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);

  function handleOpenChange(next: boolean) {
    if (pinned.current && !next) return;
    if (!next) pinned.current = false;
    setOpen(next);
  }

  function toggle() {
    pinned.current = !pinned.current;
    setOpen(pinned.current);
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={handleOpenChange}>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Why we ask for this"
            onClick={toggle}
            className="ml-1 inline-flex h-4 w-4 align-middle items-center justify-center rounded-full border border-primary/50 text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Info className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[280px] rounded-lg border bg-card p-3 text-sm font-normal leading-relaxed text-card-foreground shadow-lg"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function RequiredMark({ field }: { field: IntakeField }) {
  return field.optional ? (
    <span className="ml-1 text-sm text-muted-foreground">(optional)</span>
  ) : (
    <span className="text-primary">*</span>
  );
}

function SectionHeading({ section }: { section: NonNullable<IntakeField["section"]> }) {
  return (
    <div className="pt-6">
      <h2 className="text-xl font-semibold text-ink">{section.title}</h2>
      {section.intro ? <p className="mt-1 text-sm text-muted-foreground">{section.intro}</p> : null}
    </div>
  );
}
