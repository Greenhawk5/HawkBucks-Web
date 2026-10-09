import { useEffect, useState } from "react";
import { ExternalLink, Loader2, RotateCcw, Save, Trash2 } from "lucide-react";

import {
  CmsConfirmDialog,
  CmsCopyButton,
  CmsDialog,
  CmsField,
  CmsStatusBadge,
  type CmsStatusTone,
} from "@/components/cms/cc/CmsPrimitives";
import type { AdminMediaReferencesResult } from "@/lib/cms/media-admin.loader";
import type { MediaObjectDetailView } from "@/lib/cms/media-inventory.server";
import {
  formatContentType,
  formatObjectSize,
  formatStoredAt,
  INVENTORY_STATE_LABELS,
  INVENTORY_STATE_TONES,
  inventoryStateDescription,
  isPreviewableContentType,
} from "./media-inventory-format";

export type MediaDetailAction =
  | { kind: "register" }
  | { kind: "saveMetadata"; altText: string }
  | { kind: "removeFromCms" }
  | { kind: "restore" }
  | { kind: "deleteObject" };

/**
 * Object detail panel â€” the place where the lifecycle becomes explicit.
 *
 * Every destructive action is a SEPARATE, clearly labelled control with its
 * own confirmation copy:
 *   * "Remove from CMS" never deletes bytes and says so.
 *   * "Delete object from R2" is destructive, is reference-checked server-side,
 *     and is disabled with the reference list when the asset is in use.
 * A tombstone is never reported as a physical deletion, and a missing object
 * is never shown as healthy.
 */
