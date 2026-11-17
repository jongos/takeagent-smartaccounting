function linkAccount(value) { return typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,100}$/.test(value); }
function requireLink(link) {
  if (!link || typeof link !== 'object' || Array.isArray(link)) throw new Error('INVALID_BUDGET_MAPPING');
  if (!linkAccount(link.sourceAccount) || !linkAccount(link.budgetAccount)) throw new Error('INVALID_BUDGET_MAPPING');
}
/** Explicit one-to-one account links; linking is a preview, never a budget overwrite. */
export function previewBudgetMapping(costPreview, budget, links) {
  const s = costPreview.snapshot;
  if (!budget || !['tenantId','projectId','currency'].every(k => s[k] === budget[k])) throw new Error('BUDGET_SCOPE_MISMATCH');
  if (typeof budget.revision !== 'string' || !budget.revision || !Array.isArray(budget.accounts) || !Array.isArray(links)) throw new Error('INVALID_BUDGET_MAPPING');
  const costs = new Set(s.rows.map(r => r.account));
  const budgets = new Map();
  for (const row of budget.accounts) {
    if (typeof row.id !== 'string' || !/^[A-Za-z0-9_.:-]{1,100}$/.test(row.id) || budgets.has(row.id)) throw new Error('INVALID_BUDGET_ACCOUNT');
    budgets.set(row.id, row);
  }
  for (const row of budget.accounts) {
    const seen = new Set([row.id]); let parent = row.parentId;
    while (parent !== undefined && parent !== null) {
      if (!budgets.has(parent) || seen.has(parent)) throw new Error('INVALID_BUDGET_HIERARCHY');
      seen.add(parent); parent = budgets.get(parent).parentId;
    }
  }
  const linkedCosts = new Set(), linkedBudgets = new Set();
  const mapped = links.map(link => {
    requireLink(link);
    if (!costs.has(link.sourceAccount) || !budgets.has(link.budgetAccount) || linkedCosts.has(link.sourceAccount) || linkedBudgets.has(link.budgetAccount)) throw new Error('AMBIGUOUS_BUDGET_MAPPING');
    linkedCosts.add(link.sourceAccount); linkedBudgets.add(link.budgetAccount);
    const path = []; let account = budgets.get(link.budgetAccount);
    while (account) { path.unshift(account.id); account = budgets.get(account.parentId); }
    return { sourceAccount:link.sourceAccount, budgetAccount:link.budgetAccount, budgetPath:path };
  });
  return { mode:'preview-only', budgetRevision:budget.revision, costRevision:s.revision, links:mapped,
    unmappedSourceAccounts:[...costs].filter(x=>!linkedCosts.has(x)),
    warnings: linkedCosts.size !== costs.size ? ['UNMAPPED_COST_ACCOUNTS'] : [] };
}
