import { createHash } from 'node:crypto';

export const fields = Object.freeze(['originalBudget', 'revisedBudget', 'actuals', 'openCommitments', 'estimateToComplete', 'estimatedFinalCost']);
function requireValue(condition, code) { if (!condition) throw new Error(code); }
function identifier(value) { return typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,100}$/.test(value); }
function date(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value; }
function cents(value) {
  requireValue(typeof value === 'string' && /^-?\d{1,12}(\.\d{1,2})?$/.test(value), 'INVALID_AMOUNT');
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^-/, '').split('.');
  return (negative ? -1n : 1n) * (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')));
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
  requireValue(report.complete === true, 'PARTIAL_REPORT');
  requireValue(Array.isArray(report.rows) && report.rows.length > 0 && report.rows.length <= 10000, 'INVALID_ROWS');
  const totals = Object.fromEntries(fields.map(f => [f, 0n]));
  const accounts = new Set();
  const rows = report.rows.map((row, i) => {
    requireValue(identifier(row.account) && !accounts.has(row.account), 'DUPLICATE_OR_INVALID_ACCOUNT');
    accounts.add(row.account);
    requireValue(row.kind === 'detail', 'SUBTOTAL_NOT_ALLOWED');
    const amounts = Object.fromEntries(fields.map(f => { const n = cents(row[f]); totals[f] += n; return [f, n.toString()]; }));
    return { account: row.account, sourceRow: i + 1, amounts };
  });
  for (const f of fields) requireValue(totals[f] === cents(report.totals?.[f]), 'TOTAL_MISMATCH');
  const snapshot = { source: 'ep-smartaccounting', profile: report.profile, tenantId: report.tenantId, projectId: report.projectId,
    sourceProjectId: report.sourceProjectId, revision: report.revision, asOf: report.asOf, currency: report.currency,
    basis: report.basis, commitmentBasis: report.commitmentBasis, rows,
    totals: Object.fromEntries(fields.map(f => [f, totals[f].toString()])) };
  const fingerprint = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
  const ageDays = Math.floor((Date.parse(context.today) - Date.parse(report.asOf)) / 86400000);
  return { snapshot, fingerprint, warnings: ageDays > 30 ? ['STALE_REPORT'] : [], mode: 'preview-only', amountUnit: 'minor-units-2-decimals' };
}

/** Compare snapshots without mutating either or writing any finance-plan entries. */
export function compare(previous, next) {
  const a = previous.snapshot, b = next.snapshot;
  for (const key of ['tenantId','projectId','sourceProjectId','currency','profile','basis','commitmentBasis']) requireValue(a[key] === b[key], 'SNAPSHOT_SCOPE_MISMATCH');
  if (previous.fingerprint === next.fingerprint) return { status: 'unchanged', deltas: {} };
  requireValue(a.revision !== b.revision, 'REVISION_CONFLICT');
  requireValue(b.asOf >= a.asOf, 'OLDER_REPORT');
  return { status: 'revision-preview', deltas: Object.fromEntries(fields.map(f => [f, (BigInt(b.totals[f]) - BigInt(a.totals[f])).toString()])) };
}