export function MediaObjectDetail(props: {
  detail: MediaObjectDetailView | null;
  references: AdminMediaReferencesResult | null;
  referencesLoading: boolean;
  canWrite: boolean;
  pending: boolean;
  onClose: () => void;
  onAction: (action: MediaDetailAction) => void;
}) {
  const detail = props.detail;
  const [altText, setAltText] = useState("");
  const [confirmDestroy, setConfirmDestroy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // The form follows the loaded object; a stale value must never be saved into
  // a different asset's row.
  useEffect(() => {
    setAltText(detail?.entry.row?.altText ?? "");
    setConfirmDestroy(false);
    setConfirmRemove(false);
  }, [detail?.key, detail?.entry.row?.id, detail?.entry.row?.altText]);

  if (detail === null) return null;
  const { entry, object } = detail;
  const row = entry.row;
  const tone: CmsStatusTone = INVENTORY_STATE_TONES[entry.state];
  const references = props.references?.references ?? [];
  const canRegister = entry.registration === "discovered" && props.canWrite;
  const canEditMetadata = row !== null && row.status !== "deleted" && props.canWrite;
  const canRemoveFromCms = row !== null && row.status !== "deleted" && props.canWrite;
  const canRestore = row !== null && row.status === "deleted" && object !== null && props.canWrite;
  const canDestroy = entry.registration !== "missing" && props.canWrite;
  const destroyBlocked = references.length > 0;

  return (
    <CmsDialog open={detail !== null} onClose={props.onClose} title={entry.filename} size="lg">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start">
        <figure className="m-0 min-w-0 space-y-2">
          <div className="relative flex aspect-[4/3] max-h-[46dvh] w-full items-center justify-center overflow-hidden rounded-xl border bg-black/30 p-3 cc-hairline">
            {isPreviewableContentType(entry.contentType) ? (
              <img
                src={entry.deliveryUrl}
                alt={row?.altText ?? ""}
                decoding="async"
                className="max-h-full max-w-full object-contain"
                onError={(e) => {
                  e.currentTarget.hidden = true;
                  const fallback =
                    e.currentTarget.parentElement?.querySelector<HTMLElement>(
                      "[data-detail-fallback]",
                    );
                  if (fallback) fallback.hidden = false;
                }}
              />
            ) : null}
            <div
              data-detail-fallback
              hidden={isPreviewableContentType(entry.contentType)}
              className="flex flex-col items-center justify-center gap-2 px-4 text-center"
            >
              <p className="font-mono text-[11px] uppercase tracking-wider opacity-70">
                {formatContentType(entry.contentType)}
              </p>
              <p className="max-w-[18rem] text-xs leading-relaxed opacity-60">
                {isPreviewableContentType(entry.contentType)
                  ? "This object could not be loaded from its public URL. The metadata below still reflects what R2 reports."
                  : "This object is not a previewable image. Its metadata is still accurate."}
              </p>
            </div>
          </div>
          <figcaption className="font-mono text-[11px] leading-relaxed break-all opacity-55">
            {entry.key}
          </figcaption>
        </figure>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <CmsStatusBadge tone={tone}>{INVENTORY_STATE_LABELS[entry.state]}</CmsStatusBadge>
            <span className="font-mono text-[11px] opacity-60">
              {[formatContentType(entry.contentType), formatObjectSize(entry.size)]
                .filter(Boolean)
                .join(" Â· ")}
            </span>
          </div>

          <p className="text-[13px] leading-relaxed opacity-80">
            {inventoryStateDescription(entry.state)}
          </p>

          <section className="rounded-xl border px-3 cc-hairline" aria-label="Storage">
            <h4 className="cc-eyebrow border-b py-2 cc-hairline">Storage (R2)</h4>
            <dl className="divide-y cc-hairline">
              <ValueRow label="Object key">
                <span className="min-w-0 flex-1 break-all font-mono text-xs leading-relaxed">
                  {entry.key}
                </span>
                <CmsCopyButton value={entry.key} label={`Copy object key for ${entry.filename}`} />
              </ValueRow>
              <ValueRow label="Public URL">
                <a
                  href={entry.deliveryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in a new tab"
                  className="cc-link inline-flex min-w-0 flex-1 items-start gap-1 break-all font-mono text-xs leading-relaxed"
                >
                  <span className="min-w-0 break-all">{entry.deliveryUrl}</span>
                  <ExternalLink
                    aria-hidden="true"
                    className="mt-0.5 h-3 w-3 shrink-0 opacity-70 rtl:scale-x-[-1]"
                  />
                </a>
                <CmsCopyButton
                  value={entry.deliveryUrl}
                  label={`Copy public URL for ${entry.filename}`}
                />
              </ValueRow>
              <MetadataRow label="File size" value={formatObjectSize(entry.size)} mono />
              <MetadataRow label="Content type" value={formatContentType(entry.contentType)} mono />
              <MetadataRow label="Uploaded" value={formatStoredAt(entry.uploaded)} mono />
              <MetadataRow
                label="ETag"
                value={entry.etag ?? "unknown"}
                mono
                title={
                  entry.etag === null
                    ? undefined
                    : "R2 ETag of the stored object â€” a storage artefact, not a guaranteed content hash"
                }
              />
            </dl>
          </section>

          <section className="rounded-xl border px-3 cc-hairline" aria-label="CMS metadata">
            <h4 className="cc-eyebrow border-b py-2 cc-hairline">CMS metadata (D1)</h4>
            <dl className="divide-y cc-hairline">
              <MetadataRow
                label="Registration"
                value={
                  row === null
                    ? "Not registered"
                    : `${row.status}${row.status === "deleted" ? " (removed from CMS)" : ""}`
                }
                mono
              />
              <MetadataRow label="Asset ID" value={row?.id ?? "â€”"} mono />
              <MetadataRow
                label="Stored size"
                value={
                  row?.byteSize === null || row?.byteSize === undefined
                    ? "not recorded"
                    : `${row.byteSize} bytes`
                }
                mono
              />
            </dl>
            {row === null ? (
              <p className="py-3 text-xs leading-relaxed opacity-70">
                This object has no CMS row, so it cannot be referenced by content yet. Register it
                to create the metadata row â€” no bytes are uploaded or rewritten.
              </p>
            ) : (
              <div className="py-3">
                <CmsField
                  label="Alt text"
                  htmlFor="media-detail-alt"
                  description="Describes the image for screen readers. Stored in D1 only â€” saving never rewrites the R2 object."
                >
                  <textarea
                    id="media-detail-alt"
                    className="cc-input min-h-20 w-full"
                    value={altText}
                    disabled={!canEditMetadata || props.pending}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Describe the image"
                  />
                </CmsField>
              </div>
            )}
          </section>

          <section className="rounded-xl border px-3 cc-hairline" aria-label="References">
            <h4 className="cc-eyebrow border-b py-2 cc-hairline">Used by</h4>
            {props.referencesLoading ? (
              <p className="flex items-center gap-2 py-3 text-xs opacity-70">
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                Checking referencesâ€¦
              </p>
            ) : row === null ? (
              <p className="py-3 text-xs leading-relaxed opacity-70">
                Not registered, so no CMS record references this object by asset id.
              </p>
            ) : references.length === 0 ? (
              <p className="py-3 text-xs leading-relaxed opacity-70">
                No references found in heroes, loadouts, inventory, articles or social metadata.
              </p>
            ) : (
              <ul className="divide-y cc-hairline">
                {references.map((reference) => (
                  <li
                    key={`${reference.source}:${reference.entityId}`}
                    className="flex flex-wrap items-baseline justify-between gap-2 py-2"
                  >
                    <span className="text-[13px]">{reference.label}</span>
                    <span className="font-mono text-[11px] opacity-55">{reference.entityId}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="space-y-2 rounded-xl border px-3 py-3 cc-hairline"
            aria-label="Actions"
          >
            <h4 className="cc-eyebrow">Actions</h4>
            <div className="flex flex-wrap gap-2">
              {canRegister ? (
                <button
                  type="button"
                  className="cc-btn cc-btn-primary cc-btn-sm"
                  disabled={props.pending}
                  onClick={() => props.onAction({ kind: "register" })}
                >
                  Register in CMS
                </button>
              ) : null}
              <button
                type="button"
                className="cc-btn cc-btn-outline cc-btn-sm"
                disabled={!canEditMetadata || props.pending}
                onClick={() => props.onAction({ kind: "saveMetadata", altText })}
              >
                <Save aria-hidden="true" className="h-3.5 w-3.5" />
                Save metadata
              </button>
              {canRemoveFromCms ? (
                <button
                  type="button"
                  className="cc-btn cc-btn-outline cc-btn-sm"
                  disabled={props.pending}
                  onClick={() => setConfirmRemove(true)}
                >
                  Remove from CMS
                </button>
              ) : null}
              {canRestore ? (
                <button
                  type="button"
                  className="cc-btn cc-btn-outline cc-btn-sm"
                  disabled={props.pending}
                  onClick={() => props.onAction({ kind: "restore" })}
                >
                  <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
                  Restore to CMS
                </button>
              ) : null}
              <button
                type="button"
                className="cc-btn cc-btn-danger-outline cc-btn-sm"
                disabled={!canDestroy || props.pending || destroyBlocked}
                title={
                  !canDestroy
                    ? "The object is already gone from R2."
                    : destroyBlocked
                      ? "Referenced assets cannot be deleted â€” remove the references first."
                      : "Permanently delete the object from R2"
                }
                onClick={() => setConfirmDestroy(true)}
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                Delete object from R2
              </button>
            </div>
            {destroyBlocked ? (
              <p className="text-xs leading-relaxed text-[var(--cc-amber)]">
                Deletion is blocked while {references.length} reference
                {references.length === 1 ? "" : "s"} exist. Replacing the object at the same key is
                the safe alternative for content that is already published.
              </p>
            ) : null}
            {row && row.status === "deleted" ? (
              <p className="text-xs leading-relaxed opacity-70">
                This asset is currently removed from the CMS. Restoring it does not re-upload
                anything â€” it flips the CMS state back for the object that still exists.
              </p>
            ) : null}
          </section>
        </div>
      </div>

      <CmsConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => {
          setConfirmRemove(false);
          props.onAction({ kind: "removeFromCms" });
        }}
        title={`Remove ${entry.filename} from the CMS?`}
        body="This hides the asset from CMS listings and blocks new references. It does NOT delete the file from R2: the object stays in storage and its public URL keeps working until you delete the object itself."
        confirmLabel="Remove from CMS"
        pending={props.pending}
      />

      <CmsConfirmDialog
        open={confirmDestroy}
        onClose={() => setConfirmDestroy(false)}
        onConfirm={() => {
          setConfirmDestroy(false);
          props.onAction({ kind: "deleteObject" });
        }}
        title={`Permanently delete ${entry.filename} from R2?`}
        body={`This is destructive and cannot be undone from the CMS. The object ${entry.key} is deleted from the hawkbucks-media bucket and its public URL stops working. The CMS row is tombstoned so no content keeps pointing at it.`}
        confirmLabel="Delete object"
        pending={props.pending}
      />
    </CmsDialog>
  );
}

/** Label + value row. A plain container â€” never a button â€” so the value's own
 * interactive element receives its own clicks. */
function ValueRow(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2">
      <span className="cc-eyebrow">{props.label}</span>
      <div className="mt-1 flex min-w-0 items-start gap-1">{props.children}</div>
    </div>
  );
}

function MetadataRow(props: {
  label: string;
  value: string;
  mono?: boolean;
  title?: string | undefined;
}) {
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
