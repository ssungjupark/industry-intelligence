import { companyCountries } from './company-country';
import { documentTypeLabels, publicationDay } from './document-browse';

export type SearchParams = Record<string, string | string[] | undefined>;

export const archivePeriods = [
  { value: '', label: '전체 기간' },
  { value: '7', label: '최근 7일' },
  { value: '30', label: '최근 30일' },
  { value: '90', label: '최근 90일' },
];

export function searchParam(params: SearchParams, name: string) {
  const value = params[name];
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

function dateParam(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
}

export function archiveFilters(params: SearchParams, industrySlugs: string[]) {
  const country = searchParam(params, 'country');
  const industry = searchParam(params, 'industry');
  const type = searchParam(params, 'type');
  const period = searchParam(params, 'period');
  const from = dateParam(searchParam(params, 'from'));
  const to = dateParam(searchParam(params, 'to'));
  const requestedPage = searchParam(params, 'page');

  return {
    q: searchParam(params, 'q').trim().slice(0, 180),
    country: companyCountries.find(option => option.value === country)?.value ?? '',
    industry: industrySlugs.includes(industry) ? industry : '',
    type: Object.hasOwn(documentTypeLabels, type) ? type : '',
    period: !from && !to && archivePeriods.some(option => option.value === period) ? period : '',
    from,
    to,
    readable: searchParam(params, 'readable') === '1',
    page: /^\d{1,8}$/.test(requestedPage) ? Math.max(1, Number(requestedPage)) : 1,
  };
}

export function archiveDateRange(filters: Pick<ReturnType<typeof archiveFilters>, 'from' | 'to' | 'period'>, now = new Date()) {
  if (!filters.period) return { from: filters.from, to: filters.to };
  const today = publicationDay(now.toISOString())!;
  const start = new Date(`${today}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - Number(filters.period) + 1);
  return { from: start.toISOString().slice(0, 10), to: today };
}

export function archiveHref(filters: Partial<ReturnType<typeof archiveFilters>> = {}) {
  const query = new URLSearchParams({ archive: '1' });
  for (const [key, value] of Object.entries(filters)) {
    if (!value || (key === 'page' && value === 1)) continue;
    query.set(key, value === true ? '1' : String(value));
  }
  return `/search?${query}`;
}
