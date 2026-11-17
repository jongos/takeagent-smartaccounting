import { createHash } from 'node:crypto';
import { fields, preview } from './snapshot.js';

const fail = code => { throw new Error(code); };
/** Bounded UTF-8 CSV reader: no inference, formulas, remote IO or storage. */
export function parseCsv(text) {
  if (typeof text !== 'string' || Buffer.byteLength(text, 'utf8') > 2_000_000 || text.includes('\0')) fail('INVALID_CSV_SIZE_OR_ENCODING');
  text = text.replace(/^\uFEFF/, '');
  const rows = []; let row = [], value = '', quoted = false, closed = false;
  function cell() { if (value.length > 2000) fail('CELL_TOO_LONG'); row.push(value); value = ''; closed = false; if (row.length > 64) fail('TOO_MANY_COLUMNS'); }
  function line() { cell(); rows.push(row); row = []; if (rows.length > 10002) fail('TOO_MANY_ROWS'); }
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"') { if (text[i+1] === '"') { value += '"'; i++; } else { quoted = false; closed = true; } } else value += c; }
    else if (c === ',') cell();
    else if (c === '\r' || c === '\n') { if (c === '\r' && text[i+1] === '\n') i++; line(); }
    else if (c === '"' && value === '' && !closed) quoted = true;
    else { if (closed || c === '"') fail('MALFORMED_CSV'); value += c; }
    if (value.length > 2000) fail('CELL_TOO_LONG');
  }
  if (quoted) fail('UNTERMINATED_QUOTE');
  if (value !== '' || row.length || closed) line();
  if (rows.length < 2 || !rows[0].length || new Set(rows[0]).size !== rows[0].length || rows[0].some(x => !x.trim() || /[\r\n]/.test(x))) fail('INVALID_HEADERS');
  if (rows.some(r => r.length !== rows[0].length)) fail('RAGGED_CSV');
  return rows;
}

/** Caller explicitly supplies selected detail records, metadata, source control totals and reviewed mapping. */
export function previewCsv(text, { mapping, metadata, totals }, context) {
  const [headers, ...data] = parseCsv(text);
  const keys = ['account', ...fields];
  if (!mapping || keys.some(k => typeof mapping[k] !== 'string' || !headers.includes(mapping[k])) || new Set(keys.map(k => mapping[k])).size !== keys.length) fail('INVALID_MAPPING');
  // No quiet omission of worker/payment or other unrelated fields from an upload.
  if (headers.length !== keys.length || headers.some(h => !keys.some(k => mapping[k] === h))) fail('UNSELECTED_COLUMNS');
  const positions = Object.fromEntries(keys.map(k => [k, headers.indexOf(mapping[k])]));
  const rows = data.map((r, i) => ({ kind: 'detail', ...Object.fromEntries(keys.map(k => [k, r[positions[k]]])), sourceRow: i + 2 }));
  const result = preview({ ...metadata, profile: 'takeagent-synthetic-cost-v1', rows, totals }, context);
  return { ...result, provenance: { format: 'csv', sha256: createHash('sha256').update(text).digest('hex'), headerRow: 1, mapping: Object.fromEntries(keys.map(k => [k, positions[k] + 1])) } };
}
