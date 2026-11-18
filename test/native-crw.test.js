import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fields, compare } from '../src/snapshot.js';
import { previewCrwExport, epCrwExportProfileId } from '../src/native-crw.js';
import { costFindings } from '../src/companion.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(here, 'fixtures', 'ep-crw-synthetic.csv');
const context = { tenantId: 'tenant-synth', projectId: 'project-synth', currency: 'USD', today: '2026-11-17' };
const metadata = () => ({
  ...context,
  sourceProjectId: 'ep-synth-a1',
  revision: 'crw-r1',
  asOf: '2026-11-01',
  basis: 'cumulative',
  commitmentBasis: 'unpaid-not-in-actuals',
  reportScope: 'full-project-unfiltered',
  complete: true,
});

test('native CRW profile maps vendor columns into a fingerprinted snapshot', () => {
  const text = readFileSync(fixturePath, 'utf8');
  const totals = {
    originalBudget: '29000.00',
    revisedBudget: '29050.00',
    actuals: '3300.00',
    openCommitments: '150.00',
    estimateToComplete: '25550.00',
    estimatedFinalCost: '28850.00',
  };
  const preview = previewCrwExport(text, { metadata: metadata(), totals }, context);
  assert.equal(preview.snapshot.profile, epCrwExportProfileId);
  assert.equal(preview.profileCertification, 'provisional');
  assert.equal(preview.snapshot.rows.length, 3);
  assert.equal(preview.snapshot.rows[0].lineId, 'ep.crw.v1:1100');
  assert.equal(preview.snapshot.rows[0].amounts.actuals, '250000');
  assert.match(preview.fingerprint, /^[a-f0-9]{64}$/);
  assert.equal(preview.provenance.certification, 'provisional');
  assert.equal(preview.provenance.vendorLayout, 'ep-crw-cost-worksheet');
});

test('stable line identifiers sort semantics independent of row order', () => {
  const text = readFileSync(fixturePath, 'utf8');
  const totals = {
    originalBudget: '29000.00',
    revisedBudget: '29050.00',
    actuals: '3300.00',
    openCommitments: '150.00',
    estimateToComplete: '25550.00',
    estimatedFinalCost: '28850.00',
  };
  const first = previewCrwExport(text, { metadata: metadata(), totals }, context);
  const reversed = text
    .split('\n')
    .slice(0, 2)
    .concat(text.split('\n').slice(2).reverse())
    .join('\n');
  const second = previewCrwExport(reversed, { metadata: metadata(), totals }, context);
  assert.notEqual(first.fingerprint, second.fingerprint);
  assert.equal(first.semanticFingerprint, second.semanticFingerprint);
  assert.deepEqual(compare(first, second), { status: 'unchanged', provenanceOnly: true, deltas: {} });
});

test('rejects subtotal rows and missing required vendor columns', () => {
  const header = 'Row Type,Account,Actuals,POs,ETC,EFC,Budget';
  const row = 'Account,1100,1,1,1,2,3';
  assert.throws(() => previewCrwExport(`${header}\n${row}`, { metadata: metadata(), totals: Object.fromEntries(fields.map(f => [f, '3.00'])) }, context), /MISSING_CRW_COLUMN/);
  const completeHeader =
    'Row Type,Account,Actuals,POs,Total Cost,ETC,EFC,Budget,Approved Overages,Adjusted Budget';
  const completeRow = 'Account,1100,1,1,2,1,2,3,0,3';
  assert.throws(
    () => previewCrwExport(`${completeHeader}\n${completeRow}`, { metadata: metadata(), totals: Object.fromEntries(fields.map(f => [f, '3.00'])) }, context),
    /TOTAL_MISMATCH/,
  );
  const subtotalHeader =
    'Row Type,Account,Description,Actuals,POs,Total Cost,ETC,EFC,Budget,Approved Overages,Adjusted Budget';
  const subtotal = `${subtotalHeader}\nSubtotal,1100,x,1,1,2,1,2,3,0,3`;
  assert.throws(() => previewCrwExport(subtotal, { metadata: metadata(), totals: Object.fromEntries(fields.map(f => [f, '3.00'])) }, context), /SUBTOTAL/);
});

test('cost findings stay descriptive and refuse funding conclusions', () => {
  const text = [
    'Row Type,Account,Actuals,POs,Total Cost,ETC,EFC,Budget,Approved Overages,Adjusted Budget',
    'Account,1100,2500.00,100.00,2600.00,600.00,3100.00,3000.00,0.00,3000.00',
  ].join('\n');
  const totals = {
    originalBudget: '3000.00',
    revisedBudget: '3000.00',
    actuals: '2500.00',
    openCommitments: '100.00',
    estimateToComplete: '600.00',
    estimatedFinalCost: '3100.00',
  };
  const preview = previewCrwExport(text, { metadata: metadata(), totals }, context);
  const findings = costFindings(preview);
  assert.equal(findings.fundingGap, null);
  assert.equal(findings.fundingGapStatus, 'refused');
  assert.equal(findings.cashTimingGap, null);
  assert.ok(findings.findings.some(f => f.code === 'PROVISIONAL_VENDOR_PROFILE'));
  assert.ok(findings.findings.some(f => f.code === 'EFC_EXCEEDS_REVISED_BUDGET' && f.lineId === 'ep.crw.v1:1100'));
  assert.ok(findings.findings.every(f => !String(f.question ?? '').toLowerCase().includes('funding gap')));
});