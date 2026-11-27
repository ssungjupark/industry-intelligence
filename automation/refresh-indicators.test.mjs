import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyObservation, parseCrudeStocks, parseEuropeanRegistrations, parseSemiconductorSales } from './refresh-indicators.mjs';

const dated = (date, body) => '<meta property="article:published_time" content="' + date + 'T09:00:00Z"><body>' + body + '</body>';

test('SIA extraction selects the monthly value and signs the change against the previous month', () => {
  const html = dated('2027-02-03', '<p>Global semiconductor sales were $510.7 billion during the fourth quarter. Global sales were $170.6 billion during the month of January 2027, 110% above January 2026 and 7.9% lower than sales in December 2026.</p>');
  assert.deepEqual(parseSemiconductorSales(html), { period: '2027-01', publishedAt: '2027-02-03', value: 170.6, change: -7.9 });
  assert.equal(parseSemiconductorSales(html.replace('the month of January 2027', 'the next quarter')), null);
});

test('ACEA treats the headline as a year-to-date share and computes a percentage point comparison', () => {
  const html = dated('2026-11-24', '<h1>New car registrations: +5.4% in October 2026 year-to-date; battery-electric 23.4% market share</h1><p>By October 2026, battery-electric cars accounted for 23.4% of the EU market, up from 16.4% a year earlier.</p>');
  assert.deepEqual(parseEuropeanRegistrations(html), { period: '2026-10', publishedAt: '2026-11-24', value: 23.4, change: 7 });
  assert.equal(parseEuropeanRegistrations(html.replace(' year-to-date', '')), null);
});

test('EIA selects consecutive observed weeks and ignores next release dates and missing values', () => {
  const html = '<body>Weekly U.S. Ending Stocks excluding SPR of Crude Oil (Thousand Barrels)<table><tr><td>2026-Oct</td><td>10/30</td><td>409,760</td></tr><tr><td>2026-Nov</td><td>11/06</td><td>414,417</td><td>11/13</td><td></td></tr></table>Release Date: 11/12/2026 Next Release Date: 11/18/2026</body>';
  assert.deepEqual(parseCrudeStocks(html), { period: '2026-11-06', publishedAt: '2026-11-12', value: 414417, change: 4657 });
  assert.equal(parseCrudeStocks(html.replace('10/30', '10/23')).change, null);
  assert.equal(parseCrudeStocks(html.replace('excluding SPR', 'including SPR')), null);
});

test('an old release or a failed comparison cannot erase a verified observation', () => {
  const current = { period: '2026-10', publishedAt: '2026-11-24', value: 23.4, change: 7 };
  assert.equal(applyObservation(current, null), current);
  assert.equal(applyObservation(current, { ...current, period: '2026-09' }), current);
  assert.deepEqual(applyObservation(current, { ...current, change: null }), current);
  assert.equal(applyObservation(current, { ...current, period: '2026-11', publishedAt: '2026-12-22', change: null }).change, null);
});
