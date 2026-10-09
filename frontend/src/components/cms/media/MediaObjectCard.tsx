import { FileImage, Folder } from "lucide-react";

import {
  CmsCopyButton,
  CmsStatusBadge,
  type CmsStatusTone,
} from "@/components/cms/cc/CmsPrimitives";
import type { MediaInventoryEntry } from "@/lib/cms/media-inventory.server";
import {
  formatContentType,
  formatObjectSize,
  INVENTORY_STATE_LABELS,
  INVENTORY_STATE_TONES,
  isPreviewableContentType,
} from "./media-inventory-format";

/**
 * One object tile in the Media Library grid.
 *
 * DELIBERATE LAYOUT CONTRACT (the tests assert these relationships):
 *   * The whole tile body is ONE button (the preview/details action) so
 *     keyboard users get a single obvious control.
 *   * Copy and select are SIBLINGS of that button, never children — a copy
 *     press can therefore never also open the detail panel.
 *   * `object-contain` inside a fixed-ratio frame: mixed aspect ratios in one
 *     grid stay legible and nothing is cropped or stretched.
 *   * The badge names the state in text (never colour alone) and every
 *     discovered object renders, registered or not.
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
  const meta = [formatContentType(entry.contentType), formatObjectSize(entry.size)]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="min-w-0">
      <div className="cc-panel group flex h-full flex-col overflow-hidden transition-colors duration-150 hover:border-[var(--cc-edge-2)] focus-within:border-[var(--cc-accent)]">
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
          </p>

          <div className="mt-auto flex items-center justify-between gap-1 pt-1">
            {/* Copies THIS object's exact key — the storage identity content
                references are resolved against — read from the card's own
                entry, so it can never drift onto a neighbouring card. */}
            <CmsCopyButton value={entry.key} label={`Copy object key for ${entry.filename}`} />
            {props.selectable ? (
              <label className="flex cursor-pointer items-center gap-1.5 text-[11px] opacity-70">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-[var(--cc-accent)]"
                  checked={props.selected}
                  onChange={() => props.onToggleSelect(entry)}
                  aria-label={`Select ${entry.filename} for registration`}
                />
                Select
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
 * Preview surface. Images render lazy and at their own proportions; anything
 * that is not a previewable image gets a type badge instead of a broken img.
 */
function ObjectThumbnail(props: { entry: MediaInventoryEntry }) {
  const { entry } = props;
  return (
    <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-black/25">
      {isPreviewableContentType(entry.contentType) ? (
        <img
          src={entry.deliveryUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-2 transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none"
          onError={(e) => {
            const img = e.currentTarget;
            img.style.visibility = "hidden";
            const fallback = img.parentElement?.querySelector<HTMLElement>("[data-fallback]");
            if (fallback) fallback.hidden = false;
          }}
        />
      ) : null}
      <span
        data-fallback
        hidden={isPreviewableContentType(entry.contentType)}
        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center"
      >
        {entry.contentType === null ? (
          <Folder aria-hidden="true" className="h-5 w-5 opacity-50" />
        ) : (
          <FileImage aria-hidden="true" className="h-5 w-5 opacity-50" />
        )}
        <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">
          {formatContentType(entry.contentType)}
        </span>
        {isPreviewableContentType(entry.contentType) ? (
          <span className="text-[11px] leading-tight opacity-60">Preview unavailable</span>
        ) : null}
      </span>
    </span>
  );
}
