import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { load } from 'cheerio';

const months = 'January February March April May June July August September October November December'.split(' ');
const monthPattern = months.join('|');
const eiaUrl = 'https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx?f=W&n=PET&s=WCESTUS1';
const pad = (number) => String(number).padStart(2, '0');
const clean = (text) => text.replace(/\s+/g, ' ').trim();
const monthNumber = (name) => months.findIndex((month) => month.toLowerCase().startsWith(name.toLowerCase())) + 1;

function releaseDate($) {
  const value = $('meta[property="article:published_time"]').attr('content') || $('time[datetime]').first().attr('datetime') || '';
  return /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value) ? value.slice(0, 10) : null;
}

export function parseSemiconductorSales(html) {
  const $ = load(html);
  const publishedAt = releaseDate($);
  const sales = new RegExp('\\$([\\d,.]+)\\s+billion\\s+(?:during|in|for)\\s+(?:the month of\\s+)?(' + monthPattern + ')\\s+(\\d{4})', 'i');
  const paragraph = $('p').map((_, element) => clean($(element).text())).get().find((text) => /global semiconductor sales|worldwide semiconductor sales|global sales/i.test(text) && sales.test(text));
  if (!publishedAt || !paragraph) return null;
  const [matched, amount, month, year] = paragraph.match(sales);
  const period = year + '-' + pad(monthNumber(month));
  const priorDate = new Date(Date.UTC(Number(year), monthNumber(month) - 2, 1));
  const priorMonth = months[priorDate.getUTCMonth()];
  const comparison = new RegExp('(\\d+(?:\\.\\d+)?)%\\s+(?:more than|higher than|less than|lower than|(?:increase|decrease)\\s+from|(?:up|down)\\s+from)\\s+(?:(?:sales|the total|the total of [\\d$.,]+ billion)\\s+in\\s+)?' + priorMonth + '\\s+' + priorDate.getUTCFullYear(), 'i');
  const trailing = paragraph.slice(paragraph.indexOf(matched) + matched.length);
  const delta = trailing.match(comparison);
  const change = delta ? Number(delta[1]) * (/less|lower|decrease|down/i.test(delta[0]) ? -1 : 1) : null;
  const value = Number(amount.replaceAll(',', ''));
  return value > 0 && period <= publishedAt.slice(0, 7) ? { period, publishedAt, value, change } : null;
}

export function parseEuropeanRegistrations(html) {
  const $ = load(html);
  const publishedAt = releaseDate($);
  const title = clean($('h1').first().text());
  const share = title.match(/battery[\s-]electric\s+(\d+(?:\.\d+)?)%\s+market share/i);
  const month = title.match(new RegExp('\\b(' + monthPattern + ')\\s+(\\d{4})\\b', 'i'));
  const quarter = title.match(/\b(Q1|H1)\s+(\d{4})\b/i);
  const annual = title.match(/\bin\s+(\d{4})\s*[;:]/i);
  if (!publishedAt || !share || (!month && !quarter && !annual)) return null;
  if (month && monthNumber(month[1]) > 1 && !/year[ -]to[ -]date|\bytd\b/i.test(title)) return null;
  const period = month ? month[2] + '-' + pad(monthNumber(month[1]))
    : quarter ? quarter[2] + '-' + (quarter[1].toUpperCase() === 'Q1' ? '03' : '06')
      : annual[1] + '-12';
  if (period > publishedAt.slice(0, 7)) return null;
  const value = Number(share[1]);
  if (value < 0 || value > 100) return null;
  const comparison = $('p').map((_, node) => clean($(node).text())).get()
    .filter((p) => /battery[\s-]electric/i.test(p))
    .flatMap((p) => [...p.matchAll(/battery[\s-]electric[^.?!]{0,110}?(\d+(?:\.\d+)?)%\s+of\s+the\s+EU market,\s*(?:up|down) from\s+(\d+(?:\.\d+)?)%\s+a year earlier/gi)])
    .find((m) => Number(m[1]) === value && Number(m[2]) <= 100);
  const change = comparison ? Number((value - Number(comparison[2])).toFixed(1)) : null;
  return { period, publishedAt, value, change };
}

