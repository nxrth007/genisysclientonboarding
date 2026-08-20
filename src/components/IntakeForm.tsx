import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { INTAKE_FIELDS, FILE_FIELD_LABEL } from "@/lib/intake-fields";
import { submitIntake } from "@/lib/intake.functions";
import { intakeSchema } from "@/lib/intake-validation";

const emptyAnswers = Object.fromEntries(INTAKE_FIELDS.map((f) => [f.id, ""]));

export default function IntakeForm() {
  const submit = useServerFn(submitIntake);
  const [answers, setAnswers] = useState<Record<string, string>>(emptyAnswers);
  const [files, setFiles] = useState<File[]>([]);
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

  if (status === "done") {
    return (
      <div className="mt-8 rounded-xl border bg-card p-8 text-center">
        <h2 className="text-xl font-medium text-ink">Thanks — your intake form is in.</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Our team has everything needed to start building. Next, book your launch call.
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
      {INTAKE_FIELDS.map((field) => (
        <div key={field.id} className="rounded-xl border bg-card p-5">
          <label htmlFor={field.id} className="block text-base font-normal text-ink">
            {field.label} <span className="text-primary">*</span>
          </label>
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