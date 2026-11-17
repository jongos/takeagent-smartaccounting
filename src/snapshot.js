import { createHash } from 'node:crypto';

export const fields = Object.freeze(['originalBudget', 'revisedBudget', 'actuals', 'openCommitments', 'estimateToComplete', 'estimatedFinalCost']);
function requireValue(condition, code) { if (!condition) throw new Error(code); }
function identifier(value) { return typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,100}$/.test(value); }
function date(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value; }
const minorAmount = v => typeof v === 'string' && /^-?\d+$/.test(v);
const hexFingerprint = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
function canonicalStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalStringify).join(',')}]`;
  return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonicalStringify(value[k])}`).join(',')}}`;
}
function cents(value) {
  requireValue(typeof value === 'string', 'INVALID_AMOUNT');
  if (/^\(.+\)$/.test(value)) throw new Error('INVALID_AMOUNT_PARENTHESES');
  if (/[$€£¥]|(?:^|[\s,])[A-Z]{3}\s*\d/.test(value)) throw new Error('INVALID_AMOUNT_CURRENCY');
  if (/^-?\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(value)) throw new Error('INVALID_AMOUNT_GROUPING');
  if (/^-?\d+,\d{1,2}$/.test(value)) throw new Error('INVALID_AMOUNT_DECIMAL_COMMA');
  requireValue(/^-?\d{1,12}(\.\d{1,2})?$/.test(value), 'INVALID_AMOUNT');
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^-/, '').split('.');
  return (negative ? -1n : 1n) * (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')));
}
function requireComparedSnapshot(snapshot) {
  requireValue(snapshot && typeof snapshot === 'object', 'INVALID_SNAPSHOT');
  for (const k of ['tenantId','projectId','sourceProjectId','currency','profile','basis','commitmentBasis','reportScope','revision','asOf']) requireValue(typeof snapshot[k] === 'string', 'INVALID_SNAPSHOT');
  requireValue(Array.isArray(snapshot.rows) && snapshot.totals && typeof snapshot.totals === 'object', 'INVALID_SNAPSHOT');
  for (const f of fields) requireValue(minorAmount(snapshot.totals[f]), 'INVALID_SNAPSHOT');
  for (const row of snapshot.rows) {
    requireValue(row && typeof row === 'object' && identifier(row.account) && row.amounts && typeof row.amounts === 'object', 'INVALID_SNAPSHOT');
    for (const f of fields) requireValue(minorAmount(row.amounts[f]), 'INVALID_SNAPSHOT');
  }
}
export function fingerprintSnapshot(snapshot) {
  return createHash('sha256').update(canonicalStringify(snapshot)).digest('hex');
}
// Keep scope/report metadata and per-account values, excluding physical row order.
function semanticFingerprint(snapshot) {
  const rows=snapshot.rows.map(({account,amounts})=>({account,amounts:Object.fromEntries(fields.map(field=>[field,amounts[field]]))})).sort((a,b)=>a.account<b.account?-1:a.account>b.account?1:0);
  return createHash('sha256').update(JSON.stringify({...snapshot,rows})).digest('hex');
}

/** Synthetic normalized report contract; NOT a verified EP export format or authorization boundary. */
export function preview(report, context) {
  requireValue(report?.profile === 'takeagent-synthetic-cost-v1', 'UNSUPPORTED_PROFILE');
  requireValue(context && identifier(context.tenantId) && identifier(context.projectId), 'INVALID_CONTEXT');
  requireValue(report.tenantId === context.tenantId && report.projectId === context.projectId, 'PROJECT_MISMATCH');
  requireValue(identifier(report.sourceProjectId) && identifier(report.revision), 'INVALID_PROVENANCE');
  requireValue(date(report.asOf) && date(context.today) && report.asOf <= context.today, 'INVALID_DATE');
  requireValue(['USD', 'EUR', 'GBP', 'CAD', 'AUD'].includes(report.currency) && report.currency === context.currency, 'CURRENCY_MISMATCH');
  requireValue(report.basis === 'cumulative' && report.commitmentBasis === 'unpaid-not-in-actuals', 'UNSUPPORTED_BASIS');
  requireValue(report.reportScope === 'full-project-unfiltered', 'UNSUPPORTED_REPORT_SCOPE');
  requireValue(report.complete === true, 'PARTIAL_REPORT');
  requireValue(Array.isArray(report.rows) && report.rows.length > 0 && report.rows.length <= 10000, 'INVALID_ROWS');
  const totals = Object.fromEntries(fields.map(f => [f, 0n]));
  const accounts = new Set();
  const rows = report.rows.map((row, i) => {
    requireValue(identifier(row.account) && !accounts.has(row.account), 'DUPLICATE_OR_INVALID_ACCOUNT');
    accounts.add(row.account);
    requireValue(row.kind === 'detail', 'SUBTOTAL_NOT_ALLOWED');
    const amounts = Object.fromEntries(fields.map(f => { const n = cents(row[f]); totals[f] += n; return [f, n.toString()]; }));
    requireValue(row.sourceRow === undefined || (Number.isInteger(row.sourceRow) && row.sourceRow > 0 && row.sourceRow <= 10002), 'INVALID_SOURCE_ROW');
    return { account: row.account, sourceRow: row.sourceRow ?? i + 1, amounts };
  });
  for (const f of fields) requireValue(totals[f] === cents(report.totals?.[f]), 'TOTAL_MISMATCH');
  const snapshot = { source: 'ep-smartaccounting', profile: report.profile, tenantId: report.tenantId, projectId: report.projectId,
    sourceProjectId: report.sourceProjectId, revision: report.revision, asOf: report.asOf, currency: report.currency,
    basis: report.basis, commitmentBasis: report.commitmentBasis, reportScope: report.reportScope, rows,
    totals: Object.fromEntries(fields.map(f => [f, totals[f].toString()])) };
  const fingerprint = fingerprintSnapshot(snapshot);
  const ageDays = Math.floor((Date.parse(context.today) - Date.parse(report.asOf)) / 86400000);
  return { snapshot, fingerprint, semanticFingerprint:semanticFingerprint(snapshot), warnings: ageDays > 30 ? ['STALE_REPORT'] : [], mode: 'preview-only', amountUnit: 'minor-units-2-decimals' };
}

/** Compare snapshots without mutating either or writing any finance-plan entries. */
export function compare(previous, next) {
  requireValue(previous?.snapshot && next?.snapshot, 'INVALID_SNAPSHOT');
  const a = previous.snapshot, b = next.snapshot;
  requireComparedSnapshot(a);
  requireComparedSnapshot(b);
  for (const key of ['tenantId','projectId','sourceProjectId','currency','profile','basis','commitmentBasis','reportScope']) requireValue(a[key] === b[key], 'SNAPSHOT_SCOPE_MISMATCH');
  if (hexFingerprint(previous.fingerprint) && hexFingerprint(next.fingerprint) && previous.fingerprint === next.fingerprint) return { status: 'unchanged', deltas: {} };
  if (semanticFingerprint(a) === semanticFingerprint(b)) return { status: 'unchanged', provenanceOnly: true, deltas: {} };
  requireValue(a.revision !== b.revision, 'REVISION_CONFLICT');
  requireValue(b.asOf >= a.asOf, 'OLDER_REPORT');
  const oldRows = new Map(a.rows.map(r => [r.account, r]));
  const newRows = new Map(b.rows.map(r => [r.account, r]));
  const accounts = [...new Set([...oldRows.keys(), ...newRows.keys()])].sort();
  return { status: 'revision-preview', deltas: Object.fromEntries(fields.map(f => [f, (BigInt(b.totals[f]) - BigInt(a.totals[f])).toString()])),
    accounts: accounts.map(account => ({ account, change: !oldRows.has(account) ? 'added' : !newRows.has(account) ? 'removed' : 'retained',
      deltas: Object.fromEntries(fields.map(f => [f, (BigInt(newRows.get(account)?.amounts[f] ?? '0') - BigInt(oldRows.get(account)?.amounts[f] ?? '0')).toString()])) })) };
}
