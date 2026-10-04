import { FileImage, Trash2 } from "lucide-react";

import { CmsCopyButton, CmsStatusBadge } from "@/components/cms/cc/CmsPrimitives";
import {
  formatBytes,
  formatDimensions,
  formatMime,
  statusTone,
  type MediaAsset,
} from "./media-format";

/**
 * One asset tile in the Media Library grid.
 *
 * The whole tile is a single button so the entire thumbnail is a hit
 * target and keyboard users get one obvious control; the copy and delete
 * affordances sit outside that button so they are never nested inside
 * another control's activation area.
 */
export function CmsMediaAssetCard(props: {
  asset: MediaAsset;
  canWrite: boolean;
  onOpen: (asset: MediaAsset) => void;
  onDelete: (asset: MediaAsset) => void;
}) {
  const { asset } = props;
  const size = formatBytes(asset.byteSize);
  const dimensions = formatDimensions(asset.width, asset.height);
  const mime = formatMime(asset.mimeType);
  const hasAlt = asset.altText.trim() !== "";

  return (
    <li className="min-w-0">
      <div className="cc-panel group flex h-full flex-col overflow-hidden transition-colors duration-150 hover:border-[var(--cc-edge-2)] focus-within:border-[var(--cc-accent)]">
        <button
          type="button"
          className="relative block w-full outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--cc-accent)]"
          onClick={() => props.onOpen(asset)}
          title={`Preview ${asset.originalFilename}`}
        >
          <span
            aria-hidden="true"
            className="absolute end-2 top-2 z-10 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
          >
            <CmsStatusBadge tone={statusTone(asset.status)}>{asset.status}</CmsStatusBadge>
          </span>
          <MediaThumbnail asset={asset} />
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium" title={asset.originalFilename}>
              {asset.originalFilename}
            </p>
            <p className="mt-0.5 truncate font-mono text-[11px] opacity-60" title={asset.mimeType}>
              {[mime, size, dimensions].filter(Boolean).join(" · ") || asset.mimeType}
            </p>
          </div>

          <p
            className="line-clamp-2 min-h-[2rem] text-xs leading-relaxed opacity-60"
            title={
              hasAlt ? asset.altText : "No alt text — screen readers will announce the filename"
            }
          >
            {hasAlt ? asset.altText : "No alt text"}
          </p>

          <div className="mt-auto flex items-center justify-between gap-1 pt-1">
            <CmsCopyButton
              value={asset.deliveryUrl}
              label={`Copy delivery URL for ${asset.originalFilename}`}
            />
            {props.canWrite ? (
              <button
                type="button"
                className="cc-icon-btn hover:text-[var(--cc-danger)]"
                aria-label={`Delete ${asset.originalFilename}`}
                title={`Delete ${asset.originalFilename}`}
                onClick={() => props.onDelete(asset)}
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Thumbnail surface. `object-contain` on a fixed-ratio box so mixed
 * aspect ratios in one grid stay legible and nothing is cropped away —
 * a cropped hero and a cropped icon are both wrong here.
 */
function MediaThumbnail(props: { asset: MediaAsset }) {
  const { asset } = props;
  return (
    <span className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-black/25">
      <img
        src={asset.deliveryUrl}
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
      <span
        data-fallback
        hidden
        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-center"
      >
        <FileImage aria-hidden="true" className="h-5 w-5 opacity-50" />
        <span className="px-3 text-[11px] leading-tight opacity-60">Preview unavailable</span>
      </span>
    </span>
  );
}
