/** Descriptive cost questions only; this function cannot infer funding availability or cash dates. */
export function costFindings(preview) {
  const { snapshot, warnings } = preview;
  const findings = warnings.map(code => ({ code, severity: 'warning' }));
  for (const row of snapshot.rows) {
    const efc = BigInt(row.amounts.estimatedFinalCost), revised = BigInt(row.amounts.revisedBudget), actual = BigInt(row.amounts.actuals);
    if (efc > revised) findings.push({ code:'EFC_EXCEEDS_REVISED_BUDGET', account:row.account, sourceRow:row.sourceRow, amount:(efc-revised).toString(), question:'Does the separate finance plan cover this cost increase?' });
    if (actual > efc) findings.push({ code:'ACTUALS_EXCEED_EFC', account:row.account, sourceRow:row.sourceRow, question:'Confirm the report basis and estimated final cost.' });
  }
  return { findings, fundingGap: null, cashTimingGap: null, limitation:'Financing commitments and dated cash flows require separate evidence.', readOnly:true };
}
