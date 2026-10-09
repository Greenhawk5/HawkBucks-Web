import { FileWarning, Folder, ImageOff } from "lucide-react";

import {
  CmsCopyButton,
  CmsStatusBadge,
  type CmsStatusTone,
} from "@/components/cms/cc/CmsPrimitives";
import { Checkbox } from "@/components/ui/checkbox";
import type { MediaInventoryEntry } from "@/lib/cms/media-inventory.server";
import {
  formatContentType,
  formatObjectSize,
  INVENTORY_STATE_LABELS,
  INVENTORY_STATE_TONES,
  isPreviewableContentType,
  resolveContentType,
} from "./media-inventory-format";

/**
 * One object tile in the Media Library grid.
 *
 * DELIBERATE LAYOUT CONTRACT (the tests assert these relationships):
 *   * The preview is ONE button (the details action) so keyboard users get a
 *     single obvious control.
 *   * Copy and select are SIBLINGS of that button, never children — a copy
 *     press can therefore never also open the detail panel.
 *   * `object-contain` inside a fixed-ratio frame: mixed aspect ratios in one
 *     grid stay legible and nothing is cropped or stretched.
 *   * The badge names the state in text (never colour alone) and every
 *     discovered object renders, registered or not.
 *
 * PREVIEW GATE: the object is previewed when its stored HTTP metadata says
 * image/* OR when its filename extension conservatively says so — objects
 * uploaded through the Cloudflare dashboard carry no stored content type even
 * though the public endpoint serves them correctly (see
 * media-inventory-format.ts). The fallback therefore only appears for a genuine
 * 4xx/MIME failure or a genuinely non-image object, and says WHICH.
 */
export function MediaObjectCard(props: {
  entry: MediaInventoryEntry;
  selectable: boolean;
  selected: boolean;
  onOpen: (entry: MediaInventoryEntry) => void;
  onToggleSelect: (entry: MediaInventoryEntry) => void;
}) {
  const { entry } = props;
  const label = INVENTORY_STATE_LABELS[entry.state];
  const tone: CmsStatusTone = INVENTORY_STATE_TONES[entry.state];
  const resolved = resolveContentType(entry.contentType, entry.key);
  const meta = [formatContentType(entry.contentType, entry.key), formatObjectSize(entry.size)]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="min-w-0">
      <div
        data-selected={props.selected ? "true" : undefined}
        className={[
          "cc-panel group flex h-full flex-col overflow-hidden transition-colors duration-150 hover:border-[var(--cc-edge-2)] focus-within:border-[var(--cc-accent)]",
          // Selected reads as an accent ring, not a colour flood.
          props.selected ? "border-[var(--cc-accent)] ring-1 ring-[var(--cc-accent)]" : "",
        ].join(" ")}
      >
        <button
          type="button"
          className="relative block w-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--cc-accent)]"
          onClick={() => props.onOpen(entry)}
          title={`Details for ${entry.filename}`}
        >
          <span
            aria-hidden="true"
            className="absolute start-2 top-2 z-10 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <CmsStatusBadge tone={tone}>{label}</CmsStatusBadge>
          </span>
          <ObjectThumbnail entry={entry} />
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium" title={entry.filename}>
              {entry.filename}
            </p>
            <p
              className="mt-0.5 truncate font-mono text-[11px] opacity-60"
              title={entry.parentPath}
            >
              {entry.parentPath === "" ? "bucket root" : entry.parentPath}
            </p>
          </div>

          <p className="truncate font-mono text-[11px] opacity-55" title={entry.key}>
            {meta}
            {/* Only when R2 itself had nothing to say: an extension-derived
                label must never masquerade as stored object metadata. */}
            {resolved.source === "extension" ? (
              <span
                className="ms-1 opacity-70"
                title="R2 stored no content type for this object; the format is derived from the filename extension."
              >
                (from filename)
              </span>
            ) : null}
          </p>

          <div className="mt-auto flex items-center justify-between gap-1 pt-1">
            {/* Copies THIS object's exact key — the storage identity content
                references are resolved against — read from the card's own
                entry, so it can never drift onto a neighbouring card. */}
            <CmsCopyButton value={entry.key} label={`Copy object key for ${entry.filename}`} />
            {props.selectable ? (
              // A <label> wrapper is the comfortable click target (the whole
              // pill, not just the 16px box); Radix supplies role=checkbox and
              // Space/Enter toggling, and the visible focus ring is explicit.
              <label
                className={[
                  "flex cursor-pointer select-none items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] transition-colors",
                  "focus-within:ring-2 focus-within:ring-[var(--cc-accent)]",
                  props.selected
                    ? "border-[var(--cc-accent)]/60 bg-[var(--cc-accent)]/12 text-[var(--cc-accent)]"
                    : "border-[var(--cc-edge)] opacity-75 hover:border-[var(--cc-edge-2)] hover:opacity-100",
                ].join(" ")}
              >
                <Checkbox
                  checked={props.selected}
                  onCheckedChange={() => props.onToggleSelect(entry)}
                  aria-label={`Select ${entry.filename} for registration`}
                  // Restyled onto the Control Center tokens: the shared
                  // default targets the public-site palette.
                  className="h-3.5 w-3.5 rounded-[4px] border-[var(--cc-edge-2)] bg-transparent shadow-none data-[state=checked]:border-[var(--cc-accent)] data-[state=checked]:bg-[var(--cc-accent)] data-[state=checked]:text-[var(--cc-void)] focus-visible:ring-1 focus-visible:ring-[var(--cc-accent)]"
                />
                {props.selected ? "Selected" : "Select"}
              </label>
            ) : (
              <span className="font-mono text-[10px] uppercase tracking-wider opacity-45">
                {label}
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Preview surface.
 *
 * Three distinct outcomes, never conflated:
 *   1. previewable  -> lazy <img> with object-contain
 *   2. not an image -> type badge (a real, named format)
 *   3. load failed  -> explicit "preview unavailable" notice, card still usable
 * A genuine 403/404 shows up as (3) rather than being hidden behind a generic
 * file icon.
 */
function ObjectThumbnail(props: { entry: MediaInventoryEntry }) {
  const { entry } = props;
  const previewable = isPreviewableContentType(entry.contentType, entry.key);
  const label = formatContentType(entry.contentType, entry.key);
  return (
    <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-black/25">
      {previewable ? (
        <img
          src={entry.deliveryUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-2 transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none"
          onError={(e) => {
            const container = e.currentTarget.parentElement;
            e.currentTarget.style.visibility = "hidden";
            // Swap the type badge for the load-failure notice: a real 403/404
            // must never look like "this is simply not an image".
            const fallback = container?.querySelector<HTMLElement>("[data-fallback]");
            const failed = container?.querySelector<HTMLElement>("[data-load-failed]");
            if (fallback) fallback.hidden = true;
            if (failed) failed.hidden = false;
          }}
        />
      ) : null}
      <span
        data-fallback
        hidden={previewable}
        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center"
      >
        <Folder aria-hidden="true" className="h-5 w-5 opacity-50" />
        <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">{label}</span>
      </span>
      {/* Shown only when an <img> was attempted and failed. */}
      <span
        data-load-failed
        hidden
        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center"
      >
        <ImageOff aria-hidden="true" className="h-5 w-5 opacity-60" />
        <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">{label}</span>
        <span className="text-[11px] leading-tight opacity-60">Preview unavailable</span>
        <span className="flex items-center gap-1 text-[10px] leading-tight opacity-50">
          <FileWarning aria-hidden="true" className="h-3 w-3 shrink-0" />
          The object may be missing or not publicly readable
        </span>
      </span>
    </span>
  );
}
