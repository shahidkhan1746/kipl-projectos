# ProjectOS: system gap audit and inventory design — first pass

Audit baseline: `b3bbafe46bb31ae5ec759f70f153243a886e8708`, fetched from origin/main on 29 September 2026. The local tracked checkout was fast-forwarded to this revision; the pre-existing untracked `.claude/settings.local.json` was preserved.

## Scope and limits

This is an initial evidence-backed audit, NOT a completed certification of every module or a production stock reconciliation. Deep inspection in this pass covers material movements, procurement/GRNs, diary integration, project access enforcement, the mobile material form, and selected accounting/deployment boundaries. Other modules below are mapped but still need detailed workflow tests.

No application code, production records, migrations, provider settings or live stock were changed during this pass. No new inventory module has been deployed or implemented. This document defines the proposed increment and its prerequisites.

## Existing module map and audit coverage

| Area | Existing implementation anchors | Coverage / next validation |
|---|---|---|
| Authentication and project access | `backend/src/auth`, `backend/src/projects/project-scope.interceptor.ts`, `frontend/src/App.tsx` | Project-scope edge case reproduced locally; full authentication regression not repeated here. |
| Procurement | `backend/src/procurement/procurement.service.ts`, `frontend/src/pages/procurement/ProcurementPage.tsx` | Requisitions, approval paths, POs, GRNs, reversals, payment requisitions and three-way matching exist. Receipt persistence inspected. |
| Materials / current stock foundation | `backend/src/material-register`, `frontend/src/pages/registers/MaterialRegisterPage.tsx` | Receipts/issues, balances, rates, valuation estimates, source GRN, WBS/purpose, supplier papers and soft withdrawal exist. Deep inspection and targeted tests. |
| Site Diary integration | `backend/src/ops-sync/ops-sync.service.ts`, `backend/src/diary` | Diary-to-material posting inspected; remaining labour/equipment integrations need end-to-end reconciliation. |
| Accounting | `backend/src/accounting/accounting.service.ts`, `transaction.entity.ts`, `expense.entity.ts` | Expense/vendor/payment/date handling inspected selectively. Full general-ledger, tax and closing audit still required; not represented as a complete accounting ERP. |
| BOQ / EPC / RA billing | `backend/src/epc/epc.controller.ts`, `frontend/src/pages/epc` | Routes for BOQ, measurements and RA bills mapped. Quantity-to-stock and cost allocation require deeper verification. |
| WBS / CPM / baselines / EOT | `backend/src/wbs`, `frontend/src/pages/wbs` | Updated main includes the reported fixes and subsequent scheduler changes. Earlier findings are not reused as current defects. Full new-engine verification remains separate. |
| QA / NCR / concrete testing | `backend/src/qa/qa.controller.ts`, `frontend/src/pages/qa` | Inspection, checklist, NCR and cube-test routes mapped. Inventory quarantine/release linkage not established. |
| STP O&M | `backend/src/om/om-pm-task.entity.ts`, `om.controller.ts` | Logs, events and maintenance tasks exist. The inspected maintenance entity uses a text equipment field; spares custody/consumption linkage is not present there. |
| Fleet / plant | `backend/src/fleet/fleet-log.entity.ts` | Vehicle/plant operation, fuel and breakdown fields exist. Not itself a serialized asset or spare-parts inventory. |
| HR | `backend/src/hr`, `frontend/src/pages/hr` | Attendance, timesheets, leave and salary sources mapped. Detailed payroll and role tests pending. |
| Liaison / letters / compliance / site orders | corresponding backend and frontend directories | Modules mapped; detailed approval, attachment and retention audit pending. |
| Tasks / meetings / updates / reports | corresponding backend and frontend directories | Modules mapped; cross-module status and reporting reconciliation pending. |
| AI / knowledge | `backend/src/ai/ai.controller.ts`, `frontend/src/pages/ai` | Chat, knowledge and configuration endpoints exist. Current production provider health and retrieval permissions not re-audited in this pass. |
| Mobile / offline sync | `mobile/lib/features/materials`, `mobile/lib/core/sync` | Material submission contract inspected; device/offline replay integration tests pending. |
| Deployment / migrations / CI | `backend/src/app.module.ts`, `backend/scripts/run-migrations.js`, `.github/workflows/ci.yml` | Production schema synchronization disabled; explicit SQL migration runner exists. CI has backend/frontend/mobile jobs, but no disposable PostgreSQL migration test in this workflow. |

## Verified gaps

Severity describes architectural risk, not a claim that an incident has already occurred in production.

### G01 — HIGH: project access fails open for an unassigned user

