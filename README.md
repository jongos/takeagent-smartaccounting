# TakeAgent · EP SmartAccounting

Development library for [TakeAgent issue #60](https://github.com/jongos/takeagent/issues/60): a tested normalized cost-snapshot preview, not an EP-certified export parser, live connector, or deployed TakeAgent feature.

## Install and test

Requires Node 22 or later. Clone the repository, then run:

```bash
npm run lint
npm test
```

There are no npm dependencies, credentials, or external requests. GitHub Actions runs the same lint and test suite on Linux.

The expanded adapter supports bounded selected CSV tables through `parseCsv` / `previewCsv`, explicit column mapping, file hash and row provenance, account-level revision deltas, and source-linked descriptive cost findings. `previewBudgetMapping` previews explicit links into a host budget with validated hierarchy without overwriting it. See [host contract](docs/host-integration.md), [remaining inputs](docs/blockers.md), and [development manifest](integration-manifest.json).

`preview(report, context)` accepts the synthetic contract demonstrated in `test/snapshot.test.js`. It keeps six cost measures separate, requires exact signed decimal amounts, checks totals and scope, rejects subtotals/duplicate accounts, strips unrelated fields, and returns provenance, a deterministic fingerprint and stale-report warnings. Amounts in output are integer minor-unit strings using two decimal places. `compare` handles repeated imports and previews revision deltas without mutation. Input limits are 10,000 detail rows and 12 integer digits per amount. Only cumulative, single-currency reports with unpaid commitments explicitly excluded from actuals are supported. No FX conversion or currency-specific precision inference.

## Supported profile

Only `takeagent-synthetic-cost-v1` is supported, with USD, EUR, GBP, CAD or AUD. Other currency exponents are rejected. No actual EP report version is certified. Missing fields fail; values are never inferred from EFC or other columns. The normalized input requires tenant/project IDs, source project and revision, as-of date, currency, reporting basis, detail account IDs, six distinct measures and independent report totals. CSV source-row numbers refer to the selected input table; direct normalized input retains caller-supplied row provenance. Host budget hierarchy can be linked explicitly; vendor hierarchy extraction and original Excel cell provenance remain future work.

## Next work

1. Obtain a synthetic representative EP Excel export and document its version, field meanings and account hierarchy. Build an explicit mapping preview using TakeAgent's existing bounded document readers; do not copy the nonnegative budget-only parser for signed accounting costs.
2. Verify account mapping against Movie Magic and report totals. Keep original/revised budgets and the finance plan separate.
3. Integrate behind existing TakeAgent authentication, project access, usage limits, retention controls and explicit apply. This library is not an authentication mechanism; host-supplied context must come from trusted server authorization. Do not expose it directly as an unauthenticated service.
4. Connect the implemented descriptive cost questions to read-only financing analysis through existing finance-review services. Cost changes alone are not funding commitments or collateral evidence. No financing-gap or cash-timing conclusion is implemented here.
5. Verify any live API access and terms with EP before implementation or advertising. No payroll, payment, external accounting writes, or live feed is included.

## Research

Reviewed 2026-11-17: [EP SmartAccounting](https://www.ep.com/smartaccounting/) describes configurable cost reporting, EFC updates, currency conversion and integrated POs. This supports investigating cost-report compatibility; it does not establish a public third-party API or a stable export schema. Production compatibility remains unverified.

## Re-export identity

`preview` and `previewCsv` now return `semanticFingerprint` alongside the original ordered `fingerprint`. The original snapshot order, physical source rows and CSV SHA-256 remain unchanged for audit. Semantic identity sorts accounts and excludes source-row positions while retaining all financial measures and report/scope metadata (including revision and as-of date). `compare` returns `{status: 'unchanged', provenanceOnly: true, deltas: {}}` for a reordered re-export with otherwise identical content. It recomputes canonical identity, including for older stored previews without the new field. Changed financial allocations under the same revision still raise `REVISION_CONFLICT`, even if totals match. This library does not implement host storage/idempotency transactions.
