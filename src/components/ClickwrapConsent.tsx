import { Checkbox } from "@/components/ui/checkbox";
import { BILLING_SUMMARY, POLICIES, POLICY_KEYS, type AcceptanceFlags } from "@/lib/policies";

export default function ClickwrapConsent({
  value,
  onChange,
  error,
}: {
  value: AcceptanceFlags;
  onChange: (next: AcceptanceFlags) => void;
  error?: string;
}) {
  return (
    <fieldset id="clickwrap" className="space-y-4 rounded-xl border bg-card p-5">
      <legend className="px-1 text-base font-medium text-ink">Agreements</legend>
      <p className="text-sm text-foreground">{BILLING_SUMMARY}</p>
      <p className="text-sm text-muted-foreground">
        Each box starts unchecked. Open the policy, then check the box if you agree. Submitting
        records that agreement.
      </p>
      <div className="space-y-3">
        {POLICY_KEYS.map((key) => {
          const policy = POLICIES[key];
          const inputId = `accept-${key}`;
          return (
            <div key={key} className="flex items-start gap-3">
              <Checkbox
                id={inputId}
                checked={value[key]}
                onCheckedChange={(next) => onChange({ ...value, [key]: next === true })}
                aria-required="true"
                aria-labelledby={`${inputId}-text`}
                className="mt-0.5"
              />
              <p id={`${inputId}-text`} className="text-sm leading-relaxed text-foreground">
                {policy.consentLead}{" "}
                <a
                  href={policy.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-primary underline underline-offset-2"
                >
                  {policy.linkLabel}
                </a>
                {policy.draft ? <span className="text-muted-foreground"> (draft)</span> : null}.
              </p>
            </div>
          );
        })}
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