`backend/src/projects/project-scope.interceptor.ts`: requested-project and record-owner checks use `allowed.length && ...`; `scoped()` returns the handler unchanged for an empty allowed-project list. `projects.service.ts::allowedProjectIds` can return `[]` for a non-cross-project user.

Local mocked reproduction: an engineer with no assigned projects requesting an explicit foreign project reaches the handler and receives its project-bearing response. No real user or database was used. Explicitly requested projects must not bypass the no-assignment rule. Resolve before adding inventory write routes; also review bulk record IDs, not only top-level project IDs.

### G02 — HIGH: inconsistent unit boundaries in stock reporting

`backend/src/material-register/material-register.service.ts::list` keys running balances by project and material, without unit. `summary` separates units, so the two APIs have different quantity semantics. `frontend/src/pages/registers/groupRegister.ts` also accumulates quantities before its multi-unit warning.

Local mocked reproduction: 10 bags of Cement plus 5 kg of Cement produces a running balance of 15 on the kg row. Correct result is two balances, not a conversion. A warning is not sufficient if a numeric total still combines incompatible units.

### G03 — HIGH: material consumption can exceed recorded stock

`material-register.service.ts::validate/create` checks nonnegative quantities and requires consumption purpose, but does not read available stock or serialize concurrent issues. A mocked issue of 100 kg without a receipt is accepted by the service. Production frequency is unknown.

Inventory needs atomic availability/reservation checks and an explicit approved exception policy. Retrospective posting must also validate the historical balance, not only today's balance.

### G04 — HIGH: mobile consumption payload is incompatible with the API

`mobile/lib/features/materials/screens/materials_screen.dart::_handleSubmit` sends received/consumed quantities, representatives and remarks, but no `purpose`. The backend rejects positive consumption without purpose. `materials_provider.dart::MaterialRecord` does not model that field either.

Confirmed from the two code paths; not tested on a physical device. A positive-consumption submission through this form is expected to fail validation even though remarks are filled in. API contract tests should cover web, mobile and offline replay together.

### G05 — HIGH: source-document identity is incomplete across receipt paths

`procurement.service.ts::createGoodsReceiptNote` posts receipt stock with `grnId`; `ops-sync.service.ts::syncDiaryMaterialsToRegister` independently posts diary materials with a text `diary:<id>:<material>` marker. There is no shared source receipt-line identity between these inspected paths.

Inference: recording the same physical delivery through both channels can double-count stock. The diary path checks for an existing marker then inserts, without a database uniqueness constraint visible in the material entity. Production duplicates have not been measured.

### G06 — HIGH: GRN transaction is good, but not a concurrency/idempotency guarantee

`procurement.service.ts::createGoodsReceiptNote` loads the PO and computes the next GRN number before the transaction. PO line quantities are incremented from that loaded object. A transaction atomically writes GRN/PO/material rows, but does not by itself prevent stale concurrent updates or repeat submissions.

`CreateGrnItemDto.purchaseOrderItemId` is optional; the service can post stock for an unmatched line while skipping PO quantity updates. Receipt identity, line ownership, PO state, quantity tolerances and replay handling need explicit rules. Concurrency outcomes are inferred from code, not load-tested against production.

### G07 — MEDIUM: quantity/rate edits can leave stored value inconsistent

`material-register.service.ts::create` derives amount when appropriate. `update` directly persists the supplied patch without applying equivalent amount reconciliation. The web edit payload can change rate/quantities.

An amount intentionally overridden by an authorized user must be distinguishable from an amount derived from quantity × rate. Corrections to posted stock should use controlled reversal/replacement, not silently rewrite valuation history.

### G08 — MEDIUM: valuation is an estimate, not a historical costing ledger

`backend/src/material-register/valuation.ts::valueOf` calculates an average across the receipt rows supplied and applies it to all consumption. It reports missing-rate coverage, which is useful and should be kept. Later receipts can change the displayed value of earlier consumption; this is not a dated moving-average/FIFO issue-cost ledger.

Do not automatically post this figure into accounting as final cost without an agreed costing method, period control and reconciliation.

### G09 — MEDIUM: all-project material summary can overwrite one project's entry

`material-register.service.ts::summary` accumulates internally by project/material but emits `out[entry.display]`. Two projects with the same canonical material name can collide in the output when projectId is omitted. Project-specific UI calls avoid that case, but cross-project callers need explicit project-bearing keys.

### G10 — HIGH: production-schema parity is not exercised by the inspected CI

`backend/src/app.module.ts` disables synchronize in production. `backend/scripts/run-migrations.js` reapplies SQL files and can warn/skip a missing relation. `.github/workflows/ci.yml` runs tests and typechecks, but no explicit temporary PostgreSQL migration/schema integration stage is present there.

