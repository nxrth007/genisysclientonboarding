import { Link } from "@tanstack/react-router";
import logo from "@/assets/lead-genisys-logo.png";

const steps = [
  { to: "/", label: "Intake Form" },
  { to: "/step-2", label: "Book Launch Call" },
  { to: "/step-3", label: "You're Booked" },
] as const;

export function OnboardingHeader({ current }: { current: 1 | 2 | 3 }) {
  return (
    <header className="w-full border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-8">
        <Link to="/" className="flex flex-col items-center gap-3">
          <img src={logo} alt="Lead Genisys" className="h-16 w-auto object-contain" />
          <span className="text-lg font-semibold tracking-tight text-ink md:text-xl">
            Client <span className="text-primary">Onboarding</span>
          </span>
        </Link>

        <ol className="flex w-full max-w-2xl items-center gap-2">
          {steps.map((step, i) => {
            const index = i + 1;
            const active = index === current;
            const done = index < current;
            return (
              <li key={step.to} className="flex flex-1 items-center gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      active
                        ? "gradient-primary text-primary-foreground shadow-button"
                        : done
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                    ].join(" ")}
                  >
                    {index}
                  </span>
                  <span
                    className={[
                      "hidden text-sm font-medium sm:inline",
                      active ? "text-ink" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length && (
                  <span
                    className={[
                      "h-px flex-1",
                      done ? "bg-primary/40" : "bg-border",
                    ].join(" ")}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </header>
  );
}

export default OnboardingHeader;