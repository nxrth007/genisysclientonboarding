import { Fragment, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowBigDown, ArrowRight, ExternalLink, Info } from "lucide-react";

import AddressAutocomplete from "@/components/AddressAutocomplete";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import {
  FIELDS_AFTER_FILES,
  FIELDS_BEFORE_FILES,
  FILE_FIELD_LABEL,
  INTAKE_FIELDS,
  type IntakeField,
} from "@/lib/intake-fields";
import { submitIntake } from "@/lib/intake.functions";
import { intakeSchema } from "@/lib/intake-validation";
import { checkCheckout } from "@/lib/checkout.functions";
import { getCustomerAccess, saveCustomerDraft } from "@/lib/customer.functions";

const emptyAnswers = Object.fromEntries(INTAKE_FIELDS.map((f) => [f.id, ""]));

export default function IntakeForm({ sessionId }: { sessionId: string }) {
  const submit = useServerFn(submitIntake);
  const check = useServerFn(checkCheckout);
  const access = useServerFn(getCustomerAccess);
  const saveDraft = useServerFn(saveCustomerDraft);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>(emptyAnswers);
  const [files, setFiles] = useState<File[]>([]);
  const [cp575Files, setCp575Files] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
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
        setAnswers(Object.fromEntries(INTAKE_FIELDS.map((field) => [field.id, typeof draft[field.id] === "string" ? draft[field.id] : ""])));
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
      if (!data.user) { setVerifiedEmail(""); return; }
      setConfirming(true);
      try {
        const result = await access({ data: sessionId });
        if (!active) return;
        setVerifiedEmail(result.email);
        setAccountEmail(result.email);
        setIdentityMessage("");
        if (!edited.current) {
          const saved = result.draft && typeof result.draft === "object" && !Array.isArray(result.draft) ? result.draft : {};
          setAnswers(Object.fromEntries(INTAKE_FIELDS.map((field) => [field.id, field.id === "leadEmail" ? result.email : typeof saved[field.id] === "string" ? saved[field.id] : ""])));
        } else {
          setAnswers((prev) => ({ ...prev, leadEmail: prev["leadEmail"] || result.email }));
        }
      } catch (error) {
        if (active) { setVerifiedEmail(""); setIdentityMessage(error instanceof Error ? error.message : "We couldn't confirm your account. Please contact our team."); }
      } finally { if (active) setConfirming(false); }
    }
    void restoreIdentity();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (["SIGNED_IN", "SIGNED_OUT", "USER_UPDATED"].includes(event)) setTimeout(() => { void restoreIdentity(); }, 0);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [access, sessionId]);

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
      await saveDraft({ data: { sessionId, answers } });
      setIdentityMessage("Your answers are saved. Reattach your files when you return.");
    } catch (error) { setIdentityMessage(error instanceof Error ? error.message : "We couldn't save your progress."); }
  }

  const setAnswer = (id: string, value: string) => {
    edited.current = true;
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  async function uploadFiles(): Promise<string[]> {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error("Please confirm your checkout email before submitting.");
    const prefix = `${data.user.id}/${sessionId || "returning"}/${crypto.randomUUID()}`;
    const paths: string[] = [];
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${prefix}/${safeName}`;
      const { error } = await supabase.storage.from("intake-uploads").upload(path, file);
      if (error) throw new Error(`Could not upload ${file.name}: ${error.message}`);
      paths.push(path);
    }
    for (const file of cp575Files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${prefix}/cp575-${safeName}`;
      const { error } = await supabase.storage.from("intake-uploads").upload(path, file);
      if (error) throw new Error(`Could not upload ${file.name}: ${error.message}`);
      paths.push(path);
    }
    return paths;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const parsed = intakeSchema.safeParse({ answers, filePaths: [] });
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const id = issue.path[1];
        if (typeof id === "string" && !fieldErrors[id]) fieldErrors[id] = issue.message;
      }
      setErrors(fieldErrors);
      setStatus("error");
      setMessage("Please complete the highlighted questions.");
      return;
    }
    setErrors({});
    if (!verifiedEmail) {
      setStatus("idle");
      setIdentityMessage("Please confirm your account email below before submitting. You don't need to purchase again.");
      setAccountEmail((prev) => prev || answers["leadEmail"] || "");
      return;
    }
    setStatus("saving");
    try {
      await saveDraft({ data: { sessionId, answers: parsed.data.answers } });
      const filePaths = await uploadFiles();
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
    return (
      <div key={field.id} className="rounded-xl border bg-card p-5">
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
            value={answers[field.id] ?? ""}
            onChange={(e) => setAnswer(field.id, e.target.value)}
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        ) : field.addressLookup ? (
          <AddressAutocomplete
            id={field.id}
            value={answers[field.id] ?? ""}
            onChange={(value) => setAnswer(field.id, value)}
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        ) : (
          <input
            id={field.id}
            type={field.type}
            value={answers[field.id] ?? ""}
            onChange={(e) => setAnswer(field.id, e.target.value)}
            autoComplete={field.autoComplete}
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        )}
        {errors[field.id] ? (
          <p className="mt-2 text-sm text-destructive">{errors[field.id]}</p>
        ) : null}
      </div>
    );
  }

  function renderRadioField(field: IntakeField) {
    const value = answers[field.id] ?? "";
    return (
      <div key={field.id} className="rounded-xl border bg-card p-5">
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

        {errors[field.id] ? (
          <p className="mt-2 text-sm text-destructive">{errors[field.id]}</p>
        ) : null}
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
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {checkoutMessage ? <p className="text-sm text-muted-foreground" role="status">{checkoutMessage}</p> : null}
      {FIELDS_BEFORE_FILES.map((field) => (
        <Fragment key={field.id}>
          {field.section ? <SectionHeading section={field.section} /> : null}
          {field.type === "radio" ? renderRadioField(field) : renderTextField(field)}
        </Fragment>
      ))}

      <div className="rounded-xl border bg-card p-5">
        <label htmlFor="marketingContent" className="block text-base font-normal text-ink">
          {FILE_FIELD_LABEL}
        </label>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload up to 20 files — logo, before/after photos, service photos.
        </p>
        <input
          id="marketingContent"
          type="file"
          multiple
          accept="image/*,.pdf,.svg,.zip"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 20))}
          className="mt-3 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border file:border-input file:bg-background file:px-4 file:py-2 file:text-sm file:text-foreground"
        />
        {files.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {files.map((file) => (
              <li key={file.name}>{file.name}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card p-5">
        <label htmlFor="cp575Document" className="block text-base font-normal text-ink">
          CP-575 Document (optional but strongly encouraged)
        </label>
        <p className="mt-1 text-sm text-muted-foreground">
          If you have it handy, upload your IRS CP-575 (EIN confirmation letter) — PDF or photo is
          fine. This helps us verify your legal business name for text messaging registration.
        </p>
        <input
          id="cp575Document"
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => setCp575Files(Array.from(e.target.files ?? []).slice(0, 1))}
          className="mt-3 block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border file:border-input file:bg-background file:px-4 file:py-2 file:text-sm file:text-foreground"
        />
        {cp575Files.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {cp575Files.map((file) => (
              <li key={file.name}>{file.name}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {FIELDS_AFTER_FILES.map((field) => (
        <Fragment key={field.id}>
          {field.section ? <SectionHeading section={field.section} /> : null}
          {field.type === "radio" ? renderRadioField(field) : renderTextField(field)}
        </Fragment>
      ))}

      {message ? <p className="text-sm text-destructive">{message}</p> : null}

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
          {status === "saving" ? "Submitting…" : "Submit and continue"}
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
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
