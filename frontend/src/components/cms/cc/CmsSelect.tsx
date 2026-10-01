import { useId } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";

export interface CmsSelectOption {
  value: string;
  label: string;
}

/**
 * Control Center select — a HawkBucks-styled wrapper over the project's
 * existing Radix/shadcn Select primitive (same component as the rest of the
 * app; no second implementation). Dark `.cc-*` surface: 40px height matching
 * `.cc-input`/`.cc-btn`, subtle edge border, 8px radius, ChevronsUpDown-free
 * single chevron indicator, restrained elevation on the menu, accent-tinted
 * selected state. Full Radix keyboard/ARIA semantics are inherited, not
 * reimplemented: arrow-key navigation, Enter/Space, Escape, focus-visible,
 * disabled propagation, selected disclosure via ItemIndicator.
 *
 * Every consumer passes a stable `id` so the surrounding plain <label>
 * (filters) or CmsField (editors/dialogs) can associate via htmlFor —
 * matching the previous native-dropdown id contract.
 */
export function CmsSelect(props: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<CmsSelectOption>;
  placeholder?: string;
  disabled?: boolean | undefined;
  className?: string;
  /** Width behavior: filters size to content, fields stretch. Defaults to auto. */
  width?: "auto" | "full";
}) {
  const fallbackId = useId();
  const id = props.id || fallbackId;
  // Radix Select cannot reliably select an item whose value is the empty
  // string (it treats "" as "no value", breaking the All/None options every
  // CMS filter uses). Map "" to a private sentinel internally; the external
  // value/onChange contract stays ""-based so call sites are untouched.
  const toInternal = (v: string) => (v === "" ? "__cms_empty__" : v);
  const fromInternal = (v: string) => (v === "__cms_empty__" ? "" : v);
  return (
    <Select
      value={toInternal(props.value)}
      onValueChange={(v) => props.onChange(fromInternal(v))}
      // Radix types `disabled` as non-optional under exactOptionalPropertyTypes,
      // so only forward it when the caller actually sets it.
      {...(props.disabled !== undefined ? { disabled: props.disabled } : {})}
    >
      <SelectTrigger
        id={id}
        className={cn(
          "cc-select-trigger",
          props.width === "full" ? "w-full" : "w-auto min-w-36 max-w-full",
          props.className,
        )}
      >
        <SelectValue placeholder={props.placeholder ?? "Select…"} />
      </SelectTrigger>
      <SelectContent position="popper" className="cc-select-content z-[92]">
        {props.options.map((opt, i) => (
          <SelectItem
            key={opt.value === "" ? `__empty_${i}__` : opt.value}
            value={toInternal(opt.value)}
            className="cc-select-item"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
