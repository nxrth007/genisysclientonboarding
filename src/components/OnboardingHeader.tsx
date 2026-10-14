import { Link } from "@tanstack/react-router";
import logo from "@/assets/lead-genisys-logo.png";

export function OnboardingHeader(_props: { current?: number }) {
  return (
    <header className="w-full border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-8">
        <Link to="/" className="flex flex-col items-center gap-3">
          <img src={logo} alt="Lead Genisys" className="h-16 w-auto object-contain" />
          <span className="text-lg font-medium tracking-tight text-ink md:text-xl">
            Client <span className="text-primary">Onboarding</span>
          </span>
        </Link>

      </div>
    </header>
  );
}

export default OnboardingHeader;