import { Fragment, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink, Info } from "lucide-react";

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

const emptyAnswers = Object.fromEntries(INTAKE_FIELDS.map((f) => [f.id, ""]));

export default function IntakeForm() {
  const submit = useServerFn(submitIntake);
  const [answers, setAnswers] = useState<Record<string, string>>(emptyAnswers);
  const [files, setFiles] = useState<File[]>([]);
  const [cp575Files, setCp575Files] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const setAnswer = (id: string, value: string) =>
    setAnswers((prev) => ({ ...prev, [id]: value }));

  async function uploadFiles(): Promise<string[]> {
    const prefix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    setStatus("saving");
    try {
      const filePaths = await uploadFiles();
      await submit({ data: { answers: parsed.data.answers, filePaths } });
      setStatus("done");
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
        {field.type === "textarea" ? (
          <textarea
            id={field.id}
            rows={4}
            value={answers[field.id] ?? ""}
            onChange={(e) => setAnswer(field.id, e.target.value)}
            className="mt-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        ) : (
          <input
            id={field.id}
            type={field.type}
            value={answers[field.id] ?? ""}
            onChange={(e) => setAnswer(field.id, e.target.value)}
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
          <div className="mt-4 rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-normal text-muted-foreground">
              Great — we'll build on your existing domain. We just need DNS access at your registrar.
            </p>
            <Button asChild variant="outline" size="lg" className="mt-3 w-full sm:w-[320px]">
              <a href="/dns-access" target="_blank" rel="noopener noreferrer">
                Open the DNS access guide
                <ExternalLink />
              </a>
            </Button>
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
          Our team has everything needed to start building. Next, join us on Slack.
        </p>
        <div className="mt-6 flex justify-center">
          <Button asChild variant="brand" size="lg" className="w-full sm:w-[320px]">
            <Link to="/step-2">
              Continue to Step 2
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
    <label htmlFor={htmlFor} className="text-base font-normal text-ink">
      {field.label} <RequiredMark field={field} />
    </label>
  ) : (
    <span className="text-base font-normal text-ink">
      {field.label} <RequiredMark field={field} />
    </span>
  );

  if (!field.help) return label;

  return (
    <div className="flex flex-wrap items-center gap-x-1.5">
      {label}
      <HelpChip text={field.help} />
    </div>
  );
}

function HelpChip({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Why we ask for this"
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary/50 text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
