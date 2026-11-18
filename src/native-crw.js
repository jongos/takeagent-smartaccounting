import { createHash } from 'node:crypto';
import { parseCsv } from './csv.js';
import { fields, preview } from './snapshot.js';
import { requireProfile } from './profiles.js';

const profileId = 'ep-smartaccounting-crw-export-v1-provisional';

function fail(code) {
  throw new Error(code);
}

function headerIndex(headers, label) {
  const i = headers.indexOf(label);
  return i >= 0 ? i : undefined;
}

function normalizeAccount(raw) {
  if (typeof raw !== 'string') fail('INVALID_ACCOUNT');
  const trimmed = raw.trim();
  if (!trimmed) fail('INVALID_ACCOUNT');
  const token = trimmed.split(/\s+/)[0];
  if (!/^[A-Za-z0-9_.:-]{1,100}$/.test(token)) fail('INVALID_ACCOUNT');
  return token;
}

function detailRowType(rowType, profile) {
  const value = (rowType ?? '').trim();
  if (!value || value === 'Account' || value === 'Detail') return true;
  if (profile.rejectedRowTypes.includes(value)) return false;
  return true;
}

/**
 * Provisional native parser for a values-only CRW table export.
 * Column spellings follow EP's public CRW UI documentation; exact Excel/CSV export headers are not certified.
 */
export function previewCrwExport(text, { metadata, totals }, context) {
  const profile = requireProfile(profileId);
  if (metadata?.reportScope !== 'full-project-unfiltered') fail('UNSUPPORTED_REPORT_SCOPE');
  const [headers, ...data] = parseCsv(text);
  const cols = profile.measureColumns;
  const positions = Object.fromEntries(
  Object.entries(cols).map(([key, label]) => {
      const index = headerIndex(headers, label);
      if (index === undefined) fail('MISSING_CRW_COLUMN');
      return [key, index];
    }),
  );
  const approvedIdx = headerIndex(headers, profile.derivedColumns.approvedOverage);
  const totalCostIdx = headerIndex(headers, profile.derivedColumns.totalCost);

  const accounts = new Set();
  const rows = [];
  const derivedChecks = [];
  for (let i = 0; i < data.length; i++) {
    const line = data[i];
    if (!detailRowType(line[positions.rowType], profile)) fail('SUBTOTAL_NOT_ALLOWED');
    const accountRaw = line[positions.account];
    if (!accountRaw?.trim()) continue;
    const account = normalizeAccount(accountRaw);
    if (accounts.has(account)) fail('DUPLICATE_OR_INVALID_ACCOUNT');
    accounts.add(account);
    const row = {
      kind: 'detail',
      account,
      lineId: profile.lineIdForAccount(account),
      sourceRow: i + 2,
      ...Object.fromEntries(fields.map(f => [f, line[positions[f]]])),
    };
    rows.push(row);
    if (approvedIdx !== undefined && totalCostIdx !== undefined) {
      derivedChecks.push({
        account,
        approvedOverage: line[approvedIdx],
        totalCost: line[totalCostIdx],
        actuals: line[positions.actuals],
        openCommitments: line[positions.openCommitments],
      });
    }
  }
  if (!rows.length) fail('INVALID_ROWS');
  const result = preview({ ...metadata, profile: profileId, rows, totals }, context);
  return {
    ...result,
    provenance: {
      format: 'csv',
      vendorLayout: 'ep-crw-cost-worksheet',
      profile: profileId,
      certification: 'provisional',
      sha256: createHash('sha256').update(text).digest('hex'),
      headerRow: 1,
      columnMap: cols,
      derivedChecks,
    },
  };
}

export { profileId as epCrwExportProfileId };