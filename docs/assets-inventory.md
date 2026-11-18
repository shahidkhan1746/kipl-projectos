# Assets & Inventory — first release

The web application now has a project-scoped office asset register at `/assets`, under OFFICE in the sidebar. This is separate from construction materials and Fleet operational logs.

## Included

- Individually tagged furniture, computers, laptops, printers, vehicles, plant & machinery, survey & lab instruments and equipment. Vehicles and plant carry registration and insurance fields; instruments show a calibration due date.
- Where each asset came from: bought new, bought second-hand, transferred from another site, or legacy from an earlier project, with the source site named (e.g. "Transferred from Ghaziabad site").
- Location, condition, purchase details/cost, warranty, service dates, secure photo/document references.
- Active same-project employee custody; assign, return, location transfer, repair, loss, recovery, verification, maintenance and disposal.
- Transactional before/after history, actor identity, effective event date and recording timestamp.
- Two lists: **This project** (bought for or transferred to the project) and **Legacy assets** (carried over from an earlier project, such as the porta cabin from the Achan Landfill site and the Brezza from the 2014 project). Each tab shows its count, and the status tiles follow the tab. The tab is in the address (`/assets?list=legacy`), so it survives a refresh and the back button. "Register legacy asset" on the Legacy tab starts the form with Legacy selected.
- Search, plus filters for category, status, how it came (project list only; includes "Not recorded"), source site or earlier project, location and condition. Changing a filter goes back to page 1; switching tabs starts the other list with no filters. Pagination and current-page CSV export.
- Download or print the open list as an A4 landscape PDF: every asset in that tab matching the current filters, grouped by category, with origin and a signature block for physical verification. The Legacy tab prints as a separate "Legacy asset register"; the project register notes that legacy assets are listed separately.
- Explicit project authorization, optimistic version checks with transactional row locks, restricted disposal and read-only disposed records.

Asset operators: administrators, project managers, accounts/accountants and HR officers. Engineers and supervisors have read access. Only administrators and project managers can dispose of assets. Project assignment rules still apply.

## Rollout

The existing backend startup runner automatically discovers and executes `backend/migrations/2026-09-29-office-assets.sql` before accepting traffic. A push to the auto-deployed main branch therefore attempts this additive migration at startup. No migration was manually applied during implementation. Check `/api/v1/health` and startup migration logs after deployment; a live deployment alone does not confirm schema success. Staging PostgreSQL verification remains outstanding; unit tests use repository mocks, not a live database.

`2026-11-14b-office-assets-opening-inventory.sql` loads the Dal Lake site's opening inventory once, on the first boot after it is deployed, and only into that project; on every later boot it adds nothing. It loaded 38 assets. `2026-11-18-office-assets-brezza-legacy.sql` then moves the Maruti Suzuki Brezza to the Legacy assets list (it came from KIPL's 2014 project), recording the change in its history. It does this once, and never if someone has already changed the Brezza's origin in the app. That leaves 36 assets in this project's register and 2 legacy (the Achan Landfill porta cabin and the Brezza). No other sample assets are inserted. Register one physical asset per unique project asset tag. Backdated event dates preserve the actual server recording timestamp; they do not replay historical state. Transfers are within a project; cross-project transfer is not implemented.

## Not included

Depreciation, accounting journal postings, bulk import, barcode scanning, native mobile screens, binary attachment uploads and cross-project transfers. Purchase cost is not book value. Vehicle records provide navigation to Fleet, not an automatic link to a fleet vehicle record. Photos/documents use existing HTTPS links.

## Verification

Backend lifecycle and list-filter unit tests: `npm test -- --runInBand assets.service.spec.ts`.
Frontend helper, form and PDF tests: `npx --no-install vitest run src/pages/assets`.
Browser fixture smoke test: run the frontend at `127.0.0.1:5173`, then `node scripts/verify-assets.mjs chrome` or `edge`. Every API is mocked; external requests are blocked.
