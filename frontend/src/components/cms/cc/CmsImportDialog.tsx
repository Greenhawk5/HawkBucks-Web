import { useEffect, useRef, useState } from "react";
import { Download, FileJson, Loader2, Upload } from "lucide-react";

import { importAdminObjects, type ImportItemResult } from "@/lib/cms/import-admin.loader";
import {
  IMPORT_ENTITY_FIELD_LABELS,
  IMPORT_ENTITY_LABELS,
  buildBulkImportTemplate,
  buildSingleImportTemplate,
  describeImportFields,
  type ImportEntityKind,
} from "@/lib/cms/import-schemas";
import { CmsDialog, CmsField, CmsNotice, cmsToast } from "@/components/cms/cc/CmsPrimitives";

/**
 * CMS JSON import dialog: pick a section, download a template generated from
 * the real schema, upload a filled-in file, and read per-item results.
 *
 * THE CONTRACT THIS UI HONOURS
 * ---------------------------
 *   * Validation is server-side and authoritative; nothing here decides whether
 *     a file is acceptable. The dialog renders whatever the server returned.
 *   * A failed import reports the full error list and creates nothing. There is
 *     no partial-success state to render, by design.
 *   * Results keep the file's item order, and the slug shown is the one the
 *     server actually reserved (which may differ from the one authored).
 */

const MAX_FILE_BYTES = 2 * 1024 * 1024;

