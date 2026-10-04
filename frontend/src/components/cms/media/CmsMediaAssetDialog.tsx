import type { ReactNode } from "react";
import { ExternalLink, FileImage } from "lucide-react";

import {
  CmsCopyButton,
  CmsDialog,
  CmsStatusBadge,
  relativeTime,
} from "@/components/cms/cc/CmsPrimitives";
import {
  EMPTY_VALUE,
  folderFromUrl,
  formatBytes,
  formatDimensions,
  formatMime,
  statusTone,
  type MediaAsset,
} from "./media-format";

/**
 * Asset detail modal.
 *
 * Interaction contract (deliberate, do not collapse these):
 *  - Clicking the URL TEXT opens the real delivery URL in a new tab.
 *  - Clicking the COPY ICON beside it copies that same URL.
 *  - The row itself is inert — it is not a copy target, so a user aiming
 *    at the link never gets a silent clipboard write instead of a tab.
 *
 * Copy actions live beside the values they copy. There is intentionally
 * no large "Copy URL" button in the footer; closing is the header ✕.
 */
export function CmsMediaAssetDialog(props: { asset: MediaAsset | null; onClose: () => void }) {
  const asset = props.asset;
  const size = asset === null ? null : formatBytes(asset.byteSize);
  const dimensions = asset === null ? null : formatDimensions(asset.width, asset.height);
  const folder = asset === null ? null : folderFromUrl(asset.deliveryUrl);

  return (
    <CmsDialog
      open={asset !== null}
      onClose={props.onClose}
      title={asset?.originalFilename ?? "Asset"}
      size="lg"
    >
      {asset === null ? null : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
          <AssetPreview asset={asset} />

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <CmsStatusBadge tone={statusTone(asset.status)}>{asset.status}</CmsStatusBadge>
              <span className="font-mono text-[11px] opacity-60">
                {[formatMime(asset.mimeType), size, dimensions].filter(Boolean).join(" · ") ||
                  asset.mimeType}
              </span>
            </div>

            <MetadataGroup title="Storage">
              <MetadataRow label="Provider" value={asset.provider} mono />
              <MetadataRow label="Folder" value={folder ?? EMPTY_VALUE} mono />
              <MetadataRow
                label="Added"
                value={relativeTime(asset.createdAt)}
                title={asset.createdAt}
              />
            </MetadataGroup>

            <MetadataGroup title="Technical">
              <MetadataRow label="MIME type" value={formatMime(asset.mimeType)} mono />
              <MetadataRow label="Dimensions" value={dimensions ?? EMPTY_VALUE} mono />
              <MetadataRow label="File size" value={size ?? EMPTY_VALUE} mono />
            </MetadataGroup>

            <MetadataGroup title="Accessibility">
              <div className="py-2">
                <span className="cc-eyebrow">Alt text</span>
                <p
                  className={
                    asset.altText.trim() === ""
                      ? "mt-1 text-[13px] opacity-60"
                      : "mt-1 text-[13px] leading-relaxed break-words"
                  }
                >
                  {asset.altText.trim() === "" ? "No alt text set" : asset.altText}
                </p>
              </div>
            </MetadataGroup>

            <MetadataGroup title="Public URL">
              <ValueRow label="Delivery URL">
                <a
                  href={asset.deliveryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in a new tab"
                  className="cc-link inline-flex min-w-0 flex-1 items-start gap-1 break-all font-mono text-xs leading-relaxed"
                >
                  <span className="min-w-0 break-all">{asset.deliveryUrl}</span>
                  <ExternalLink
                    aria-hidden="true"
                    className="mt-0.5 h-3 w-3 shrink-0 opacity-70 rtl:scale-x-[-1]"
                  />
                </a>
                <CmsCopyButton
                  value={asset.deliveryUrl}
                  label={`Copy delivery URL for ${asset.originalFilename}`}
                />
              </ValueRow>
            </MetadataGroup>

            <MetadataGroup title="Asset identity">
              <ValueRow label="Asset ID">
                <span className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed">
                  {asset.id}
                </span>
                <CmsCopyButton
                  value={asset.id}
                  label={`Copy asset ID for ${asset.originalFilename}`}
                />
              </ValueRow>
            </MetadataGroup>
          </div>
        </div>
      )}
    </CmsDialog>
  );
}

/**
 * Preview stage. A neutral recessed surface plus `object-contain` inside a
 * height-capped frame: whatever the incoming aspect ratio, the whole asset
 * stays visible and nothing is cropped or stretched.
 */
function AssetPreview(props: { asset: MediaAsset }) {
  const dimensions = formatDimensions(props.asset.width, props.asset.height);
  const alt = props.asset.altText.trim();
  return (
    <figure className="m-0 min-w-0 space-y-2">
      <div className="relative flex aspect-[4/3] max-h-[52dvh] w-full items-center justify-center overflow-hidden rounded-xl border bg-black/30 p-3 cc-hairline">
        <img
          src={props.asset.deliveryUrl}
          alt={alt === "" ? props.asset.originalFilename : alt}
          decoding="async"
          className="max-h-full max-w-full object-contain"
          onError={(e) => {
            const container = e.currentTarget.parentElement;
            if (container === null) return;
            e.currentTarget.hidden = true;
            const fallback = container.querySelector<HTMLElement>("[data-preview-fallback]");
            if (fallback) fallback.hidden = false;
          }}
        />
        <div
          data-preview-fallback
          hidden
          className="flex flex-col items-center justify-center gap-2 text-center"
        >
          <FileImage aria-hidden="true" className="h-6 w-6 opacity-50" />
          <p className="max-w-[16rem] text-xs leading-relaxed opacity-60">
            This asset could not be loaded from its delivery URL. The metadata below is still
            accurate.
          </p>
        </div>
      </div>
      <figcaption className="truncate text-[11px] opacity-55">
        {dimensions === null
          ? "Dimensions not recorded for this asset."
          : `${dimensions} · shown at actual proportions`}
      </figcaption>
    </figure>
  );
}

/** Titled group of related rows — the visual hierarchy the flat list lacked. */
function MetadataGroup(props: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border px-3 cc-hairline" aria-label={props.title}>
      <h4 className="cc-eyebrow border-b py-2 cc-hairline">{props.title}</h4>
      <dl className="divide-y cc-hairline">{props.children}</dl>
    </section>
  );
}

/**
 * A label plus a value and an optional trailing control (a copy button).
 * The row is a plain container — never a button — so a click on the value
 * reaches the value's own interactive element and nothing else.
 */
function ValueRow(props: { label: string; children: ReactNode }) {
  return (
    <div className="py-2">
      <span className="cc-eyebrow">{props.label}</span>
      <div className="mt-1 flex min-w-0 items-start gap-1">{props.children}</div>
    </div>
  );
}

function MetadataRow(props: { label: string; value: string; mono?: boolean; title?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2">
      <dt className="text-xs opacity-60">{props.label}</dt>
      <dd
        className={`min-w-0 break-words text-[13px] ${props.mono === true ? "font-mono" : ""}`}
        title={props.title ?? props.value}
      >
        {props.value}
      </dd>
    </div>
  );
}
