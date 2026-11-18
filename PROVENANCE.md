# Vendor snapshot provenance

This file tracks public SmartAccounting library profiles the TakeAgent host can vendor-pin.

| Profile ID | Certification | Layout basis | Host pin |
| --- | --- | --- | --- |
| `takeagent-synthetic-cost-v1` | `synthetic-contract` | TakeAgent normalized contract (tests and explicit user mapping) | Stable for contract tests |
| `ep-smartaccounting-crw-export-v1-provisional` | `provisional` | EP public CRW column documentation ([Cost Report Worksheet troubleshooting PDF](https://downloads.adc.ep.com/doc/EP_SmartAccounting_Cost_Report_Worksheet_Troubleshooting.pdf)) | Use after review; not vendor-certified |

## Host vendoring identifiers

- **Library source:** `https://github.com/jongos/takeagent-smartaccounting`
- **Native export entrypoint:** `previewCrwExport` from `src/native-crw.js`
- **Profile registry:** `src/profiles.js`
- **Synthetic contract entrypoint:** `preview` / `previewCsv` (unchanged)

## Attestation required for certification

To move `ep-smartaccounting-crw-export-v1-provisional` from provisional to certified, a user-attested sample export must confirm:

1. Exact header spellings from Excel/CSV export (not only on-screen CRW labels).
2. Whether inactive/zero rows are omitted from export when "Hide Zeros" is enabled.
3. Row Type values for detail versus totaling rows when Locations, Sets, or Episodes are activated.
4. Currency exponent and cumulative period basis for the uploaded report package.
5. Whether PO amounts represent only unpaid commitments excluded from Actuals (required by the normalized basis).

Until then, adapters must surface `PROVISIONAL_VENDOR_PROFILE` via `costFindings` and keep `fundingGap` null with `fundingGapStatus: refused`.