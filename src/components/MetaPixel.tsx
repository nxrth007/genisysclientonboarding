import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { onConsentChange } from "@/lib/consent";
import { updateMetaPixel } from "@/lib/meta-pixel";

export default function MetaPixel() {
  const href = useRouterState({ select: (state) => state.location.href });
  useEffect(() => {
    void updateMetaPixel();
    return onConsentChange(() => { void updateMetaPixel(); });
  }, [href]);
  return null;
}