This is a release-risk finding, not proof that current production tables are missing. Inventory must ship with additive migration, fresh-schema and upgrade-path verification before deployment.

### G11 — MEDIUM: accounting side effects are not one atomic operation in inspected methods

`accounting.service.ts::createExpense` saves the expense and then its TDS row as separate repository calls. `deleteExpense` deletes linked records in separate calls. A later failure can leave partially applied financial state. No production inconsistency was measured.

The existing separate document/received/posting/due dates are useful and should be retained. They do not alone provide period locks, backdate approval or immutable stock/accounting postings.

## Inventory: keep the existing foundation

Keep the statutory material register, procurement approvals, transactional GRN bridge, reversible receipts, source documents, purpose/WBS references, project context, and rate-coverage warnings. A second independent stock total beside the register would create a reconciliation problem.

The missing layer is controlled item/store/movement management. Searching the current backend entity sources did not identify warehouse/bin, SKU, lot/serial, expiry, stocktake or stock-transfer models. This finding is limited to the repository inspected, not external spreadsheets or systems.

## Proposed inventory module (not yet implemented)

Navigation: **Inventory & Stores** with Stock Overview, Item Master, Stores, Receipts, Issues & Returns, Transfers, Stocktake, and Exceptions. Web and mobile must use the same API contracts.

### Model

- **Item:** stable ID/code, name/specification, category, base unit, allowed validated conversions, active flag. Separate consumables, returnable tools, spares and capital equipment.
- **Store/bin:** project ownership and physical location; opening balances must be explicitly reconciled, not inferred from an arbitrary name.
- **Movement header/lines:** receipt, issue, return, transfer, opening balance or approved adjustment; source document AND source line IDs; idempotency key; item, unit, quantity, from/to location and work/custodian references.
- **Dates:** document date, physical movement date and posting timestamp stored separately; user, approval and reason retained for retrospective entries.
- **Availability:** on-hand, reserved, quarantined and available are distinct. Damaged/rejected material is not available stock.
- **Controls:** draft/approved/posted/reversed transitions, atomic posting, no hard deletion of posted movements, permission and project checks on every referenced record.
- **Optional asset detail:** lot/serial, expiry, warranty, equipment linkage and tool custody where needed. Chemical quantities must never be added across incompatible units.

### EPC / STP / solid-waste application

Civil materials, pipes/fittings, reinforcement, electrical cable, instrumentation and consumables can use quantity stock. STP spares should link to installed equipment and maintenance jobs. Chemicals need lot/expiry/quality controls. Returnable tools need issue-to-person and return tracking. Waste-treatment machinery and major capital assets need asset lifecycle records rather than being treated as ordinary consumed materials.

### Integration boundary

Approved PO → GRN/quality acceptance → one stock receipt → issue to WBS/workfront/maintenance → return or consumption → reconciled cost view.

Site Diary should reference the receipt/issue already posted rather than recreate stock for it. Accounting should link bills to accepted receipts; a late supplier invoice must not fabricate a new physical receipt or change its original date. Multi-store transfers require balanced source/destination legs in one transaction.

### Safe delivery sequence

1. Close access-control and web/mobile contract gaps; establish unit-safe identity and idempotent source posting.
2. Add a read-only stock overview from reconciled existing data. Flag negative balances, missing rates, mixed units and uncertain source links explicitly.
3. Add item/store masters and controlled opening-balance mapping. Do not automatically rewrite historic material names or assign locations.
4. Add atomic receipts, issues, returns and transfers; migrate existing flows to a single posting service without double posting.
5. Add stocktake/adjustment approvals, reservations, batches/expiry, custody and accounting reconciliation as the agreed scope requires.

### Acceptance tests before live posting

No-project and cross-project access; foreign IDs in bulk operations; units/conversions; duplicate and offline replay; two concurrent issues; concurrent GRNs; reversal after downstream consumption; closed/backdated periods; unknown cost versus zero cost; quarantine/expiry exclusion; transfer conservation; baseline reconciliation; mobile validation parity; fresh and existing database migrations.

## Verification performed

- 85 existing tests passed across material-register service, procurement service and project-scope interceptor suites.
- Three additional in-memory probes reproduced mixed-unit running balances, acceptance of consumption without stock checks, and an unassigned user's explicit-project bypass.
- These probes used repository/authorization stubs only: no production API calls, database writes, real credentials or stock movements.
- Passing existing tests does not cover the reproduced gaps. No full-system end-to-end or device certification is claimed.

## Decision needed

Confirm the first release scope: site materials/consumables only, or also tools, STP spares, chemicals and multi-store transfers. This affects item identity, custody and movement types; it should be decided before stock-writing workflows are implemented.
