/**
 * Phase 5 refinement — custom HawkBucks language menu.
 *
 * Replaces the native select element with a Radix DropdownMenu (keyboard, focus,
 * outside-click, and Escape handling come from the primitive). Persistence
 * flows through the i18n context into the Phase 3 preference hook; this
 * component never touches cookies or storage directly.
 */

import { Check, Globe } from "lucide-react";
import { useLocation, useRouter } from "@tanstack/react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n";
import { LANGUAGE_LIST } from "@/i18n/config";
import type { LanguageCode } from "@/i18n/config";
import { localizePath, splitLocalePath } from "@/lib/locale-urls";
import { cn } from "@/lib/utils";

const MENU_SURFACE =
  "min-w-[12.5rem] rounded-xl border border-panel-border bg-[#0a1512]/95 p-1.5 text-foreground shadow-[0_16px_48px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl";

const ITEM_CLASSES =
  "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 pe-9 font-display text-xs font-bold tracking-wide outline-none transition-colors data-[highlighted]:bg-primary/15 data-[highlighted]:text-primary data-[state=checked]:text-primary focus-visible:bg-primary/15 focus-visible:text-primary";

export function LanguageMenu({
  className,
  align = "end",
  showCurrentLabel = false,
}: {
  className?: string | undefined;
  align?: "start" | "center" | "end";
  showCurrentLabel?: boolean;
}) {
  const { t, currentLanguage, setLanguage } = useI18n();
  const router = useRouter();
  const { pathname } = useLocation();
  const active = LANGUAGE_LIST.find((entry) => entry.code === currentLanguage) ?? LANGUAGE_LIST[0];

  const selectLanguage = (code: LanguageCode) => {
    setLanguage(code);
    const { basePath } = splitLocalePath(pathname);
    const target = localizePath(basePath, code);
    if (target !== pathname) {
      router.history.push(target);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("language.selectorAria")}
          title={t("language.changeLanguage")}
          className={cn(
            showCurrentLabel
              ? "flex min-h-[2.75rem] w-full items-center gap-2.5 rounded-lg border border-panel-border bg-background/60 px-3 outline-none transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-ring"
              : "grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-accent/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <Globe aria-hidden="true" className="h-5 w-5 shrink-0" />
          {showCurrentLabel ? (
            <>
              <span className="min-w-0 flex-1 truncate text-start font-display text-xs font-bold tracking-wide">
                {active?.nativeName}
              </span>
              <span className="shrink-0 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
                {t("language.label")}
              </span>
            </>
          ) : (
            <span className="sr-only">{t("language.changeLanguage")}</span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} sideOffset={8} className={MENU_SURFACE}>
        <DropdownMenuLabel className="px-2.5 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
          {t("language.menuLabel")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-1 bg-border/60" />
        <div role="group" aria-label={t("language.menuLabel")}>
          {LANGUAGE_LIST.map((entry) => {
            const selected = entry.code === currentLanguage;
            return (
              <DropdownMenuItem
                key={entry.code}
                onSelect={() => selectLanguage(entry.code)}
                aria-checked={selected}
                className={cn(ITEM_CLASSES, selected && "bg-primary/10 text-primary")}
              >
                <span className="min-w-0 flex-1 truncate text-start" dir="auto">
                  {entry.nativeName}
                </span>
                {selected ? (
                  <Check aria-hidden="true" className="absolute end-2.5 h-4 w-4 shrink-0" />
                ) : null}
                <span className="sr-only">{selected ? "✓" : ""}</span>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Backwards-compatible alias — the old native-selector export name now renders
 * the custom menu so prior import sites keep working without a selector element.
 */
export function LanguageSelector({ className }: { className?: string }) {
  return <LanguageMenu className={className} showCurrentLabel />;
}
