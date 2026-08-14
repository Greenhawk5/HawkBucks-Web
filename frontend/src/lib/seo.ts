export function jsonLdScript(schema: unknown) {
  return {
    attrs: { type: "application/ld+json" },
    children: JSON.stringify(schema),
  };
}
