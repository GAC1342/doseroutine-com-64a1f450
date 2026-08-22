import { useEffect } from "react";
import { installExternalLinkHandler } from "@/lib/external-link";

/**
 * Mounts the global click interceptor that sends external links to the
 * system browser inside the native app. Renders nothing.
 */
export function ExternalLinkHandler() {
  useEffect(() => installExternalLinkHandler(), []);
  return null;
}
