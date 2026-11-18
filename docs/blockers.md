# Remaining inputs and gates

## Input from the owner or a pilot production accountant

- Provide a synthetic or fully sanitized representative EP cost report, with report name/version, original/revised budget, actuals, unpaid commitments, ETC, EFC and independent totals. Include one revision and a credit. Exclude names, payroll, bank/payment details and real confidential amounts.
- Confirm which report currency and cumulative period basis the pilot uses; identify whether actuals include unpaid AP and which commitments remain open. This determines whether the current supported basis applies.
- Provide a synthetic Movie Magic/imported budget account list and reviewed account links for the same synthetic project. No broad production database access is needed.

## Vendor access

- EP-supported third-party API availability, commercial terms, read-only scopes, project isolation, authentication/revocation and documentation must be confirmed before a live connector is built or advertised. A vendor login alone is not API permission.
- No vendor contact, fees, credentials or new scopes were requested during initial development. Do not send credentials in chat or commit them; a later authorized pilot should provision secrets through the host's secret manager.

## Engineering (not an owner blocker)

- Native XLSX parsing and vendor profile validation need the representative export. Generic CSV mapping/reconciliation is implemented and tested now.
- The production catalog may show development status now; authenticated upload UI and cost-snapshot persistence remain a later host integration. The host contract specifies required tenant, entitlement, concurrency, retention and explicit-apply controls.
- Cost questions are implemented; actual funding/cash-timing findings require the host's separate finance-plan evidence and cash schedule. No inferred funding has been added.
- Independent real-format acceptance and production end-to-end import testing remain pending. Synthetic tests establish library behavior, not vendor certification.
