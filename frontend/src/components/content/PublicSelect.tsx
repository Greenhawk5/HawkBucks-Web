import { useId } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface PublicSelectOption {
  value: string;
  label: string;
}

/**
 * Public-facing select — the same Radix primitive (components/ui/select) the
 * Control Center wraps, restyled with public theme tokens. No second
 * implementation: keyboard navigation, typeahead, Escape, focus-visible,
 * portal/popover positioning, and RTL mirroring are inherited from Radix.
 *
 * Distinct from CmsSelect on purpose: that one skins `.cc-*` tokens scoped to
 * `.cc-root`, which do not resolve on public pages.
 *
 * Indicator: the shared SelectTrigger already renders Radix's Select.Icon, so
 * this wrapper deliberately renders NO chevron of its own — adding one here is
 * what produced the doubled arrow on the public hubs. The single indicator is
 * restyled through the trigger's class list only.
 */
export function PublicSelect({
  id,
  value,
  onChange,
  options,
  label,
  placeholder,
  className,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<PublicSelectOption>;
  /** Accessible name when no visible <label htmlFor> exists. */
  label: string;
  placeholder?: string;
  className?: string;
}) {
  const fallbackId = useId();
  const selectId = id ?? fallbackId;
  // Radix treats "" as "no value", which breaks All/Default options. Map it to
  // a private sentinel so the external contract stays ""-based.
  const toInternal = (v: string) => (v === "" ? "__public_empty__" : v);
  const fromInternal = (v: string) => (v === "__public_empty__" ? "" : v);
  return (
    <Select value={toInternal(value)} onValueChange={(v) => onChange(fromInternal(v))}>
      <SelectTrigger
        id={selectId}
        aria-label={label}
        className={cn(
          "h-11 w-full min-w-44 cursor-pointer rounded-lg border border-panel-border bg-background/60 px-3 text-sm font-medium shadow-none outline-none transition-colors",
          "hover:border-primary/60 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring",
          // Exactly ONE indicator: the Radix Select.Icon rendered by the shared
          // SelectTrigger. Styled here to the public muted token (the primitive
          // ships opacity-50) without adding a second chevron of our own.
          "[&>span]:truncate [&>svg]:shrink-0 [&>svg]:text-muted-foreground",
          "data-[state=open]:border-primary",
          className,
        )}
      >
        <SelectValue placeholder={placeholder ?? label} />
      </SelectTrigger>
      <SelectContent
        position="popper"
        className="z-[60] rounded-xl border border-panel-border bg-popover p-1 text-popover-foreground shadow-[0_18px_40px_-20px_oklch(0_0_0/85%)]"
      >
        {options.map((opt, i) => (
          <SelectItem
            key={opt.value === "" ? `__public_empty_${i}__` : opt.value}
            value={toInternal(opt.value)}
            className="cursor-pointer rounded-lg py-2 ps-3 pe-8 text-sm focus:bg-primary/15 focus:text-foreground data-[state=checked]:font-semibold data-[state=checked]:text-primary"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
