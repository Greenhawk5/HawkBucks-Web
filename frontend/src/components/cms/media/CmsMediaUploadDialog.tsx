import { useEffect, useId, useState } from "react";
import { Loader2, Upload } from "lucide-react";

import { CmsDialog, CmsField, CmsNotice } from "@/components/cms/cc/CmsPrimitives";
import { CmsSelect } from "@/components/cms/cc/CmsSelect";
import {
  ACCEPTED_UPLOAD_MIME,
  formatBytes,
  MEDIA_FOLDERS,
  MAX_UPLOAD_BYTES,
  previewObjectKey,
} from "./media-format";

const ACCEPT_ATTR = ACCEPTED_UPLOAD_MIME.join(",");

/**
 * Upload dialog.
 *
 * The transport is unchanged — the parent still base64-encodes the file and
 * calls the same `uploadAdminMedia` server function, so the R2 key, the D1
 * row, and the resulting delivery URL are all byte-for-byte what they were.
 * What is new is the surrounding feedback: drag-and-drop, an inline preview
 * of the exact file and destination key, an explicit progress state, and a
 * validation message before anything is sent.
 */
export function CmsMediaUploadDialog(props: {
  open: boolean;
  pending: boolean;
  onClose: () => void;
  onUpload: (file: File, altText: string, folder: string) => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [altText, setAltText] = useState("");
  const [folder, setFolder] = useState<string>(MEDIA_FOLDERS[0]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputId = useId();

  // Object URLs leak until revoked; tie the lifetime to the selected file
  // and release it on unmount.
  const previewUrl = useObjectUrl(file);

  // Reopening the dialog should never show the previous file's state.
  useEffect(() => {
    if (props.open) return;
    setFile(null);
    setAltText("");
    setLocalError(null);
    setDragging(false);
  }, [props.open]);

  function acceptFile(next: File | null) {
    if (next === null) return;
    if (!(ACCEPTED_UPLOAD_MIME as readonly string[]).includes(next.type)) {
      setLocalError("Unsupported file type. Use jpeg, png, webp, avif, or gif.");
      return;
    }
    if (next.size > MAX_UPLOAD_BYTES) {
      setLocalError("File is too large. The maximum is 10 MB.");
      return;
    }
    setFile(next);
    setLocalError(null);
  }

  const destination = file === null ? null : previewObjectKey(folder, file.name, file.type);

  return (
    <CmsDialog open={props.open} onClose={props.onClose} title="Upload image">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (props.pending) return;
          if (file === null) {
            setLocalError("Choose a file first.");
            return;
          }
          void props.onUpload(file, altText, folder);
        }}
      >
        <CmsField
          label="File"
          htmlFor={fileInputId}
          description="jpeg, png, webp, avif, gif — max 10 MB, magic bytes verified server-side."
        >
          {/* The label is the whole drop target, so clicking it opens the
              native picker and dropping a file onto it is equivalent. The
              input stays focusable and labelled for keyboard/AT users. */}
          <label
            htmlFor={fileInputId}
            onDragOver={(e) => {
              e.preventDefault();
              if (!props.pending) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              if (props.pending) return;
              acceptFile(e.dataTransfer.files?.[0] ?? null);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
              dragging
                ? "border-[var(--cc-accent)] bg-[var(--cc-accent)]/10"
                : "cc-hairline hover:border-[var(--cc-accent)]/60"
            } ${props.pending ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              id={fileInputId}
              type="file"
              accept={ACCEPT_ATTR}
              disabled={props.pending}
              className="sr-only"
              onChange={(e) => acceptFile(e.target.files?.[0] ?? null)}
            />
            {file === null ? (
              <>
                <Upload aria-hidden="true" className="h-5 w-5 opacity-70" />
                <span className="text-sm font-medium">Choose a file or drop it here</span>
                <span className="text-xs opacity-60">Up to 10 MB</span>
              </>
            ) : (
              <SelectedFileSummary
                name={file.name}
                size={formatBytes(file.size)}
                previewUrl={previewUrl}
              />
            )}
          </label>
        </CmsField>

        <CmsField
          label="Folder"
          htmlFor="media-upload-folder"
          description="Deterministic R2 key folder. Re-uploading the same name replaces the object."
        >
          <CmsSelect
            id="media-upload-folder"
            value={folder}
            onChange={setFolder}
            width="full"
            options={MEDIA_FOLDERS.map((f) => ({ value: f, label: f }))}
          />
        </CmsField>

        <CmsField
          label="Alt text"
          htmlFor="media-upload-alt"
          description="Describes the image for screen readers."
        >
          <input
            id="media-upload-alt"
            className="cc-input"
            value={altText}
            disabled={props.pending}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Describe the image"
          />
        </CmsField>

        {destination === null ? null : (
          <p className="truncate font-mono text-[11px] opacity-55" title={destination}>
            Will be stored as {destination}
          </p>
        )}

        {localError === null ? null : <CmsNotice kind="error">{localError}</CmsNotice>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="cc-btn cc-btn-ghost cc-btn-sm"
            disabled={props.pending}
            onClick={props.onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="cc-btn cc-btn-primary cc-btn-sm"
            disabled={props.pending || file === null}
            aria-busy={props.pending}
          >
            {props.pending ? (
              <>
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                Uploading…
              </>
            ) : (
              "Upload"
            )}
          </button>
        </div>

        {/* Progress is announced, not just animated: a spinner alone
            conveys nothing to a screen reader. */}
        <p className="sr-only" role="status">
          {props.pending ? "Uploading image to R2 storage." : ""}
        </p>
      </form>
    </CmsDialog>
  );
}

/** In-dialog confirmation of exactly which file is staged for upload. */
function SelectedFileSummary(props: {
  name: string;
  size: string | null;
  previewUrl: string | null;
}) {
  return (
    <>
      {props.previewUrl === null ? null : (
        <img
          src={props.previewUrl}
          alt=""
          className="max-h-24 w-auto max-w-full rounded-lg border object-contain cc-hairline"
        />
      )}
      <span className="max-w-full truncate text-sm font-medium" title={props.name}>
        {props.name}
      </span>
      <span className="text-xs opacity-60">{props.size ?? "Size unknown"}</span>
      <span className="text-[11px] opacity-50">Choose a different file</span>
    </>
  );
}

/** Create an object URL for the staged file and revoke it when it changes. */
function useObjectUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (file === null) {
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => {
      URL.revokeObjectURL(next);
    };
  }, [file]);
  return url;
}
