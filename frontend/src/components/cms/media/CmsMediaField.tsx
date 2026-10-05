import { useEffect, useState } from "react";
import { Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";

import { getAdminMediaByIds, uploadAdminMedia } from "@/lib/cms/media-admin.loader";
import { fileToBase64 } from "@/lib/cms/media-upload-client";
import { CmsField, CmsNotice, cmsToast } from "@/components/cms/cc/CmsPrimitives";
import { CmsMediaPicker } from "@/components/cms/cc/CmsMediaPicker";
import { CmsMediaUploadDialog } from "./CmsMediaUploadDialog";
import { formatBytes, formatDimensions, type MediaFolder } from "./media-format";

/**
 * The single media control for every CMS object editor.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every content record stores media as a nullable `*_asset_id` FK into
 * media_assets. Until now an editor had to leave the editor, open the Media
 * Library, upload, read the generated `media_…` id, come back, and paste it
 * into a free-text box — and four of the five such boxes had no picker at all.
 *
 * This component is the composition of the two dialogs that already existed:
 *   * CmsMediaUploadDialog -> uploadAdminMedia -> media.server.ts -> R2 + D1
 *   * CmsMediaPicker       -> listAdminMedia     (browse existing assets)
 *
 * It adds NO new upload path. `uploadAdminMedia` remains the only CMS upload
 * boundary, `media.server.ts` remains the only writer of media_assets, and the
 * value it stores is still an opaque media id — never a URL. Upload and the
 * Media Library are therefore two entry points into ONE media system.
 *
 * BACKWARD COMPATIBILITY
 * ----------------------
 * The id text box is deliberately still editable. Records created before this
 * component existed hold ids in exactly this column, and pasting an id must
 * keep working; the picker and uploader are additions, not replacements.
 * `value` is the single source of truth for the parent form, so the parent's
 * existing save path is unchanged.
 */

type ResolvedAsset = {
  id: string;
  deliveryUrl: string;
  originalFilename: string;
  mimeType: string;
  altText: string;
  status: string;
  byteSize: number | null;
  width: number | null;
  height: number | null;
};

export function CmsMediaField(props: {
  /** Field label, e.g. "Portrait asset id". */
  label: string;
  description?: string;
  /** The stored media id: "" or null means "no media". */
  value: string;
  /** Receives "" when the field is cleared so the parent can persist null. */
  onChange: (value: string) => void;
  /** Read-only for viewers; disables every control. */
  disabled?: boolean;
  /** Pre-selects the R2 folder for a new upload (defaults to "misc"). */
  folder?: MediaFolder;
  /** Aspect ratio of the preview thumbnail. */
  previewClassName?: string;
}) {
  const disabled = props.disabled === true;
  const [resolved, setResolved] = useState<ResolvedAsset | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const currentId = props.value.trim();
  const inputId = `cms-media-field-${props.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  /**
   * Resolve the id the form currently holds into a preview.
   *
   * Keyed on `currentId` only, and cancelled on every change, so a fast
   * sequence of edits can never let an older response overwrite a newer
   * selection (an out-of-order preview is worse than no preview). Any path
   * that changes the id — typing, picking, uploading, clearing — re-runs this,
   * so there is no second code path that could fall out of sync.
   */
  useEffect(() => {
    if (currentId === "") {
      setResolved(null);
      setResolveError(null);
      setResolving(false);
      return;
    }
    let active = true;
    setResolving(true);
    setResolveError(null);
    void getAdminMediaByIds({ data: { ids: [currentId] } })
      .then(({ items }) => {
        if (!active) return;
        setResolved(items[0] ?? null);
      })
      .catch((e: unknown) => {
        if (!active) return;
        setResolved(null);
        setResolveError(e instanceof Error ? e.message : "Could not load the media asset.");
      })
      .finally(() => {
        if (active) setResolving(false);
      });
    return () => {
      active = false;
    };
  }, [currentId]);

  async function handleUpload(file: File, altText: string, folder: string) {
    setUploading(true);
    setUploadError(null);
    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Only image uploads are accepted.");
      }
      const dataBase64 = await fileToBase64(file);
      const result = await uploadAndResolve({
        dataBase64,
        originalFilename: file.name,
        mimeType: file.type,
        altText,
        folder,
      });
      setUploadOpen(false);
      props.onChange(result);
      cmsToast("success", `Uploaded ${file.name}. Save to persist this reference.`);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <CmsField
      label={props.label}
      htmlFor={inputId}
      {...(props.description !== undefined ? { description: props.description } : {})}
    >
      <div className="space-y-2">
        <MediaPreview
          asset={resolved}
          loading={resolving}
          hasId={currentId !== ""}
          previewClassName={props.previewClassName}
        />

        <div className="flex flex-wrap items-center gap-2">
          <input
            id={inputId}
            className="cc-input min-w-40 flex-1 font-mono"
            value={props.value}
            placeholder="media_… (optional)"
            disabled={disabled || uploading}
            onChange={(e) => props.onChange(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="button"
            className="cc-btn cc-btn-outline cc-btn-sm"
            disabled={disabled || uploading}
            onClick={() => setUploadOpen(true)}
          >
            <Upload aria-hidden="true" className="h-3.5 w-3.5" />
            {currentId === "" ? "Upload" : "Replace"}
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-outline cc-btn-sm"
            disabled={disabled || uploading}
            onClick={() => setPickerOpen(true)}
          >
            <ImageIcon aria-hidden="true" className="h-3.5 w-3.5" />
            Select existing
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-ghost cc-btn-sm"
            disabled={disabled || uploading || currentId === ""}
            onClick={() => {
              props.onChange("");
              setResolved(null);
              cmsToast("success", "Media reference cleared. Save to persist.");
            }}
            aria-label={`Clear ${props.label}`}
          >
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
            Clear
          </button>
        </div>

        {currentId !== "" && resolved === null && !resolving && resolveError === null ? (
          <p className="text-xs opacity-60">
            No asset matches this id. It may be tombstoned — re-upload or pick another.
          </p>
        ) : null}

        {resolved !== null && resolved.status !== "ready" ? (
          <p className="text-xs text-[var(--cc-amber)]">
            This asset is <span className="font-mono">{resolved.status}</span>. Saving a reference
            to it will be rejected by the server.
          </p>
        ) : null}

        {resolveError === null ? null : <CmsNotice kind="error">{resolveError}</CmsNotice>}
        {uploadError === null ? null : <CmsNotice kind="error">{uploadError}</CmsNotice>}

        <CmsMediaPicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          title={`Choose ${props.label.toLowerCase()}`}
          onPick={(assetId) => props.onChange(assetId)}
        />

        <CmsMediaUploadDialog
          open={uploadOpen}
          pending={uploading}
          onClose={() => setUploadOpen(false)}
          onUpload={handleUpload}
        />
      </div>
    </CmsField>
  );
}

/**
 * Thumbnail + metadata for the resolved asset, or an explicit empty state.
 * Never renders an <img> without a resolved delivery URL, so a half-typed id
 * can never become a broken image request.
 */
function MediaPreview(props: {
  asset: ResolvedAsset | null;
  loading: boolean;
  hasId: boolean;
  previewClassName: string | undefined;
}) {
  if (props.loading) {
    return (
      <div className="flex h-20 items-center gap-2 rounded-lg border px-3 text-sm opacity-70 cc-hairline">
        <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
        Loading asset…
      </div>
    );
  }
  if (props.asset === null) {
    return (
      <div className="flex h-20 items-center gap-2 rounded-lg border border-dashed px-3 text-sm opacity-60 cc-hairline">
        {props.hasId ? "Unresolved media id" : "No media selected"}
      </div>
    );
  }
  const asset = props.asset;
  const size = formatBytes(asset.byteSize);
  const dimensions = formatDimensions(asset.width, asset.height);
  return (
    <figure className="flex items-center gap-3 rounded-lg border p-2 cc-hairline">
      <img
        src={asset.deliveryUrl}
        alt=""
        loading="lazy"
        className={`h-16 w-auto shrink-0 rounded object-contain ${props.previewClassName ?? ""}`}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
      <figcaption className="min-w-0 text-xs">
        <span className="block truncate font-medium" title={asset.originalFilename}>
          {asset.originalFilename}
        </span>
        <span className="block truncate font-mono opacity-60" title={asset.id}>
          {asset.id}
        </span>
        <span className="block opacity-55">
          {[dimensions, size, asset.mimeType].filter(Boolean).join(" · ") || "Unknown"}
        </span>
        {asset.altText === "" ? null : (
          <span className="block truncate opacity-55" title={asset.altText}>
            Alt: {asset.altText}
          </span>
        )}
      </figcaption>
    </figure>
  );
}

/**
 * Single upload call site. This is the ONLY media write this component can
 * perform, and it is the same server function the Media Library uses — the
 * inline editor is a second entry point to the one media pipeline, never a
 * parallel one.
 */
async function uploadAndResolve(input: {
  dataBase64: string;
  originalFilename: string;
  mimeType: string;
  altText: string;
  folder: string;
}): Promise<string> {
  const result = await uploadAdminMedia({ data: input });
  return result.id;
}