export function CmsImportDialog(props: {
  open: boolean;
  kind: ImportEntityKind;
  /** True for editor/admin; viewers never see the dialog at all. */
  canWrite: boolean;
  onClose: () => void;
  /** Called after a successful import so the caller can refresh its list. */
  onImported: (result: ImportItemResult[]) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [created, setCreated] = useState<ImportItemResult[]>([]);
  const fileInputId = useRef<HTMLInputElement | null>(null);

  // Reopening must never show the previous file's outcome.
  useEffect(() => {
    if (props.open) return;
    setFile(null);
    setLocalError(null);
    setErrors([]);
    setParseError(null);
    setCreated([]);
  }, [props.open]);

  async function handleSubmit() {
    if (pending || props.canWrite !== true) return;
    if (file === null) {
      setLocalError("Choose a JSON file first.");
      return;
    }
    setPending(true);
    setLocalError(null);
    setErrors([]);
    setParseError(null);
    setCreated([]);
    try {
      const document = await file.text();
      const result = await importAdminObjects({ data: { kind: props.kind, document } });
      if (result.ok) {
        setCreated(result.created);
        cmsToast(
          "success",
          `Imported ${result.created.length} ${props.kind}${result.created.length === 1 ? "" : "s"} as draft(s).`,
        );
        props.onImported(result.created);
      } else {
        // Parser failures and field failures are kept apart on purpose: a
        // malformed file has no item to attribute a field error to.
        setParseError(result.parseError);
        setErrors(result.errors);
      }
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setPending(false);
    }
  }

  const fields = describeImportFields(props.kind);
  const sectionLabel = IMPORT_ENTITY_LABELS[props.kind];
  const singularLabel = IMPORT_ENTITY_FIELD_LABELS[props.kind];

  return (
    <CmsDialog
      open={props.open}
      onClose={props.onClose}
      title={`Import ${sectionLabel} · JSON`}
      wide
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed opacity-75">
          Upload a JSON document to create <span className="font-medium">{singularLabel}</span>{" "}
          draft(s). Every item is validated against the same rules as the editor before anything is
          created — a file with any error creates nothing. Media is referenced by Media Asset id (
          <span className="font-mono">media_…</span>); upload the image in this editor or the Media
          Library first.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="cc-btn cc-btn-outline cc-btn-sm"
            onClick={() =>
              downloadTemplate(
                buildSingleImportTemplate(props.kind),
                `${props.kind}-single.template.json`,
              )
            }
          >
            <FileJson aria-hidden="true" className="h-3.5 w-3.5" />
            Download single template
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-outline cc-btn-sm"
            onClick={() =>
              downloadTemplate(
                buildBulkImportTemplate(props.kind),
                `${props.kind}-bulk.template.json`,
              )
            }
          >
            <Download aria-hidden="true" className="h-3.5 w-3.5" />
            Download bulk template
          </button>
        </div>

        <CmsField
          label="JSON file"
          htmlFor="cms-import-file"
          description={`Maximum ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)} MB. Both shapes are accepted: a bare object, or {"version": 1, "type": "${props.kind}", "items": [ … ]}.`}
        >
          <input
            ref={fileInputId}
            id="cms-import-file"
            type="file"
            accept="application/json,.json"
            disabled={pending}
            className="cc-input"
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              setCreated([]);
              setErrors([]);
              setParseError(null);
              setLocalError(null);
              if (next !== null && next.size > MAX_FILE_BYTES) {
                setFile(null);
                setLocalError(
                  `File is larger than ${Math.floor(MAX_FILE_BYTES / 1024 / 1024)} MB.`,
                );
                return;
              }
              setFile(next);
            }}
          />
        </CmsField>

        <details className="rounded-lg border px-3 py-2 cc-hairline">
          <summary className="cursor-pointer text-sm font-medium">
            Accepted fields ({fields.length})
          </summary>
          <ul className="mt-2 space-y-1 text-xs">
            {fields.map((field) => (
              <li key={field.key}>
                <span className="font-mono">{field.key}</span>
                {field.values !== undefined ? (
                  <span className="opacity-60"> — one of {JSON.stringify(field.values)}</span>
                ) : null}
                {field.note !== undefined ? (
                  <span className="opacity-60"> · {field.note}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>

        {localError === null ? null : <CmsNotice kind="error">{localError}</CmsNotice>}

        {parseError === null ? null : (
          <CmsNotice kind="error">
            <span className="font-medium">Could not read the file:</span> {parseError}
          </CmsNotice>
        )}

        {errors.length > 0 ? (
          <div className="space-y-2">
            <CmsNotice kind="error">
              {errors.length} problem{errors.length === 1 ? "" : "s"} found. No drafts were created.
            </CmsNotice>
            <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border px-3 py-2 text-xs cc-hairline">
              {errors.map((message, index) => (
                <li key={`${index}-${message}`} className="font-mono">
                  {message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {created.length > 0 ? (
          <div className="space-y-2">
            <CmsNotice kind="success">
              Created {created.length} draft{created.length === 1 ? "" : "s"}. Each is editable from
              the {sectionLabel} list.
            </CmsNotice>
            <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border px-3 py-2 text-xs cc-hairline">
              {created.map((item) => (
                <li key={item.item} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="opacity-60">#{item.item}</span>
                  <span className="font-medium">{item.title}</span>
                  <span className="font-mono opacity-60">/{item.slug}</span>
                  {item.slugAdjusted ? (
                    <span className="text-[var(--cc-amber)]">
                      slug adjusted to resolve a collision
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="cc-btn cc-btn-ghost cc-btn-sm"
            disabled={pending}
            onClick={props.onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="cc-btn cc-btn-primary cc-btn-sm"
            disabled={pending || props.canWrite !== true}
            aria-busy={pending}
            onClick={() => void handleSubmit()}
          >
            {pending ? (
              <>
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Upload aria-hidden="true" className="h-3.5 w-3.5" />
                Import
              </>
            )}
          </button>
        </div>

        <p className="sr-only" role="status">
          {pending ? "Validating and creating drafts." : ""}
        </p>
      </div>
    </CmsDialog>
  );
}

/**
 * Client-side template download via a Blob object URL.
 *
 * The template is GENERATED from the same field specs the validator uses, so it
 * cannot describe fields the server rejects or omit ones it requires.
 */
function downloadTemplate(contents: string, filename: string): void {
  const blob = new Blob([contents], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Release the object URL only after the click has been dispatched, otherwise
  // some browsers abort the download.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}
