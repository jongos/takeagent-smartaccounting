# EP SmartAccounting CRW export profile (provisional)

**Profile ID:** `ep-smartaccounting-crw-export-v1-provisional`  
**Certification:** provisional (not vendor-certified)

## Public layout basis

Column meanings come from Entertainment Partners’ public [Cost Report Worksheet troubleshooting guide](https://downloads.adc.ep.com/doc/EP_SmartAccounting_Cost_Report_Worksheet_Troubleshooting.pdf) (updated 2026-04-26 in the document footer). That guide lists sixteen CRW columns. This profile maps the six TakeAgent cost measures from the worksheet columns below.

| TakeAgent measure | CRW column (documented UI label) |
| --- | --- |
| `originalBudget` | Budget |
| `revisedBudget` | Adjusted Budget (Budget + Approved Overages per EP) |
| `actuals` | Actuals (cumulative) |
| `openCommitments` | POs |
| `estimateToComplete` | ETC |
| `estimatedFinalCost` | EFC |

Detail rows are identified by the `Account` column. `Row Type` totaling rows (`Total`, `Subtotal`, `Set Total`, `Location Total`) are rejected. Additional CRW columns (`Description`, `Variance`, `% Remaining`, and others) may be present and are ignored.

## Stable cross-walk identifiers

Each imported detail row receives:

- `account` — normalized first token of the CRW `Account` cell (alphanumeric token, max 100 chars).
- `lineId` — `ep.crw.v1:{account}`.

These IDs are stable across row-order changes and are intended for later mapping to TakeAgent topsheet taxonomy categories (`above-the-line`, `below-the-line`, `fringes`, `contingency`, `completion-bond`, `insurance`, `errors-omissions`, `completion-delivery`, `financing-cost`, `reserve`, `unclassified`). This library does not assign taxonomy categories; explicit host mapping is required.

## Parser entrypoint

```javascript
import { previewCrwExport } from './src/native-crw.js';

previewCrwExport(csvText, { metadata, totals }, trustedContext);
```

`metadata` and `totals` follow the same contract as `previewCsv`. The adapter does not infer control totals from row sums.

## Descriptive findings

`costFindings(preview)` may emit:

- `PROVISIONAL_VENDOR_PROFILE` — reminds that export header spellings are not certified.
- `EFC_EXCEEDS_REVISED_BUDGET`, `ACTUALS_EXCEED_EFC` — row-level descriptive questions (include `lineId`).
- `TOTAL_COST_COLUMN_MISMATCH` — when optional `Total Cost` and `Actuals`/`POs` columns are present but `Actuals + POs !== Total Cost`.

Funding conclusions are refused: `fundingGap` is always `null` and `fundingGapStatus` is `refused`.

## What a user-attested sample must confirm

1. Exported header strings for each mapped column (Excel/XLSX or CSV), which may differ from on-screen labels.
2. Whether zero-activity accounts are omitted from exports.
3. Row Type values for leveled Locations/Sets/Episodes layouts.
4. Reporting currency and whether Actuals exclude unpaid AP per the host’s `commitmentBasis`.
5. Independent control totals for all six measures at report footer level.

## Fixture

Synthetic-only regression fixture: `test/fixtures/ep-crw-synthetic.csv` (fictional account numbers and amounts).