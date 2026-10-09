import { Loader2, RefreshCw } from "lucide-react";

import { CmsNotice, CmsStatusBadge, type CmsStatusTone } from "@/components/cms/cc/CmsPrimitives";
import type { MediaInventoryState, ReconciliationSummary } from "@/lib/cms/media-inventory";
import { MAX_REGISTER_KEYS } from "@/lib/cms/media-inventory";
import { INVENTORY_STATE_LABELS, INVENTORY_STATE_TONES } from "./media-inventory-format";

/** Display order for the six derived states in the report. */
const REPORT_ORDER: MediaInventoryState[] = [
  "registered_present",
  "metadata_incomplete",
  "discovered_unregistered",
  "registered_missing",
  "cms_deleted_object_present",
  "cms_deleted_object_missing",
];

/** How many keys each list shows before "…and N more". */
const LIST_PREVIEW = 12;

/**
 * Reconciliation report panel.
 *
 * Read-only by construction: the pass compares R2 against D1 and reports.
 * Registering discovered objects is offered as an explicit follow-up action
 * that names how many keys it will touch — never as a side effect of the scan.
 */
export function MediaReconcilePanel(props: {
  report: ReconciliationSummary | null;
  pending: boolean;
  canWrite: boolean;
  scopeLabel: string;
  onRun: () => void;
  onRegister: (keys: string[]) => void;
}) {
  const report = props.report;
  const unregistered = report?.unregisteredKeys ?? [];

  return (
    <section className="cc-panel px-3.5 py-3" aria-label="Storage reconciliation">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="cc-eyebrow">R2 / D1 reconciliation</h2>
          <p className="mt-1 text-xs leading-relaxed opacity-70">
            Compares the objects actually stored in R2 with the CMS rows in D1, for{" "}
            {props.scopeLabel}. Read-only — nothing is uploaded, rewritten or registered by the scan
            itself.
          </p>
        </div>
        <button
          type="button"
          className="cc-btn cc-btn-outline cc-btn-sm"
          disabled={props.pending}
          onClick={props.onRun}
        >
          {props.pending ? (
            <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          {props.pending ? "Reconciling…" : report === null ? "Run reconciliation" : "Re-run"}
        </button>
      </div>

      {report === null ? (
        <p className="mt-3 text-xs leading-relaxed opacity-60">
          No report yet. Running it walks the bucket under the selected scope in bounded pages and
          reports what is stored, what is registered, and what disagrees.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs opacity-70" role="status">
            Scanned {report.objectsScanned} object{report.objectsScanned === 1 ? "" : "s"} and{" "}
            {report.rowsConsidered} CMS row{report.rowsConsidered === 1 ? "" : "s"} in{" "}
            {report.scope || "the bucket root"}.
            {report.complete
              ? " The pass covered the whole scope."
              : " The pass stopped at its page budget — run it again to continue from the same point."}
          </p>

          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {REPORT_ORDER.map((state) => (
              <li key={state} className="rounded-lg border px-2.5 py-2 cc-hairline">
                <p className="text-lg font-semibold leading-none tabular-nums">
                  {report.counts[state]}
                </p>
                <p className="mt-1 text-[11px] leading-tight opacity-70">
                  {INVENTORY_STATE_LABELS[state]}
                </p>
              </li>
            ))}
          </ul>

          {report.objectsScanned > 0 && report.counts.registered_missing > 0 ? (
            <CmsNotice kind="warning" title="CMS rows whose bytes are missing">
              These rows are live in D1 but the object is not in R2, so their public URLs do not
              resolve. Replacing the object at the same key restores them.
            </CmsNotice>
          ) : null}
          {report.objectsScanned > 0 && report.counts.cms_deleted_object_present > 0 ? (
            <CmsNotice kind="warning" title="Removed from CMS but still stored">
              These assets were removed from the CMS and their files are still in R2 — so their
              public URLs still work. Delete the objects themselves if that is not intended.
            </CmsNotice>
          ) : null}

          <KeyList
            title="Discovered objects with no CMS row"
            keys={unregistered}
            emptyLabel="Every stored object in this scope is registered."
          />

          {props.canWrite && unregistered.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-t pt-3 cc-hairline">
              <button
                type="button"
                className="cc-btn cc-btn-primary cc-btn-sm"
                disabled={props.pending}
                onClick={() => props.onRegister(unregistered.slice(0, MAX_REGISTER_KEYS))}
              >
                Register {Math.min(unregistered.length, MAX_REGISTER_KEYS)} object
                {Math.min(unregistered.length, MAX_REGISTER_KEYS) === 1 ? "" : "s"}
              </button>
              {/* The cap is the server's subrequest budget, not a UI choice, so
                  the copy states it instead of silently truncating. */}
              {unregistered.length > MAX_REGISTER_KEYS ? (
                <p className="text-xs opacity-65">
                  Batches are capped at {MAX_REGISTER_KEYS} per run so one request stays within the
                  runtime budget. {unregistered.length - MAX_REGISTER_KEYS} more in this scope — run
                  the report again after this batch to continue.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

function KeyList(props: { title: string; keys: string[]; emptyLabel: string }) {
  if (props.keys.length === 0) {
    return (
      <p className="text-xs opacity-65">
        <span className="cc-eyebrow">{props.title}</span>: {props.emptyLabel}
      </p>
    );
  }
  const shown = props.keys.slice(0, LIST_PREVIEW);
  return (
    <div className="min-w-0">
      <p className="cc-eyebrow">{props.title}</p>
      <ul className="mt-1 space-y-0.5">
        {shown.map((key) => (
          <li key={key} className="truncate font-mono text-[11px] opacity-70" title={key}>
            {key}
          </li>
        ))}
      </ul>
      {props.keys.length > shown.length ? (
        <p className="mt-1 text-[11px] opacity-55">…and {props.keys.length - shown.length} more</p>
      ) : null}
    </div>
  );
}
