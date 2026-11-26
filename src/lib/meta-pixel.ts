import { canTrack } from "./consent";

export const META_PIXEL_ID = "1012489854984901";

type Pixel = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: Pixel;
  loaded: boolean;
  version: string;
};
declare global {
  interface Window { fbq?: Pixel; _fbq?: Pixel }
}

let initialized = false;
let lastPage = "";

/** Never expose checkout IDs, auth tokens, search parameters or fragments to Meta. */
export function cleanPixelUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.origin}${parsed.pathname}`;
}

export async function updateMetaPixel(): Promise<void> {
  const allowed = await canTrack("advertising");
  if (!allowed) {
    window.fbq?.("consent", "revoke");
    return;
  }
  // Do not load on auth callbacks or non-intake pages. Router state retains the
  // checkout session for secure verification; only the displayed URL is cleaned.
  if (!["/", "/step-2"].includes(window.location.pathname)) return;
  const currentUrl = new URL(window.location.href);
  if (currentUrl.hash || [...currentUrl.searchParams.keys()].some((key) => key !== "session_id")) return;
  if (document.referrer) {
    try {
      const referrer = new URL(document.referrer);
      // Referrers with identifiers cannot be rewritten safely by the Pixel.
      if (referrer.search || referrer.hash) return;
    } catch { return; }
  }
  window.history.replaceState(window.history.state, "", cleanPixelUrl(window.location.href));
  if (!window.fbq) {
    const pixel = Object.assign(function (...args: unknown[]) {
      if (pixel.callMethod) pixel.callMethod.apply(pixel, args);
      else pixel.queue.push(args);
    }, { queue: [] as unknown[][], loaded: true, version: "2.0" }) as Pixel;
    pixel.push = pixel;
    window.fbq = pixel;
    window._fbq = pixel;
  }
  const pixel = window.fbq;
  pixel("consent", "grant");
  if (!initialized) {
    // Disable automatic events/form collection; do not send matching data.
    pixel("set", "autoConfig", false, META_PIXEL_ID);
    pixel("init", META_PIXEL_ID, {}, { agent: "lovable" });
    initialized = true;
    const script = document.createElement("script");
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.defer = true;
    document.head.appendChild(script);
  }
  const page = cleanPixelUrl(window.location.href);
  if (lastPage === page) return;
  lastPage = page;
  pixel("trackSingle", META_PIXEL_ID, "PageView");
}