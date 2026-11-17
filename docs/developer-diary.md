# Developer diary

## 2026-11-17 — Start SmartAccounting cost snapshot integration spike

Created a private standalone development repository for TakeAgent issue #60. Added a dependency-free synthetic normalized report preview, exact signed amounts, separate cost measures, report reconciliation, scope checks, deterministic fingerprints and revision comparison. Inputs remain unchanged and no project writes or external calls occur. Documentation distinguishes this contract from verified EP export compatibility and records the integration and authorization gates.

Validation: `npm test` passed 17 tests covering reconciliation, signed credits, privacy minimization, nonmutation, tenant/project/currency mismatch, partial reports, duplicate accounts, subtotals, missing amounts, formulas, excess precision, invalid dates, overlapping commitments, stale data and revision behavior. No deployment or live vendor verification was performed. Excel parsing, vendor report fixtures, account hierarchy, authenticated TakeAgent wiring and finance-review integration remain follow-up work.

## 2026-11-17 — Restrict currencies to supported precision

Peer review found that accepting any three-letter currency conflicted with the two-decimal minor-unit contract. Restricted the prototype to USD, EUR, GBP, CAD and AUD and documented the boundary. Validation: 18 tests passed, including rejection of JPY, KWD and unknown codes even when context matches. Initial source was pushed to the private repository; no deployment or live EP validation occurred. Other currency exponents remain unsupported.

## 2026-11-17 — Add mapped CSV previews and cost companion contracts

Advanced the synthetic adapter with a bounded CSV parser, required distinct column mapping, unrelated-column rejection, file hashes and source rows. Revision previews now expose account additions/removals and deltas. Added descriptive EFC/budget questions without inferring funding gaps, and explicit one-to-one host budget account linking with hierarchy validation. Added the disabled development manifest for production discovery, host integration contract, owner/vendor/engineering blocker list and Linux CI.

Validation: 37 synthetic tests passed locally, covering CSV quoting/limits/malformed inputs, mapping, formulas, minimization, signed totals, revisions, host scope and hierarchy. EP's official product page was rechecked for report capabilities; no stable export schema or third-party API permission was established. Hosted CI and production catalog linkage are separate pending operations. Native XLSX, actual vendor profiles and authenticated host upload/persistence remain open; no real records, secrets, live vendor calls or project mutations were used.
