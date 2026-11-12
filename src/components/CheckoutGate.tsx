import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { authorizeCheckout, checkCheckout } from "@/lib/checkout.functions";

export default function CheckoutGate({ sessionId, children }: { sessionId: string; children: (email: string) => ReactNode }) {
  const probe = useServerFn(checkCheckout);
  const authorize = useServerFn(authorizeCheckout);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const eligibility = useQuery({
    queryKey: ["checkout-eligibility", sessionId],
    queryFn: () => probe({ data: sessionId }),
    enabled: Boolean(sessionId),
    retry: false,
    staleTime: 60000,
  });
  const ownership = useQuery({
    queryKey: ["checkout-owner", sessionId],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
      return authorize({ data: sessionId });
    },
    enabled: eligibility.data?.valid === true,
    retry: false,
  });

  async function sendLink(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setNotice("");
    try {
      const redirect = new URL("/", window.location.origin);
      redirect.searchParams.set("session_id", sessionId);
      const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect.href } });
      setNotice(error ? "We couldn't send your confirmation email. Please try again shortly." : "Check your inbox for your confirmation link, then return here to continue.");
    } catch {
      setNotice("We couldn't send your confirmation email. Please try again shortly.");
    } finally {
      setSending(false);
    }
  }

  if (!sessionId || eligibility.isError || eligibility.data?.valid === false) {
    return <div className="py-12 text-center space-y-4" role="alert">
      <h1 className="text-2xl font-medium text-ink">Let's confirm your free trial</h1>
      <p className="text-muted-foreground">{!sessionId ? "Please start your trial first, then use the onboarding link from checkout." : "We couldn't confirm this checkout. Please return to the trial page to continue."}</p>
      <Button asChild variant="brand" size="lg" className="w-full sm:w-[320px]"><a href="https://free.leadgenisys.com">Return to the trial page<ArrowRight /></a></Button>
    </div>;
  }
  if (eligibility.isPending || ownership.isPending) {
    return <div className="py-16 flex items-center justify-center gap-3 text-muted-foreground" role="status"><LoaderCircle className="h-5 w-5 animate-spin motion-reduce:animate-none" />Confirming your trial…</div>;
  }
  if (ownership.data?.email) return children(ownership.data.email);

  return <div className="mx-auto max-w-xl py-12 text-center">
    <h1 className="text-2xl font-medium text-ink">Confirm your checkout email</h1>
    <p className="mt-3 text-muted-foreground">Use the same email you entered at checkout. We'll send you a secure confirmation link.</p>
    {ownership.isError ? <p className="mt-4 text-destructive" role="alert">{ownership.error instanceof Error ? ownership.error.message : "We couldn't confirm your checkout email."}</p> : null}
    <form onSubmit={sendLink} className="mt-6 space-y-4 text-left">
      <label htmlFor="checkout-email" className="block text-sm text-ink">Checkout email</label>
      <input id="checkout-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
      <div className="flex justify-center"><Button type="submit" variant="brand" size="lg" disabled={sending} className="w-full sm:w-[320px]">{sending ? "Sending…" : "Send confirmation link"}<ArrowRight /></Button></div>
    </form>
    {notice ? <p className="mt-4 text-sm text-muted-foreground" role="status">{notice}</p> : null}
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      {ownership.isError ? <Button variant="outline" onClick={async () => { await supabase.auth.signOut(); }}>Use a different email</Button> : null}
      <Button asChild variant="link"><a href="https://free.leadgenisys.com">Return to the trial page</a></Button>
    </div>
  </div>;
}