/**
 * Sidebar reminder-notifications toggle (manual ON/OFF control).
 *
 * Compact 36px icon button designed to sit BETWEEN the language menu and the
 * collapse control in the expanded desktop sidebar header. Uses Bell /
 * BellOff from lucide-react (already a dependency) — no new icon library.
 * State derives from the real PushSubscription via useReminderNotifications;
 * the accessible name always reflects the CURRENT state, never optimistic.
 */

import * as React from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HEADER_ICON, HEADER_ICON_BUTTON } from "@/components/hawkbucks/header-controls";
import { useReminderNotifications } from "@/hooks/use-reminder-notifications";
import { unsupportedMessageKey } from "@/lib/reminders";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

export function ReminderToggle({ className }: { className?: string | undefined }) {
  const { t } = useI18n();
  const { state, busy, toggle } = useReminderNotifications();

  const enabled = state === "on";
  const blocked = state === "blocked";
  const unsupported = state === "unsupported";
  const loading = state === "loading";

  const label = enabled
    ? t("notifications.disableLabel")
    : blocked
      ? t("notifications.blockedLabel")
      : unsupported
        ? t("notifications.unsupportedLabel")
        : t("notifications.enableLabel");

  const statusKey =
    state === "on"
      ? ("enabled" as const)
      : state === "blocked"
        ? ("blocked" as const)
        : state === "unsupported"
          ? ("unsupported" as const)
          : null;

  const handleClick = React.useCallback(
    async (event: React.MouseEvent) => {
      // Never let the sidebar toggle ripple: stop propagation so surrounding
      // sidebar handlers cannot misinterpret this click.
      event.stopPropagation();
      if (busy || loading) return;
      // Blocked/unsupported never call requestPermission() — explain instead.
      // These toasts fire WITHOUT invoking toggle() at all.
      if (unsupported) {
        // Touch-capable devices without PushManager are almost always
        // iOS/iPadOS Safari tabs — explain the Home Screen install
        // path instead of a dead-end "not supported" message.
        toast.error(
          unsupportedMessageKey() === "unsupportedInstallHint"
            ? t("notifications.unsupportedInstallHint")
            : t("notifications.unsupported"),
        );
        return;
      }
      if (blocked && !enabled) {
        toast.error(t("notifications.blocked"));
        return;
      }
      let outcome;
      try {
        outcome = await toggle();
      } catch {
        toast.error(t("notifications.unsupported"));
        return;
      }
      // Both branches speak from the state that actually resulted, so the
      // message can never contradict the icon the user is looking at. A
      // failure whose net effect was still a transition (e.g. the browser
      // unsubscribed but server cleanup failed) reports the new state rather
      // than re-asserting the old one.
      if (outcome.state === "on") {
        if (outcome.ok) toast.success(t("notifications.enabled"));
        else toast.error(t("notifications.unsupported"));
      } else if (outcome.state === "off") {
        if (outcome.ok) toast.success(t("notifications.disabled"));
        else toast.error(t("notifications.unsupported"));
      } else if (outcome.state === "blocked") {
        toast.error(t("notifications.blocked"));
      } else {
        toast.error(
          unsupportedMessageKey() === "unsupportedInstallHint"
            ? t("notifications.unsupportedInstallHint")
            : t("notifications.unsupported"),
        );
      }
    },
    [busy, loading, unsupported, blocked, enabled, toggle, t],
  );

  const button = (
    <button
      type="button"
      onClick={(event) => {
        void handleClick(event);
      }}
      disabled={busy || loading}
      aria-label={label}
      aria-pressed={enabled}
      data-testid="reminder-toggle"
      data-state={enabled ? "on" : blocked ? "blocked" : unsupported ? "unsupported" : "off"}
      className={cn(
        HEADER_ICON_BUTTON,
        enabled && "bg-primary/15 text-primary hover:text-primary",
        blocked && "opacity-60",
        unsupported && "cursor-not-allowed opacity-40",
        className,
      )}
    >
      {enabled ? (
        <Bell aria-hidden="true" className={HEADER_ICON} />
      ) : (
        <BellOff aria-hidden="true" className={HEADER_ICON} />
      )}
    </button>
  );

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      {statusKey ? (
        <span className="sr-only" role="status">
          {t(`notifications.${statusKey}`)}
        </span>
      ) : null}
    </>
  );
}
