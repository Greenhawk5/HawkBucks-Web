import { useState } from "react";

import {
  ARTICLE_BLOCK_TYPES,
  validateArticleDocument,
  type ArticleBlock,
} from "@/lib/cms/articles";
import { ArticleBlockView } from "@/components/cms/ArticleBody";
import { CmsField } from "./CmsPrimitives";
import { CmsSelect } from "./CmsSelect";
import { CmsMediaPicker } from "./CmsMediaPicker";

/**
 * Structured article block composer — preserves the safe block model
 * (heading/paragraph/list/quote/code/image/entity/divider). No raw HTML
 * anywhere; image blocks store asset ids and resolve through validated
 * media lookups; entity blocks store typed content references.
 */
export function CmsArticleBlocks(props: {
  blocks: ArticleBlock[];
  onChange: (blocks: ArticleBlock[]) => void;
  locale: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [draftType, setDraftType] = useState<ArticleBlock["type"]>("paragraph");
  const [assetId, setAssetId] = useState("");
  const [entityType, setEntityType] = useState("hero");
  const [entityContentId, setEntityContentId] = useState("");
  const [blockError, setBlockError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerFor, setPickerFor] = useState<number | null>(null);

  const docPreview = (() => {
    try {
      return validateArticleDocument({ version: 1, blocks: props.blocks });
    } catch {
      return null;
    }
  })();

  function patchBlock(index: number, patch: Partial<ArticleBlock>) {
    props.onChange(props.blocks.map((block, i) => (i === index ? { ...block, ...patch } : block)));
  }

  function removeBlock(index: number) {
    props.onChange(props.blocks.filter((_, i) => i !== index));
  }

  function moveBlock(index: number, delta: -1 | 1) {
    const next = [...props.blocks];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    props.onChange(next);
  }

  function addDraftBlock() {
    if (props.disabled) return;
    if (draftType === "divider") {
      props.onChange([...props.blocks, { type: "divider" }]);
      setDraft("");
      return;
    }
    if (draftType === "image") {
      const id = assetId.trim();
      if (id === "") {
        setBlockError("Media asset id is required — pick from the library.");
        return;
      }
      props.onChange([...props.blocks, { type: "image", assetId: id }]);
      setAssetId("");
      setBlockError(null);
      return;
    }
    if (draftType === "entity") {
      if (entityContentId.trim() === "") {
        setBlockError("Entity content id is required.");
        return;
      }
      props.onChange([
        ...props.blocks,
        { type: "entity", entityType, contentId: entityContentId.trim() },
      ]);
      setEntityContentId("");
      setBlockError(null);
      return;
    }
    const text = draft.trim();
    if (text === "") {
      setBlockError("Block text is required.");
      return;
    }
    if (draftType === "heading") {
      props.onChange([...props.blocks, { type: "heading", level: 2, text }]);
    } else if (draftType === "list") {
      const items = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
      if (items.length === 0) {
        setBlockError("List needs at least one item.");
        return;
      }
      props.onChange([...props.blocks, { type: "list", items }]);
    } else if (draftType === "quote" || draftType === "code" || draftType === "paragraph") {
      props.onChange([...props.blocks, { type: draftType, text }]);
    } else {
      setBlockError("Media and entity blocks attach via validated fields above.");
      return;
    }
    setDraft("");
    setBlockError(null);
  }

  return (
    <div className="space-y-4">
      <p className="cc-panel px-3 py-2 text-[13px] opacity-80" role="status">
        {docPreview ? `${docPreview.blocks.length} valid blocks.` : "Fix invalid blocks below."}{" "}
        Images and entity cards resolve through validated media/entity lookups — never raw HTML.
      </p>

      {props.blocks.length === 0 ? (
        <div className="rounded-xl border border-dashed px-3 py-4 text-sm opacity-70 cc-hairline">
          No blocks yet. Add one below.
        </div>
      ) : null}
      <ol className="space-y-2">
        {props.blocks.map((block, index) => (
          <li key={index} className="cc-panel px-3 py-2.5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-wider opacity-70">
              {index + 1}. {block.type}
            </p>
            {block.type === "heading" ||
            block.type === "paragraph" ||
            block.type === "quote" ||
            block.type === "code" ? (
              <input
                className="cc-input mt-1.5"
                value={block.text ?? ""}
                disabled={props.disabled}
                onChange={(event) => patchBlock(index, { text: event.target.value })}
              />
            ) : null}
            {block.type === "list" ? (
              <textarea
                className="cc-input mt-1.5"
                rows={3}
                value={(block.items ?? []).join("\n")}
                disabled={props.disabled}
                onChange={(event) => patchBlock(index, { items: event.target.value.split("\n") })}
              />
            ) : null}
            {block.type === "image" ? (
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs opacity-70">asset {block.assetId}</span>
                <button
                  type="button"
                  className="cc-btn cc-btn-ghost cc-btn-sm"
                  onClick={() => {
                    setPickerFor(index);
                    setPickerOpen(true);
                  }}
                  disabled={props.disabled}
                >
                  Replace…
                </button>
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="cc-btn cc-btn-ghost cc-btn-sm"
                disabled={props.disabled}
                onClick={() => moveBlock(index, -1)}
              >
                Move up
              </button>
              <button
                type="button"
                className="cc-btn cc-btn-ghost cc-btn-sm"
                disabled={props.disabled}
                onClick={() => moveBlock(index, 1)}
              >
                Move down
              </button>
              <button
                type="button"
                className="cc-btn cc-btn-ghost cc-btn-sm"
                disabled={props.disabled}
                onClick={() => removeBlock(index)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="cc-panel px-3 py-3">
        <CmsField label="Block type" description="Structured blocks only — no HTML.">
          <CmsSelect
            id="article-block-type"
            value={draftType}
            disabled={props.disabled}
            onChange={(v) => setDraftType(v as ArticleBlock["type"])}
            width="full"
            options={ARTICLE_BLOCK_TYPES.map((type) => ({ value: type, label: type }))}
          />
        </CmsField>
        {draftType === "image" ? (
          <div className="mt-2">
            <CmsField
              label="Media asset id"
              description="Existing R2 asset. Use the picker — ids are never invented."
            >
              <div className="flex flex-wrap gap-2">
                <input
                  className="cc-input min-w-40 flex-1 font-mono"
                  value={assetId}
                  disabled={props.disabled}
                  onChange={(event) => setAssetId(event.target.value)}
                  placeholder="media_…"
                />
                <button
                  type="button"
                  className="cc-btn cc-btn-outline cc-btn-sm"
                  disabled={props.disabled}
                  onClick={() => {
                    setPickerFor(null);
                    setPickerOpen(true);
                  }}
                >
                  Browse…
                </button>
              </div>
            </CmsField>
          </div>
        ) : null}
        {draftType === "entity" ? (
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <CmsField label="Entity type">
              <CmsSelect
                id="article-block-entity-type"
                value={entityType}
                disabled={props.disabled}
                onChange={setEntityType}
                width="full"
                options={["hero", "loadout", "weapon", "trap", "perk", "schematic"].map((t) => ({
                  value: t,
                  label: t,
                }))}
              />
            </CmsField>
            <CmsField label="Entity content id">
              <input
                className="cc-input font-mono"
                value={entityContentId}
                disabled={props.disabled}
                onChange={(event) => setEntityContentId(event.target.value)}
                placeholder="cms_…"
              />
            </CmsField>
          </div>
        ) : null}
        {draftType === "divider" ? null : draftType === "image" || draftType === "entity" ? null : (
          <div className="mt-2">
            <CmsField label="Text" description="Lists: one item per line.">
              <textarea
                className="cc-input"
                rows={3}
                value={draft}
                disabled={props.disabled}
                onChange={(event) => setDraft(event.target.value)}
              />
            </CmsField>
          </div>
        )}
        {blockError ? (
          <p className="mt-2 text-sm text-[var(--cc-danger)]" role="alert">
            {blockError}
          </p>
        ) : null}
        <button
          type="button"
          className="cc-btn cc-btn-outline cc-btn-sm mt-3"
          disabled={props.disabled}
          onClick={addDraftBlock}
        >
          Add block
        </button>
      </div>

      <div className="cc-panel px-3 py-3">
        <p className="cc-eyebrow">Live preview</p>
        <div className="mt-2">
          {docPreview ? (
            docPreview.blocks.map((block, index) => (
              <ArticleBlockView key={index} block={block} locale={props.locale} />
            ))
          ) : (
            <p className="text-sm opacity-70">Fix invalid blocks to preview.</p>
          )}
        </div>
      </div>

      <CmsMediaPicker
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setPickerFor(null);
        }}
        title="Choose replacement image"
        onPick={(assetIdPicked) => {
          if (pickerFor === null) {
            setAssetId(assetIdPicked);
          } else {
            patchBlock(pickerFor, { assetId: assetIdPicked } as Partial<ArticleBlock>);
          }
        }}
      />
    </div>
  );
}
