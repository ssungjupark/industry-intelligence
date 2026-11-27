export const companyCountries = [
  { value: '', label: '전체 국가' },
  { value: 'KR', label: '한국' },
  { value: 'US', label: '미국' },
  { value: 'other', label: '기타 국가' },
] as const;

export function matchesCompanyCountry(country: string | null, filter: string) {
  const code = country?.toUpperCase();
  if (filter === 'KR' || filter === 'US') return code === filter;
  if (filter === 'other') return code !== 'KR' && code !== 'US';
  return true;
}
