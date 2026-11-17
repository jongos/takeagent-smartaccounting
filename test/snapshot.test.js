import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preview, compare, fields } from '../src/snapshot.js';
const context = { tenantId: 'tenant-demo', projectId: 'project-demo', currency: 'USD', today: '2026-11-17' };
function fixture() {
  const amounts = Object.fromEntries(fields.map(f => [f, '100.00']));
  return { profile: 'takeagent-synthetic-cost-v1', ...context, sourceProjectId: 'ep-demo', revision: 'r1', asOf: '2026-11-01',
    basis: 'cumulative', commitmentBasis: 'unpaid-not-in-actuals', reportScope: 'full-project-unfiltered', complete: true,
    rows: [{ account: '1000', kind: 'detail', ...amounts }], totals: amounts };
}
test('exact cents, minimization and nonmutation', () => {
  const r = fixture(); r.rows[0].workerName = 'MUST_NOT_LEAVE'; const original = structuredClone(r);
  const p = preview(r, context); assert.equal(p.snapshot.totals.actuals, '10000');
  assert.ok(!JSON.stringify(p).includes('MUST_NOT_LEAVE')); assert.deepEqual(r, original);
});
test('credits remain signed and reconcile', () => { const r = fixture(); r.rows[0].actuals = '-5.25'; r.totals.actuals = '-5.25'; assert.equal(preview(r, context).snapshot.totals.actuals, '-525'); });
for (const [name, change] of [
  ['tenant', r => r.tenantId = 'another'], ['project', r => r.projectId = 'another'], ['currency', r => r.currency = 'EUR'],
  ['partial', r => r.complete = false], ['duplicate', r => r.rows.push({...r.rows[0]})], ['subtotal', r => r.rows[0].kind = 'subtotal'],
  ['missing', r => delete r.rows[0].actuals], ['formula', r => r.rows[0].actuals = '=1+1'], ['precision', r => r.rows[0].actuals = '1.001'],
  ['total', r => r.totals.actuals = '2'], ['date', r => r.asOf = '2026-02-30'], ['overlap', r => r.commitmentBasis = 'all-pos'],
]) test(`rejects ${name}`, () => { const r = fixture(); change(r); assert.throws(() => preview(r, context)); });
test('stale report warning', () => { const r = fixture(); r.asOf = '2026-01-01'; assert.deepEqual(preview(r, context).warnings, ['STALE_REPORT']); });
test('idempotent preview and revision conflict', () => {
  const r = fixture(); const first = preview(r, context); assert.equal(compare(first, preview(r, context)).status, 'unchanged');
  r.rows[0].actuals = '101'; r.totals.actuals = '101'; assert.throws(() => compare(first, preview(r, context)), /REVISION_CONFLICT/);
  r.revision = 'r2'; assert.equal(compare(first, preview(r, context)).deltas.actuals, '100');
});
test('cross-project comparison fails', () => { const a = preview(fixture(), context); const r = fixture(); r.projectId = 'other'; const b = preview(r, {...context, projectId:'other'}); assert.throws(() => compare(a,b), /SCOPE/); });
test('rejects unsupported currency precision', () => { for (const currency of ['JPY', 'KWD', 'ZZZ']) { const r = fixture(); r.currency = currency; assert.throws(() => preview(r, {...context, currency}), /CURRENCY/); } });
test('rejects unspecified or filtered report scope',()=>{for(const reportScope of [undefined,'location-1-only']){const r=fixture();r.reportScope=reportScope;assert.throws(()=>preview(r,context),/REPORT_SCOPE/);}});