export function parseCrudeStocks(html) {
  const $ = load(html);
  const body = clean($('body').text());
  if (!/excluding SPR of Crude Oil \(Thousand Barrels\)/i.test(body)) return null;
  const release = body.match(/(?<!Next )Release Date:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (!release) return null;
  const publishedAt = release[3] + '-' + pad(release[1]) + '-' + pad(release[2]);
  const observations = new Map();
  $('tr').each((_, row) => {
    const cells = $(row).children('td').map((_, cell) => clean($(cell).text())).get();
    const month = cells[0]?.match(/^(\d{4})-([A-Za-z]{3})$/);
    if (!month) return;
    for (let index = 1; index + 1 < cells.length; index += 2) {
      const day = cells[index].match(/^(\d{2})\/(\d{2})$/);
      const raw = cells[index + 1];
      if (!day || Number(day[1]) !== monthNumber(month[2]) || !/^[\d,]+$/.test(raw)) continue;
      const date = month[1] + '-' + day[1] + '-' + day[2];
      const value = Number(raw.replaceAll(',', ''));
      if (date <= publishedAt && value > 0) observations.set(date, value);
    }
  });
  const latest = [...observations].sort(([a], [b]) => b.localeCompare(a)).slice(0, 2);
  if (!latest.length) return null;
  const [[period, value], previous] = latest;
  const consecutive = previous && Date.parse(period) - Date.parse(previous[0]) === 7 * 86_400_000;
  return { period, publishedAt, value, change: consecutive ? value - previous[1] : null };
}

async function officialResponse(url, hostname) {
  let current = new URL(url);
  for (let hop = 0; hop < 4; hop++) {
    if (current.origin !== 'https://' + hostname || current.username || current.password) throw Error('Unexpected official statistics host');
    const response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location) throw Error('Missing redirect destination');
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw Error('HTTP ' + response.status + ' from ' + hostname);
    return response;
  }
  throw Error('Too many redirects');
}

async function latestRelease(links, hostname, accepts, parse) {
  const candidates = [...new Set(links)].flatMap((href) => {
    try {
      const url = new URL(href, 'https://' + hostname);
      url.search = '';
      url.hash = '';
      return url.origin === 'https://' + hostname && accepts(url.pathname) ? [url.href] : [];
    } catch { return []; }
  }).slice(0, 6);
  const outcomes = await Promise.allSettled(candidates.map(async (url) => {
    const response = await officialResponse(url, hostname);
    const result = parse(await response.text());
    return result ? { ...result, sourceUrl: response.url } : null;
  }));
  const latest = outcomes.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : [])
    .sort((a, b) => b.period.localeCompare(a.period) || b.publishedAt.localeCompare(a.publishedAt))[0];
  if (!latest) throw Error('No readable, dated release from ' + hostname);
  return latest;
}

async function getSemiconductorSales() {
  const host = 'www.semiconductors.org';
  const response = await officialResponse('https://' + host + '/category/press-releases/', host);
  const $ = load(await response.text());
  const links = $('a[href]').map((_, element) => $(element).attr('href')).get();
  return latestRelease(links, host, (path) => /global-semiconductor-sales|worldwide-semiconductor-sales/i.test(path), parseSemiconductorSales);
}

async function getEuropeanRegistrations() {
  const host = 'www.acea.auto';
  const url = 'https://' + host + '/wp-json/wp/v2/search?search=new%20car%20registrations&per_page=10';
  const response = await officialResponse(url, host);
  const listings = await response.json();
  return latestRelease(listings.flatMap((row) => typeof row.url === 'string' ? [row.url] : []), host,
    (path) => path.startsWith('/pc-registrations/new-car-registrations-'), parseEuropeanRegistrations);
}

async function getCrudeStocks() {
  const response = await officialResponse(eiaUrl, 'www.eia.gov');
  const row = parseCrudeStocks(await response.text());
  if (!row) throw Error('No dated commercial crude oil inventory observation');
  return { ...row, sourceUrl: eiaUrl };
}

const sources = {
  'semiconductor-sales': getSemiconductorSales,
  'eu-bev-share': getEuropeanRegistrations,
  'us-crude-stocks': getCrudeStocks,
};

export function applyObservation(previous, observation) {
  if (!observation || observation.period < previous.period || observation.publishedAt < previous.publishedAt) return previous;
  if (observation.period === previous.period && observation.change === null && previous.change !== null) {
    return observation.value === previous.value
      ? { ...previous, ...observation, change: previous.change }
      : previous;
  }
  return { ...previous, ...observation };
}

export async function refreshIndicators(file, { dryRun = false } = {}) {
  const current = JSON.parse(await readFile(file, 'utf8'));
  const rows = await Promise.all(current.map(async (previous) => {
    const source = sources[previous.id];
    if (!source) return previous;
    try {
      const next = applyObservation(previous, await source());
      console.log(previous.id + ': ' + next.period + ' (' + next.publishedAt + ')');
      return next;
    } catch (error) {
      console.warn(previous.id + ': ' + error.message + '; kept ' + previous.period);
      return previous;
    }
  }));
  if (!dryRun && JSON.stringify(rows) !== JSON.stringify(current)) await writeFile(file, JSON.stringify(rows, null, 2) + '\n');
  return rows;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await refreshIndicators(new URL('../config/home-indicators.json', import.meta.url), { dryRun: process.argv.includes('--dry-run') });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
