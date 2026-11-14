import { useEffect, useLayoutEffect, useRef } from "react";

import { formatPhoneAsTyped } from "@/lib/answer-checks";

/**
 * A phone number box that formats as they type: 5125550123 becomes
 * (512) 555-0123. Two numbers, or words, are left exactly as typed so the
 * check under the box can say what to change.
 */

// The page also renders on the server, where layout effects don't run.
const useCaretEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: string;
  onValueChange: (value: string) => void;
};

export default function PhoneInput({ value, onValueChange, ...rest }: Props) {
  const input = useRef<HTMLInputElement>(null);
  // Where the caret goes once the formatted value is on screen.
  const caret = useRef<number | null>(null);

  useCaretEffect(() => {
    const el = input.current;
    if (el && caret.current !== null && document.activeElement === el) {
      el.setSelectionRange(caret.current, caret.current);
    }
    caret.current = null;
  }, [value]);

  return (
    <input
      {...rest}
      ref={input}
      type="tel"
      inputMode="tel"
      value={value}
      onChange={(e) => {
        const raw = e.target.value;
        const next = formatPhoneAsTyped(raw);
        if (next !== raw) {
          // Keep the caret after the same digit it was after.
          const digitsBefore = raw
            .slice(0, e.target.selectionStart ?? raw.length)
            .replace(/\D/g, "").length;
          let at = 0;
          for (let seen = 0; at < next.length && seen < digitsBefore; at++) {
            if (/\d/.test(next.charAt(at))) seen++;
          }
          caret.current = at;
        }
        onValueChange(next);
      }}
    />
  );
}
