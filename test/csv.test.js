import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fields, compare } from '../src/snapshot.js';
import { parseCsv, previewCsv } from '../src/csv.js';
import { costFindings } from '../src/companion.js';
const context = {tenantId:'demo',projectId:'demo',currency:'USD',today:'2026-11-17'};
const options = () => ({ mapping:Object.fromEntries(['account',...fields].map(x=>[x,x])), metadata:{...context,sourceProjectId:'demo',revision:'r1',asOf:'2026-11-17',basis:'cumulative',commitmentBasis:'unpaid-not-in-actuals',reportScope:'full-project-unfiltered',complete:true},totals:Object.fromEntries(fields.map(x=>[x,'100'])) });
const csv = () => ['account,'+fields.join(','),'1000,100,100,100,100,100,100'].join('\r\n');
test('CSV mapping preserves physical row, exact totals and file fingerprint', () => { const p = previewCsv(csv(),options(),context); assert.equal(p.snapshot.rows[0].sourceRow,2); assert.equal(p.snapshot.totals.actuals,'10000'); assert.match(p.provenance.sha256,/^[a-f0-9]{64}$/); });
test('quoted fields, BOM, CRLF and final newline', () => { assert.deepEqual(parseCsv('\uFEFFa,b\r\n"x,y","z""z"\r\n'),[['a','b'],['x,y','z"z']]); });
for (const [label, value] of [['ragged','a,b\n1'],['duplicate headers','a,a\n1,2'],['unterminated','a,b\n"1,2'],['trailing junk','a,b\n"1"x,2'],['blank header',',b\n1,2'],['null byte','a,b\n1,\0']]) test(`rejects ${label}`,()=>assert.throws(()=>parseCsv(value)));
test('rejects oversized data and cells',()=>{assert.throws(()=>parseCsv('a'.repeat(2000001)));assert.throws(()=>parseCsv('a\n'+'x'.repeat(2001)));});
test('rejects more than 10000 data rows',()=>{const header='account,value';const rows=[header,...Array.from({length:10001},(_,i)=>`acct-${i},1`)];assert.throws(()=>parseCsv(rows.join('\n')),/TOO_MANY_ROWS/);});
test('accepts exactly 10000 data rows',()=>{const header='account,value';const rows=[header,...Array.from({length:10000},(_,i)=>`acct-${i},1`)];assert.equal(parseCsv(rows.join('\n')).length,10001);});
test('mapping must be complete and distinct',()=>{ const o=options();o.mapping.actuals='account';assert.throws(()=>previewCsv(csv(),o,context),/MAPPING/); });
test('rejects unrelated upload columns',()=>assert.throws(()=>previewCsv(csv().replace('account,','worker,account,').replace('1000,','private,1000,'),options(),context),/UNSELECTED/));
test('formula amounts never execute',()=>assert.throws(()=>previewCsv(csv().replace('1000,100,','1000,=1+1,'),options(),context),/AMOUNT/));
test('account additions/removals visible across same-total revision',()=>{ const a=previewCsv(csv(),options(),context);const o=options();o.metadata.revision='r2';const b=previewCsv(csv().replace('1000,','2000,'),o,context);const c=compare(a,b);assert.deepEqual(c.accounts.map(x=>x.change),['removed','added']); });
test('cost finding never calls cost overrun a funding gap',()=>{const o=options();o.totals.estimatedFinalCost='150';const p=previewCsv(csv().replace(/100$/,'150'),o,context);const f=costFindings(p);assert.equal(f.findings[0].amount,'5000');assert.equal(f.fundingGap,null);assert.equal(f.cashTimingGap,null);});
test('rejects multiline headers to preserve physical row provenance',()=>assert.throws(()=>parseCsv('"account\ncode",value\n1000,1'),/HEADERS/));

test('row reordering is provenance-only while audit file hash and physical rows remain distinct',()=>{
 const o=options();const header='account,'+fields.join(',');const aRow='1000,40,40,40,40,40,40',bRow='2000,60,60,60,60,60,60';
 const first=previewCsv([header,aRow,bRow].join('\n'),o,context),reordered=previewCsv([header,bRow,aRow].join('\n'),o,context);
 assert.notEqual(first.provenance.sha256,reordered.provenance.sha256);assert.notEqual(first.fingerprint,reordered.fingerprint);assert.equal(first.semanticFingerprint,reordered.semanticFingerprint);
 assert.equal(first.snapshot.rows[0].account,'1000');assert.equal(reordered.snapshot.rows[0].account,'2000');assert.equal(reordered.snapshot.rows[1].sourceRow,3);
 assert.deepEqual(compare(first,reordered),{status:'unchanged',provenanceOnly:true,deltas:{}});
 // Older persisted previews without semanticFingerprint remain comparable.
 const legacy=structuredClone(first);delete legacy.semanticFingerprint;assert.equal(compare(legacy,reordered).status,'unchanged');
 const changed=previewCsv([header,'1000,40,40,41,40,40,40','2000,60,60,59,60,60,60'].join('\n'),o,context);assert.throws(()=>compare(first,changed),/REVISION_CONFLICT/);
 const cross={...o,metadata:{...o.metadata,tenantId:'other'}};assert.throws(()=>compare(first,previewCsv([header,bRow,aRow].join('\n'),cross,{...context,tenantId:'other'})),/SCOPE/);
});
test('same finances do not hide report date or revision metadata changes',()=>{
 const first=previewCsv(csv(),options(),context);const o=options();o.metadata.asOf='2026-11-16';assert.throws(()=>compare(first,previewCsv(csv(),o,context)),/REVISION_CONFLICT/);o.metadata.revision='r2';assert.throws(()=>compare(first,previewCsv(csv(),o,context)),/OLDER_REPORT/);
});
