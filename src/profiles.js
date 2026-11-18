/** Registered cost-snapshot profiles (certification state is documented per profile). */
export const profiles = Object.freeze({
  'takeagent-synthetic-cost-v1': Object.freeze({
    id: 'takeagent-synthetic-cost-v1',
    certification: 'synthetic-contract',
    source: 'takeagent-normalized',
    lineIdForAccount(account) {
      return account;
    },
  }),
  'ep-smartaccounting-crw-export-v1-provisional': Object.freeze({
    id: 'ep-smartaccounting-crw-export-v1-provisional',
    certification: 'provisional',
    source: 'ep-smartaccounting-crw',
    vendorDoc:
      'https://downloads.adc.ep.com/doc/EP_SmartAccounting_Cost_Report_Worksheet_Troubleshooting.pdf',
    lineIdForAccount(account) {
      return `ep.crw.v1:${account}`;
    },
    /** UI column labels from EP's public CRW documentation; file export header spellings remain unverified. */
    measureColumns: Object.freeze({
      account: 'Account',
      rowType: 'Row Type',
      originalBudget: 'Budget',
      revisedBudget: 'Adjusted Budget',
      actuals: 'Actuals',
      openCommitments: 'POs',
      estimateToComplete: 'ETC',
      estimatedFinalCost: 'EFC',
    }),
    derivedColumns: Object.freeze({
      approvedOverage: 'Approved Overages',
      totalCost: 'Total Cost',
    }),
    rejectedRowTypes: Object.freeze(['Total', 'Subtotal', 'Set Total', 'Location Total']),
  }),
});

export function requireProfile(id) {
  const profile = profiles[id];
  if (!profile) throw new Error('UNSUPPORTED_PROFILE');
  return profile;
}