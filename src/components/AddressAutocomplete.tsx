import { useEffect, useId, useRef, useState } from "react";

/**
 * The Business Address box: suggests real US street addresses as the client
 * types (Google Places, through the Lead Genisys Hub, which holds the key),
 * and fills in the full address they pick. Typing freely still works: if the
 * lookup is slow or down, it's an ordinary text box.
 */

const HUB_URL =
  (import.meta.env["VITE_HUB_URL"] as string | undefined) ?? "https://genisys-hub.onrender.com";

type Suggestion = { id: string; main: string; secondary: string };

const newSession = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export default function AddressAutocomplete({
  id,
  value,
  onChange,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
}) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // One session per address typed: Google bills its lookups and the final pick as one.
  const session = useRef<string>("");
  // Only typing looks things up; picking a suggestion sets the value without a new lookup.
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current) return;
    const q = value.trim();
    if (q.length < 4) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!session.current) session.current = newSession();
      try {
        const res = await fetch(
          `${HUB_URL}/api/public/address?q=${encodeURIComponent(q)}&session=${encodeURIComponent(session.current)}`,
          { signal: controller.signal },
        );
        const data = (await res.json().catch(() => ({}))) as { suggestions?: Suggestion[] };
        const list = Array.isArray(data.suggestions) ? data.suggestions : [];
        setSuggestions(list);
        setActive(-1);
        setOpen(list.length > 0);
      } catch {
        // Aborted by the next keystroke, or the lookup is down: plain typing still works.
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [value]);

  async function pick(s: Suggestion) {
    typed.current = false;
    setOpen(false);
    setSuggestions([]);
    onChange([s.main, s.secondary].filter(Boolean).join(", "));
    const sessionToken = session.current || newSession();
    session.current = "";
    try {
      const res = await fetch(
        `${HUB_URL}/api/public/address?place=${encodeURIComponent(s.id)}&session=${encodeURIComponent(sessionToken)}`,
      );
      const data = (await res.json().catch(() => ({}))) as { address?: string };
      if (data.address) onChange(data.address);
    } catch {
      // The suggestion's own text stays.
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      // Pick the highlighted address instead of submitting the form.
      e.preventDefault();
      const s = suggestions[active];
      if (s) void pick(s);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setOpen(false)}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        className={className}
      />
      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-1 overflow-hidden rounded-md border bg-card shadow-lg">
          <ul id={listId} role="listbox" className="py-1">
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                // mousedown, not click: the input's blur would close the list first.
                onMouseDown={(e) => {
                  e.preventDefault();
                  void pick(s);
                }}
                onMouseEnter={() => setActive(i)}
                className={[
                  "cursor-pointer px-3 py-2 text-sm",
                  i === active ? "bg-primary/10" : "",
                ].join(" ")}
              >
                <span className="font-medium text-foreground">{s.main}</span>
                {s.secondary ? <span className="text-muted-foreground"> {s.secondary}</span> : null}
              </li>
            ))}
          </ul>
          <p className="border-t px-3 py-1.5 text-right text-xs text-muted-foreground">
            Powered by Google
          </p>
        </div>
      ) : null}
    </div>
  );
}
