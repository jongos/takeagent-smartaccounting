# Developer diary

## 2026-11-17 — Start SmartAccounting cost snapshot integration spike

Created a standalone development repository for TakeAgent issue #60. Added a dependency-free synthetic normalized report preview, exact signed amounts, separate cost measures, report reconciliation, scope checks, deterministic fingerprints and revision comparison. Inputs remain unchanged and no project writes or external calls occur. Documentation distinguishes this contract from verified EP export compatibility and records the integration and authorization gates.

Validation: `npm test` passed 17 tests covering reconciliation, signed credits, privacy minimization, nonmutation, tenant/project/currency mismatch, partial reports, duplicate accounts, subtotals, missing amounts, formulas, excess precision, invalid dates, overlapping commitments, stale data and revision behavior. No deployment or live vendor verification was performed. Excel parsing, vendor report fixtures, account hierarchy, authenticated TakeAgent wiring and finance-review integration remain follow-up work.

## 2026-11-17 — Restrict currencies to supported precision

Peer review found that accepting any three-letter currency conflicted with the two-decimal minor-unit contract. Restricted the prototype to USD, EUR, GBP, CAD and AUD and documented the boundary. Validation: 18 tests passed, including rejection of JPY, KWD and unknown codes even when context matches. Initial source was pushed to the development repository; no deployment or live EP validation occurred. Other currency exponents remain unsupported.

## 2026-11-17 — Add mapped CSV previews and cost companion contracts

Advanced the synthetic adapter with a bounded CSV parser, required distinct column mapping, unrelated-column rejection, file hashes and source rows. Revision previews now expose account additions/removals and deltas. Added descriptive EFC/budget questions without inferring funding deficits, and explicit one-to-one host budget account linking with hierarchy validation. Added the disabled development manifest for production discovery, host integration contract, owner/vendor/engineering blocker list and Linux CI.

Validation: 37 synthetic tests passed locally, covering CSV quoting/limits/malformed inputs, mapping, formulas, minimization, signed totals, revisions, host scope and hierarchy. EP's official product page was rechecked for report capabilities; no stable export schema or third-party API permission was established. Hosted CI and production catalog linkage are separate pending operations. Native XLSX, actual vendor profiles and authenticated host upload/persistence remain open; no real records, secrets, live vendor calls or project mutations were used.

## 2026-11-17 — Tighten report scope and CSV provenance

Cross-review found multiline mapped headers could shift physical row references and filtered subsets lacked an explicit report-scope restriction. Rejected multiline headers and required a full-project-unfiltered scope declaration, included in snapshot identity and comparison. Clarified the implemented host-budget mapping and cost-question boundaries in README. Validation: 39 tests passed with the new negative cases. The preceding 37-test commit passed hosted Linux CI. Production catalog linkage is still managed separately; no live EP access was exercised.

## 2026-11-17 — Distinguish reordered reports from financial revision conflicts

Resolved issue #3 by adding canonical semantic fingerprints keyed by account and scope/report metadata, excluding physical row order. Original ordered fingerprint, CSV source hash and source rows remain available for audit. compare marks reordered identical reports unchanged with provenanceOnly, including legacy previews without the new fingerprint field. Financial changes and scope/date conflicts remain strict.

Validation: all 41 tests passed, including real two-account CSV reorder, distinct audit hashes/source rows, same-total financial reallocation conflict, tenant isolation, older report rejection and legacy snapshot compatibility. No live vendor access or production changes.

## 2026-11-17 — Record current optional host release

Added `docs/host-release-status.md` linking the deployed TakeAgent CSV/Excel release and explaining the division between shared host file handling and this adapter. Preserved optional installation, no-new-configuration behavior and vendor-access limitations. Refetched origin and verified the existing adapter source was already synchronized. The complete repository suite passed 41/41 tests. This commit changes documentation only; no adapter or deployment change is claimed.

## 2026-11-17 — Harden compare, validation, CSV limits, and CI (issues #4–#10)

Triage on `origin/main` at `50e18be`: #3 closed on main (`72558e5`); #1 closed as host-catalog work; #2 still blocked on vendor export/API input. Implemented code fixes for open defects #4–#10: compare no longer treats missing fingerprints as unchanged; stored snapshots are validated before `BigInt` conversion; budget-mapping links reject null or malformed entries; snapshot `fingerprint` uses canonical key ordering via exported `fingerprintSnapshot`; amount parsing returns distinct codes for parentheses, grouping, currency symbols, and decimal-comma formats; `parseCsv` fails at 10,000 data rows to match `preview()`; CI runs `npm run lint` plus expanded regression tests.

Validation: `npm run lint` and `npm test` passed 51/51. Merged via PR #12 after review on overlapping fix branches. No vendor fixtures, secrets, or live EP access.

## 2026-11-18 — Prepare repository for public release

Scrubbed documentation for open-source readers: public-facing README install/test instructions, generic host validation wording (no production project titles), removal of internal coordination/swarm phrasing, expanded `.gitignore`, and package metadata (`description`, `repository`). Ran gitleaks (10 commits, no leaks), trufflehog git scan (0 verified/unverified secrets), and manual pattern greps across the working tree and history (no API keys, tokens, or private keys). No credential rotation required.

Validation: `npm run lint` and `npm test` passed 51/51. License file left for owner decision; repository visibility not changed in this commit.

## 2026-11-18 — Adopt the MediaHedge License

Added the proprietary `LICENSE` (MediaHedge License v1.0), set `package.json` `license` to `SEE LICENSE IN LICENSE`, and documented terms in the README. Validation: `npm run lint` and `npm test` pass locally. No adapter or runtime code changes.
