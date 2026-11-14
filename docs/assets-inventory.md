# Assets & Inventory — first release

The web application now has a project-scoped office asset register at `/assets`, under OFFICE in the sidebar. This is separate from construction materials and Fleet operational logs.

## Included

- Individually tagged furniture, computers, laptops, printers, vehicles, plant & machinery, survey & lab instruments and equipment. Vehicles and plant carry registration and insurance fields; instruments show a calibration due date.
- Where each asset came from: purchased, transferred from another site, or legacy from an earlier project, with the source site named (e.g. "Transferred from Ghaziabad site").
- Location, condition, purchase details/cost, warranty, service dates, secure photo/document references.
- Active same-project employee custody; assign, return, location transfer, repair, loss, recovery, verification, maintenance and disposal.
- Transactional before/after history, actor identity, effective event date and recording timestamp.
- Search, status/category filters, pagination and current-page CSV export.
- Download or print the whole register as an A4 landscape PDF: every asset matching the current filters, grouped by category, with origin and a signature block for physical verification.
- Explicit project authorization, optimistic version checks with transactional row locks, restricted disposal and read-only disposed records.

Asset operators: administrators, project managers, accounts/accountants and HR officers. Engineers and supervisors have read access. Only administrators and project managers can dispose of assets. Project assignment rules still apply.

## Rollout

The existing backend startup runner automatically discovers and executes `backend/migrations/2026-09-29-office-assets.sql` before accepting traffic. A push to the auto-deployed main branch therefore attempts this additive migration at startup. No migration was manually applied during implementation. Check `/api/v1/health` and startup migration logs after deployment; a live deployment alone does not confirm schema success. Staging PostgreSQL verification remains outstanding; unit tests use repository mocks, not a live database.

`2026-11-14b-office-assets-opening-inventory.sql` loads the Dal Lake site's opening inventory (38 assets) once, on the first boot after it is deployed, and only into that project; on every later boot it adds nothing. No other sample assets are inserted. Register one physical asset per unique project asset tag. Backdated event dates preserve the actual server recording timestamp; they do not replay historical state. Transfers are within a project; cross-project transfer is not implemented.

## Not included

Depreciation, accounting journal postings, bulk import, barcode scanning, native mobile screens, binary attachment uploads and cross-project transfers. Purchase cost is not book value. Vehicle records provide navigation to Fleet, not an automatic link to a fleet vehicle record. Photos/documents use existing HTTPS links.

## Verification

Backend lifecycle unit tests: `npm test -- --runInBand assets.service.spec.ts`.
Frontend helper tests: `npx --no-install vitest run src/pages/assets/assetHelpers.test.ts`.
Browser fixture smoke test: run the frontend at `127.0.0.1:5173`, then `node scripts/verify-assets.mjs chrome` or `edge`. Every API is mocked; external requests are blocked.
