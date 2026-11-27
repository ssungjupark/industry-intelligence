import aliases from '../config/search-aliases.json';

function normalize(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const groupByAlias = new Map<string, number>();
const groupMatchers = aliases.map(({ terms, indexedTerms = [] }, index) => {
  for (const term of terms) groupByAlias.set(normalize(term), index);
  return [...terms, ...indexedTerms].map((value) => {
    const alias = normalize(value);
    // A numeric product generation can follow a term, such as HBM4E.
    if (/[가-힣]/.test(alias)) return (text: string) => text.includes(alias);
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(alias)}(?!\\p{L})`, 'u');
    return (text: string) => pattern.test(text);
  });
});

const phrases = [...groupByAlias.keys()].sort((a, b) => b.length - a.length).map(escapeRegex);
const queryPattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${phrases.join('|')})(?![\\p{L}\\p{N}])|[\\p{L}\\p{N}][\\p{L}\\p{N}._-]*`, 'gu');

export function productSearch(query: string) {
  const terms = [...normalize(query).matchAll(queryPattern)].map(([term]) => {
    const group = groupByAlias.get(term);
    if (group === undefined) return (text: string) => text.includes(term);
    return (text: string) => groupMatchers[group].some((match) => match(text));
  });
  return (...fields: unknown[]) => {
    if (!terms.length) return true;
    const text = normalize(fields.filter((field): field is string => typeof field === 'string').join(' '));
    return terms.every((match) => match(text));
  };
}
