function centsFromDecimal(value) {
  if (typeof value !== 'string' || !/^-?\d{1,12}(\.\d{1,2})?$/.test(value)) return null;
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = value.replace(/^-/, '').split('.');
  return (negative ? -1n : 1n) * (BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0')));
}

/** Descriptive cost questions only; this function cannot infer funding availability or cash dates. */
export function costFindings(preview) {
  const { snapshot, warnings } = preview;
  const findings = warnings.map(code => ({ code, severity: 'warning' }));
  if (preview.profileCertification === 'provisional') {
    findings.push({
      code: 'PROVISIONAL_VENDOR_PROFILE',
      severity: 'info',
      profile: snapshot.profile,
      question: 'Confirm this file matches a user-attested EP Cost Report Worksheet export before treating mappings as certified.',
    });
  }
  for (const row of snapshot.rows) {
    const efc = BigInt(row.amounts.estimatedFinalCost);
    const revised = BigInt(row.amounts.revisedBudget);
    const actual = BigInt(row.amounts.actuals);
    if (efc > revised) {
      findings.push({
        code: 'EFC_EXCEEDS_REVISED_BUDGET',
        account: row.account,
        lineId: row.lineId,
        sourceRow: row.sourceRow,
        amount: (efc - revised).toString(),
        question: 'Does the separate finance plan cover this cost increase?',
      });
    }
    if (actual > efc) {
      findings.push({
        code: 'ACTUALS_EXCEED_EFC',
        account: row.account,
        lineId: row.lineId,
        sourceRow: row.sourceRow,
        question: 'Confirm the report basis and estimated final cost.',
      });
    }
  }
  for (const check of preview.provenance?.derivedChecks ?? []) {
    const actual = centsFromDecimal(check.actuals);
    const pos = centsFromDecimal(check.openCommitments);
    const total = centsFromDecimal(check.totalCost);
    if (actual !== null && pos !== null && total !== null && actual + pos !== total) {
      const row = snapshot.rows.find(r => r.account === check.account);
      findings.push({
        code: 'TOTAL_COST_COLUMN_MISMATCH',
        account: check.account,
        lineId: row?.lineId,
        sourceRow: row?.sourceRow,
        question: 'Confirm whether Total Cost equals Actuals plus POs on the source worksheet.',
      });
    }
  }
  const fundingGap = null;
  const fundingGapStatus = 'refused';
  const cashTimingGap = null;
  return {
    findings,
    fundingGap,
    fundingGapStatus,
    cashTimingGap,
    fundingDeficit: fundingGap,
    fundingDeficitStatus: fundingGapStatus,
    cashTimingDeficit: cashTimingGap,
    limitation: 'Financing commitments and dated cash flows require separate evidence.',
    readOnly: true,
  };
}
