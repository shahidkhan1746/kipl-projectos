# Diesel register

Replaces the site's `Diesel_Log.xlsx`. On the web it is **Fleet & Plant Log → Diesel register** (`/fleet?view=diesel`); in the mobile app it is **More → Diesel register**, or the fuel button on the Plant & Fleet Logbook (`/diesel`).

## What it records

- **Issue:** diesel put into a machine. The machine is picked from a list, the operator is filled in from the machine and can be changed, and the hour meter (or odometer) at the fill is asked for every time. "Meter not read" is allowed only with a reason.
- **Purchase:** diesel bought, from a pump or a supplier, with the rate or the bill amount (either one works out the other), the pump or supplier, and the bill number.
- **Stock check (web):** an adjustment up or down, with a reason. Used for the opening stock and for dip checks.
- Entries are never deleted. Managers void them with a reason, and voided entries stay listed under the month.

The balance is worked out by the server, not typed. Within a day, purchases count before issues.

## Machines

Each machine is owned or hired. A hired machine must name its hire firm. Diesel put into hired machines is totalled by firm each month, so it can be checked against that firm's bill. Opening list for Dal Lake:

| Machine | Ownership | Operator |
|---|---|---|
| Komatsu PC210 excavator ("Poclain") | Own (asset register) | Rinku |
| JCB 3DX backhoe loader | Own (asset register) | Yasir |
| Mahindra Powerol DG set | Own (asset register) | — |
| Sany excavator | Hired, Wani Infra | — |
| Road roller | Hired, Wani Infra | — |

Managers add or edit machines with the **Machines** button. "Names used in the Fleet logbook" lists what people type as the machine ID in the logbook (for example `PC210, Poclain`).

## The Fleet logbook

Diesel typed into a logbook entry ("Diesel issued" on mobile, "Fuel Added" on the web) becomes an issue in the register, matched to the machine by those names. It is one record, not a copy: editing the logbook entry updates the issue, and deleting it or clearing the diesel voids the issue. The logbook's hour meter start is used as the reading. Logbook entries dated before the register's first entry are ignored, because they predate the stock count.

Record each fill in one place only. If the same fill is recorded both ways, the register warns that it looks like a duplicate.

## What the numbers mean

- **Consumption (L/hr or L/km):** from meter readings at fills. The diesel put in from the first reading up to the last fill, divided by the meter difference. It needs at least two fills with readings in the month. Without readings, the logbook's hours are used instead, labelled as only right if every working day is logged.
- **Cost:** each issue is valued at the average rate of the priced purchases up to that date. Purchases entered without a rate are flagged. Until they have one, the month's issued cost covers only part of the litres, and the page and PDF say which part.
- **Warnings:** stock below zero, purchases with no rate, fills with no meter reading, a meter reading lower than the last one, and logbook diesel for a machine not on the list.
- **Days left (the dial):** litres issued per day over the last 14 days, or since the register began if that is sooner, and the stock now divided by that rate. The dial reads 0 to 10+ days: red under 2 days ("Buy diesel now"), amber under 4 ("Running low"), green beyond. It is always worked out to today, whatever month is open. If nothing was issued in that window there is no rate, and the dial says so instead of guessing. It shows days, not how full the tank is, because the store's capacity is not recorded. The website and the app show the same dial.

## Pump account

The site buys its diesel from Hazratbal Filling Station against an advance. The pump account keeps that advance: money paid in, diesel taken, and what is left.

- **Supplier:** the pump is the project's default supplier, with its current price (Rs 96.42 a litre). A purchase that names no supplier, or names the pump, is from the pump. With no price entered, it is priced at the pump's rate and paid from the advance. A supplier typed that is not on the list is not paid from any advance.
- **Payments:** recorded on the website by managers and accounts (NEFT, RTGS, IMPS, UPI, cheque or cash, with the bank reference). The same reference, or the same amount on the same day, is flagged as a possible duplicate. A wrong payment is voided with a reason, never deleted.
- **Diesel before the register:** deliveries from before the stock register began (19 Oct to 17 Nov 2026, 1,450 L) count against the advance but not the stock. Nobody recorded which machines used them.
- **Balance:** paid minus taken, line by line, all time. Negative means the pump was giving credit. The litres it buys at the current rate, and the days those last at the recent rate of issue, are shown with it. It is flagged when it covers under 7 days, or goes negative.
- **Opening import:** the pump's account sheet (HFS_Accounts.xlsx) to 25 Nov 2026: Rs 7,36,229 paid, 3,050 L taken at Rs 96.42 (Rs 2,94,081), Rs 4,42,148 left. The register's 20 and 22 Nov purchases are the sheet's V.No 2109 and 2110, priced only where nobody had entered a price. The 25 Nov 600 L (receipt 4782) is added, or linked if already entered in the app.

## Exports

**PDF:** the month on A4 landscape, with opening and closing stock, every entry with its running balance, totals by machine, diesel into hired machines, and signature lines for the store keeper and site in-charge. **Excel:** the same register as CSV.

## Access

Record: super admin, admin, project manager, engineer, supervisor (the Fleet logbook's roles). Correct, void and manage machines: super admin, admin, project manager. Read: the above plus accounts. Pump payments and the pump's rate: super admin, admin, project manager, accounts, accountant. Every call checks the project assignment.

## Rollout

- `backend/migrations/2026-11-23a-fuel-register.sql` creates `fuel_machines` and `fuel_entries` (additive, idempotent).
- `2026-11-23b-fuel-register-opening.sql` adds the five machines and the spreadsheet's entries for 20–23 Nov 2026, once (fixed ids, only if absent): 20 L opening, 400 L and 600 L purchased with no rate recorded, 720 L issued, leaving 300 L. Anything after the import is entered in the app.

## Verification

- Backend: `npx jest src/fuel src/fleet`. Includes a line-by-line replay of the spreadsheet ending at 300 L.
- Web: `npx vitest run src/pages/fleet`.
- Mobile: `flutter test test/diesel_register_test.dart`. Includes a contract test that parses a real `GET /fuel` response (`test/fixtures/fuel_register_api.json`).
