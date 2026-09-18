/**
 * TanStack Router's <HeadContent /> renders head `scripts` entries by
 * spreading their properties directly onto the <script> element, so the
 * type attribute must be a top-level prop (NOT nested under `attrs`).
 * Nesting it previously produced `<script attrs="[object Object]">` with
 * raw JSON inside — invalid markup that also breaks parsers that execute
 * inline scripts ("Unexpected token ':'").
 */
export function jsonLdScript(schema: unknown) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(schema),
  };
}
