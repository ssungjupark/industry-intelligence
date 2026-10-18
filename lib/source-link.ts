export function sourceLink(value: string | null | undefined, page?: number | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    // Reserved test domains cannot be offered as external source documents.
    if (["invalid", "test", "example", "localhost"].some((suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`))) return null;
    if (page && Number.isInteger(page) && page > 0) url.hash = `page=${page}`;
    return url.toString();
  } catch { return null; }
}
