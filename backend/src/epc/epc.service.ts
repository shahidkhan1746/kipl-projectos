import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BoqItem, BoqCategory } from './boq-item.entity'
import { RaBill, RaBillStatus } from './ra-bill.entity'
import { Measurement } from './measurement.entity'

// ─────────────────────────────────────────────────────────────────────────────
// DAL LAKE BOQ — CORRECTED FROM EXCEL FILES
//
// Allotment Order: CE/UEED/PS/01 OF 2025-26  Dated: 07-11-2025
// Allotted Cost: ₹279.99 Cr (5.904% below advertised ₹297.56 Cr)
//
// Sources:
//   Estimated amounts  → Individual estimate Excel files (1__Sewage_network.xlsx etc.)
//   Quoted amounts     → 00_0_payment_breakup.xlsx + 0_GENERAL_ABSTRACT.xlsx
//
// Structure for RA billing:
//   Part A – Sewer Network  (4 components, paid per metre)
//   Part B – Turnkey Items  (Civil + E&M + O&M, paid per milestone)
// ─────────────────────────────────────────────────────────────────────────────

const DAL_LAKE_BOQ = [

  // ══════════════════════════════════════════════════════════════
  // PART A — SEWER NETWORK & APPURTENANT WORKS
  // Source: 1__Sewage_nework.xlsx  (ABSTRACT sheet)
  // ══════════════════════════════════════════════════════════════

  // ── A1: RCC NP3 Pipes (all dia incl. DI / HDPE) ───────────────
  // Estimated: ₹95.47 Cr  |  Allotment (Quoted): ₹89.84 Cr
  // Total length: 210,020 m (11 diameters: 200–1000mm)
  {
    slNo: 'A1', sorRef: 'NS/IS-458:2003',
    description: 'Providing and Laying non-pressure (NP3) RCC socket & spigot pipes with rubber gasket joint (all dia incl. DI / HDPE) including excavation, bedding, backfilling, temporary surface reinstatement, testing & O&M — complete job as per BOQ',
    unit: 'M',
    category: BoqCategory.SEWER_NETWORK,
    subCategory: 'RCC NP3 Pipes',
    estimatedQty: 210020,
    rate: 4545.24,                        // weighted avg rate
    estimatedAmount: 954741293.39,        // ₹95.47 Cr
    quotedRate: 4277.24,                  // allotment rate (-5.904%)
    quotedAmount: 898365557.84,           // ₹89.84 Cr  ← from payment_breakup.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },

  // ── A2: Manholes (all sizes & depths) ─────────────────────────
  // Estimated: ₹70.28 Cr  |  Allotment: ₹66.13 Cr
  // Includes: RCC manholes 910mm, 1220mm, 1520mm×4950mm, 1520mm×9000mm
  //           + brick masonry manholes
  {
    slNo: 'A2', sorRef: 'Unit Est.',
    description: 'Construction of RCC Manholes / Inspection Chambers of different sizes and depths (all types: 910mm, 1220mm, 1520mm×4950mm, 1520mm×9000mm dia) including excavation, backfilling, temporary surface reinstatement, testing & O&M',
    unit: 'Nos',
    category: BoqCategory.SEWER_NETWORK,
    subCategory: 'Manholes',
    estimatedQty: 3728,                   // 909+481+2071+267 RCC manholes
    rate: 188462.16,                      // weighted avg
    estimatedAmount: 702752222.51,        // ₹70.28 Cr
    quotedRate: 177444.77,               // allotment rate
    quotedAmount: 661255982.92,           // ₹66.13 Cr  ← from payment_breakup.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },

  // ── A3: Drop Arrangements ──────────────────────────────────────
  // Estimated: ₹3.48 Cr  |  Allotment: ₹3.28 Cr
  {
    slNo: 'A3', sorRef: 'Unit Est.',
    description: 'Construction of Drop Arrangement of different dia in Manholes / Inspection Chambers including backfilling, surface reinstatement, disposal of surplus excavated materials within 8Kms, testing & O&M',
    unit: 'M',
    category: BoqCategory.SEWER_NETWORK,
    subCategory: 'Drop Arrangements',
    estimatedQty: 1299.87,
    rate: 26807.78,
    estimatedAmount: 34846788.90,         // ₹3.48 Cr
    quotedRate: 25225.73,
    quotedAmount: 32789149.44,            // ₹3.28 Cr  ← from payment_breakup.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },

  // ── A4: Masonry Chambers ───────────────────────────────────────
  // Estimated: ₹27.51 Cr  |  Allotment: ₹25.89 Cr
  // Includes: 45×45×60cm (12,651 nos) + 60×60×60cm (3,163 nos)
  {
    slNo: 'A4', sorRef: 'Unit Est.',
    description: 'Construction of Masonry Chamber of different sizes (45×45×60cm and 60×60×60cm with CI Cover) for house / property sewer connections including providing & laying UPVC/HDPE connecting pipes, backfilling, surface reinstatement, testing & O&M',
    unit: 'Nos',
    category: BoqCategory.SEWER_NETWORK,
    subCategory: 'Masonry Chambers',
    estimatedQty: 15814,                  // 12651 + 3163
    rate: 17398.35,
    estimatedAmount: 275113279.60,        // ₹27.51 Cr
    quotedRate: 16370.89,
    quotedAmount: 258868341.20,           // ₹25.89 Cr  ← from payment_breakup.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },

  // ══════════════════════════════════════════════════════════════
  // PART B — TURNKEY ITEMS: IPS CIVIL
  // Source: 2__IPS_1.xlsx through 10_IPS_9.xlsx
  //         General Abstract: SPS Civil allotment = ₹834.07 Lakhs total
  // ══════════════════════════════════════════════════════════════

  {
    slNo: 'B1', sorRef: 'Det. Est.',
    description: 'IPS-1 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (2.50m dia × 7.70m depth) at Node 102 including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
    unit: 'LS',
    category: BoqCategory.IPS_CIVIL,
    subCategory: 'IPS-1',
    estimatedQty: 1,
    rate: 2405000,
    estimatedAmount: 2405000,             // ₹24.05 Lakhs
    quotedRate: 2263000,
    quotedAmount: 2263000,                // ₹22.63 Lakhs  ← from 2__IPS_1.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },
  {
    slNo: 'B2', sorRef: 'Det. Est.',
    description: 'IPS-2 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (4.57m × 4.27m pump house) at Node including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
    unit: 'LS',
    category: BoqCategory.IPS_CIVIL,
    subCategory: 'IPS-2',
    estimatedQty: 1,
    rate: 2054000,
    estimatedAmount: 2054000,             // ₹20.54 Lakhs
    quotedRate: 1933000,
    quotedAmount: 1933000,                // ₹19.33 Lakhs  ← from 3__IPS_2.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },
  {
    slNo: 'B3', sorRef: 'Det. Est.',
    description: 'IPS-3 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (5.49m × 10.98m pump house) at Node 1053 including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
    unit: 'LS',
    category: BoqCategory.IPS_CIVIL,
    subCategory: 'IPS-3',
    estimatedQty: 1,
    rate: 3763000,
    estimatedAmount: 3763000,             // ₹37.63 Lakhs
    quotedRate: 3541000,
    quotedAmount: 3541000,                // ₹35.41 Lakhs  ← from 4_IPS_3.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },
  {
    slNo: 'B4', sorRef: 'Det. Est.',
    description: 'IPS-4 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (4.57m × 4.27m pump house) at Node including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
    unit: 'LS',
    category: BoqCategory.IPS_CIVIL,
    subCategory: 'IPS-4',
    estimatedQty: 1,
    rate: 4514000,
    estimatedAmount: 4514000,             // ₹45.14 Lakhs
    quotedRate: 4248000,
    quotedAmount: 4248000,                // ₹42.48 Lakhs  ← from 5_IPS_4.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },
  {
    slNo: 'B5', sorRef: 'Det. Est.',
    description: 'IPS-5 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (5.49m × 10.98m pump house, 8.00m dia × 9.89m depth) at Node 1532 including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
    unit: 'LS',
    category: BoqCategory.IPS_CIVIL,
    subCategory: 'IPS-5',
    estimatedQty: 1,
    rate: 11140000,
    estimatedAmount: 11140000,            // ₹111.40 Lakhs
    quotedRate: 10371000,
    quotedAmount: 10371000,               // ₹103.71 Lakhs  ← from 6_IPS_5.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },
  {
    slNo: 'B6', sorRef: 'Det. Est.',
    description: 'IPS-6 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (5.49m × 10.98m pump house) at Node including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
    unit: 'LS',
    category: BoqCategory.IPS_CIVIL,
    subCategory: 'IPS-6',
    estimatedQty: 1,
    rate: 7127000,
    estimatedAmount: 7127000,             // ₹71.27 Lakhs
    quotedRate: 6706000,
    quotedAmount: 6706000,                // ₹67.06 Lakhs  ← from 7_IPS_6.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },
  {
    slNo: 'B7', sorRef: 'Det. Est.',
    description: 'IPS-7 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (small pump house) at Node including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
    unit: 'LS',
    category: BoqCategory.IPS_CIVIL,
    subCategory: 'IPS-7',
    estimatedQty: 1,
    rate: 1873000,
    estimatedAmount: 1873000,             // ₹18.73 Lakhs
    quotedRate: 1701000,
    quotedAmount: 1701000,                // ₹17.01 Lakhs  ← from 8_IPS_7.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },
  {
    slNo: 'B8', sorRef: 'Det. Est.',
    description: 'IPS-8 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (4.57m × 4.27m pump house) at Node including pump house, sump, valve chamber, screen channel, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
    unit: 'LS',
    category: BoqCategory.IPS_CIVIL,
    subCategory: 'IPS-8',
    estimatedQty: 1,
    rate: 3175000,
    estimatedAmount: 3175000,             // ₹31.75 Lakhs
    quotedRate: 2987000,
    quotedAmount: 2987000,                // ₹29.87 Lakhs  ← from 9_IPS_8.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },
  {
    slNo: 'B9', sorRef: 'Det. Est.',
    description: 'IPS-9 — Survey, Design & Construction of Sewage Pumping Station with Coarse Screen Channel in RCC M-25 (5.49m × 10.98m pump house, 10.00m dia × 10.77m depth, largest) at Node 4011 including pump house, sump, valve chamber, screen channel, DG platform, transformer platform, boundary wall, gate and all allied civil works — turnkey basis including trial run & O&M',
    unit: 'LS',
    category: BoqCategory.IPS_CIVIL,
    subCategory: 'IPS-9',
    estimatedQty: 1,
    rate: 16747000,
    estimatedAmount: 16747000,            // ₹167.47 Lakhs
    quotedRate: 15758000,
    quotedAmount: 15758000,               // ₹157.58 Lakhs  ← from 10_IPS_9.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },
  {
    slNo: 'B10', sorRef: 'Det. Est.',
    description: 'MPS (Main Pumping Station) at Habak + IPS-10 to IPS-13 — Civil construction of remaining intermediate pumping stations and Main Pumping Station including pump houses, screen channels, sumps, valve chambers, boundary walls, gates and all allied civil works — turnkey basis including trial run & O&M',
    unit: 'LS',
    category: BoqCategory.IPS_CIVIL,
    subCategory: 'MPS',
    estimatedQty: 1,
    rate: 26993000,
    estimatedAmount: 26993000,            // ₹269.93 Lakhs (residual: 886.41 - 527.98)
    quotedRate: 25396737,
    quotedAmount: 25396737,               // ₹253.97 Lakhs (residual: 834.07 - 495.08 - 85.32)
    measuredQty: 0,
    measuredAmount: 0,
  },
  {
    slNo: 'B11', sorRef: 'Det. Est.',
    description: 'Compound Walling (750m total) around all IPS/MPS premises in brick masonry with RCC posts, including MS gate and allied works — as per 11__compound_wall.xlsx',
    unit: 'M',
    category: BoqCategory.IPS_CIVIL,
    subCategory: 'Compound Wall',
    estimatedQty: 750,
    rate: 12089.41,
    estimatedAmount: 9067056.20,          // ₹90.67 Lakhs
    quotedRate: 11375.65,
    quotedAmount: 8531737.20,             // ₹85.32 Lakhs  ← from 11__compound_wall.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },

  // ══════════════════════════════════════════════════════════════
  // PART B — TURNKEY ITEMS: STP CIVIL
  // Source: 16__SBR_TANKS.xlsx  +  General Abstract
  // ══════════════════════════════════════════════════════════════
  {
    slNo: 'B12', sorRef: 'Det. Est.',
    description: 'STP 30 MLD — Survey, Design, Engineering, Construction & Commissioning of Sewage Treatment Plant based on SBR Technology (38.50 MLD design capacity for peak flow) including all civil & structural works: screen channel, inlet chamber, SBR tanks, clarifiers, pump houses, administrative cum lab building, staff quarters, campus electrification, boundary wall, pathway, horticulture, water supply, drainage, sewerage, reuse pump station with rising main — complete on turnkey basis including 6-month trial run & 5-year O&M',
    unit: 'LS',
    category: BoqCategory.STP_CIVIL,
    subCategory: 'STP Civil',
    estimatedQty: 1,
    rate: 204000000,
    estimatedAmount: 204000000,           // ₹204.00 Cr (estimated)
    quotedRate: 191954184,
    quotedAmount: 191954184,              // ₹191.95 Cr  ← 1919.54 Lakhs from General Abstract
    measuredQty: 0,
    measuredAmount: 0,
  },

  // ══════════════════════════════════════════════════════════════
  // PART B — TURNKEY ITEMS: STP E&M
  // ══════════════════════════════════════════════════════════════
  {
    slNo: 'B13', sorRef: 'Det. Est.',
    description: 'STP 30 MLD — Electro-Mechanical Components: supply, erection, testing & commissioning of all E&M equipment including submersible pumps, blowers, screens, conveyors, mixers, valves, piping, LT/HT panels, DG set, SCADA, OCEMS (online monitoring at inlet & outlet), automation, instrumentation — complete on turnkey basis including 6-month trial run & 5-year O&M',
    unit: 'LS',
    category: BoqCategory.STP_EM,
    subCategory: 'STP E&M',
    estimatedQty: 1,
    rate: 306000000,
    estimatedAmount: 306000000,           // ₹306.00 Cr (estimated)
    quotedRate: 287931370,
    quotedAmount: 287931370,              // ₹287.93 Cr  ← 2879.31 Lakhs from General Abstract
    measuredQty: 0,
    measuredAmount: 0,
  },

  // ══════════════════════════════════════════════════════════════
  // PART B — TURNKEY ITEMS: IPS E&M
  // Source: General Abstract — SPS E&M allotment = ₹1,685.29 Lakhs
  // ══════════════════════════════════════════════════════════════
  {
    slNo: 'B14', sorRef: 'Det. Est.',
    description: 'All IPS/MPS (1-9 + MPS) — Electro-Mechanical Components: supply, erection, testing & commissioning of all E&M equipment for all 9 IPS + MPS including submersible sewage pumps, raw sewage pumps, coarse screen & conveyor, LT/HT control panels, DG sets, automation/SCADA, instrumentation, piping, valves, lifting arrangements — complete on turnkey basis including 6-month trial run & 5-year O&M',
    unit: 'LS',
    category: BoqCategory.IPS_EM,
    subCategory: 'IPS E&M',
    estimatedQty: 1,
    rate: 179103000,
    estimatedAmount: 179103000,           // ₹179.10 Cr (estimated: 1791.03 Lakhs)
    quotedRate: 168528759,
    quotedAmount: 168528759,              // ₹168.53 Cr  ← 1685.29 Lakhs from General Abstract
    measuredQty: 0,
    measuredAmount: 0,
  },

  // ══════════════════════════════════════════════════════════════
  // PART B — RISING MAINS (IPS 1-13 to MPS/STP)
  // Source: 12__Rising_mains_ips_113.xlsx
  // ══════════════════════════════════════════════════════════════
  {
    slNo: 'B15', sorRef: 'Det. Est.',
    description: 'Rising Mains (IPS 1-13) — Providing, Laying, Jointing, Testing & Commissioning of DI/MS rising main pipes of various dia (100mm, 150mm, 200mm, 300mm, 350mm, 400mm, 500mm, 700mm) from all IPS to MPS/STP including excavation, bedding, backfilling, road cutting & reinstatement, valves, fittings and all allied works — complete incl. O&M for 5 years',
    unit: 'M',
    category: BoqCategory.RISING_MAIN,
    subCategory: 'Rising Mains',
    estimatedQty: 14542,                  // total length all rising mains
    rate: 5044.72,
    estimatedAmount: 73378821.30,         // ₹73.38 Cr  ← from 12__Rising_mains.xlsx
    quotedRate: 4747.53,
    quotedAmount: 69046536.00,            // ₹69.05 Cr  ← from 12__Rising_mains.xlsx (allotment)
    measuredQty: 0,
    measuredAmount: 0,
  },

  // ══════════════════════════════════════════════════════════════
  // PART B — ANCILLARY CIVIL WORKS AT STP
  // ══════════════════════════════════════════════════════════════
  {
    slNo: 'B16', sorRef: 'PAR 2021',
    description: 'Staff Quarters at STP Site — Construction of RCC frame structure staff quarter (85 sqm) as per Plinth Area Rate 2021 including all services (water supply, sanitation, electrical, telephone conduits) — complete as per 13__staff_quarter.xlsx',
    unit: 'LS',
    category: BoqCategory.STP_CIVIL,
    subCategory: 'Staff Quarters',
    estimatedQty: 1,
    rate: 2318375,
    estimatedAmount: 2318375,             // ₹23.18 Lakhs
    quotedRate: 2181498,
    quotedAmount: 2181498,                // ₹21.81 Lakhs  ← from 13__staff_quarter.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },
  {
    slNo: 'B17', sorRef: 'Det. Est.',
    description: 'Treated Effluent Disposal Pipe — Providing & Laying of 1000mm dia NP3 RCC pipe (500m length) from STP outlet to disposal point including excavation, bedding, backfilling, road cutting & reinstatement and all allied civil works — complete as per 14__effulent_disposal_pipe.xlsx',
    unit: 'M',
    category: BoqCategory.STP_CIVIL,
    subCategory: 'Effluent Disposal',
    estimatedQty: 500,
    rate: 12121.79,
    estimatedAmount: 6060896.21,          // ₹60.61 Lakhs civil (civil only)
    quotedRate: 11406.12,
    quotedAmount: 5703061.00,             // ₹57.03 Lakhs  ← from 14__effulent_disposal_pipe.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },
  {
    slNo: 'B18', sorRef: 'Det. Est.',
    description: 'Treated Effluent Disposal Pipe — E&M components (valves, actuators, instrumentation) for treated effluent disposal system',
    unit: 'LS',
    category: BoqCategory.STP_EM,
    subCategory: 'Effluent Disposal E&M',
    estimatedQty: 1,
    rate: 303000,
    estimatedAmount: 303000,              // ₹3.03 Lakhs
    quotedRate: 285110,
    quotedAmount: 285110,                 // ₹2.85 Lakhs  ← General Abstract
    measuredQty: 0,
    measuredAmount: 0,
  },
  {
    slNo: 'B19', sorRef: 'Det. Est.',
    description: 'Approach Road to STP (500m, bituminous) — Construction of approach road including earthwork, graded stone aggregate sub-base, bituminous surface dressing, brick edging and all allied works — complete as per 15__Approach_road.xlsx',
    unit: 'M',
    category: BoqCategory.ROAD_WORK,
    subCategory: 'Approach Road',
    estimatedQty: 500,
    rate: 52900.65,
    estimatedAmount: 2645032.50,          // ₹26.45 Lakhs
    quotedRate: 49777.40,
    quotedAmount: 2488870.00,             // ₹24.89 Lakhs  ← from 15__Approach_road.xlsx
    measuredQty: 0,
    measuredAmount: 0,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT MILESTONES — from official signed schedule (CE/UEED/CJ/CC/4063-64)
// Dated: 14-01-2026
// ─────────────────────────────────────────────────────────────────────────────
const PAYMENT_MILESTONES = {
  sewer_network: [
    { code: 'S1', name: 'Survey & Vetting of Design', pct: 5 },
    { code: 'S2', name: 'Providing & Laying Pipes + Backfilling + Temporary Surface Reinstatement & disposal within 8Kms', pct: 55 },
    { code: 'S3', name: 'Sectional Flow Testing', pct: 10 },
    { code: 'S4', name: 'Permanent Surface Reinstatement of Roads/Lanes to original status & disposal within 8Kms', pct: 20 },
    { code: 'S5', name: 'Testing, Commissioning and Successful Trial Run of Complete Sewerage Network', pct: 5 },
    { code: 'S6', name: 'O&M for 5 Years', pct: 5 },
  ],
  manholes: [
    { code: 'M1', name: 'Survey & Vetting of Design', pct: 5 },
    { code: 'M2', name: 'Construction of RCC Manholes + Backfilling + Temporary Surface Reinstatement & disposal within 8Kms', pct: 65 },
    { code: 'M3', name: 'Permanent Surface Reinstatement of Roads/Lanes to original status & disposal within 8Kms', pct: 20 },
    { code: 'M4', name: 'Testing, Commissioning and Successful Trial Run of Complete Sewerage Network', pct: 5 },
    { code: 'M5', name: 'O&M for 5 Years', pct: 5 },
  ],
  drop_arrangements: [
    { code: 'D1', name: 'Survey & Vetting of Design', pct: 5 },
    { code: 'D2', name: 'Construction of Drop Arrangement + Backfilling + Surface Reinstatement & disposal within 8Kms', pct: 65 },
    { code: 'D3', name: 'Permanent Surface Reinstatement of Roads/Lanes to original status & disposal within 8Kms', pct: 20 },
    { code: 'D4', name: 'Testing, Commissioning and Successful Trial Run of Complete Sewerage Network', pct: 5 },
    { code: 'D5', name: 'O&M for 5 Years', pct: 5 },
  ],
  masonry_chambers: [
    { code: 'C1', name: 'Survey & Vetting of Design', pct: 5 },
    { code: 'C2', name: 'Construction of Masonry Chamber + Backfilling + Surface Reinstatement & disposal within 8Kms', pct: 30 },
    { code: 'C3', name: 'Providing & Laying of Sewer Pipes + Backfilling + Surface Reinstatement & disposal within 8Kms', pct: 35 },
    { code: 'C4', name: 'Permanent Surface Reinstatement of Roads/Lanes to original status & disposal within 8Kms', pct: 20 },
    { code: 'C5', name: 'Testing, Commissioning and Successful Trial Run of Complete Sewerage Network', pct: 5 },
    { code: 'C6', name: 'O&M for 5 Years', pct: 5 },
  ],
  civil_turnkey: [
    { code: 'T1', name: 'Survey & Vetting of Design', pct: 5 },
    { code: 'T2', name: 'Building Work up to Plinth Level or 25% Completion of Civil Structure Work', pct: 20 },
    { code: 'T3', name: '60% Completion of Building Work or Civil Structure Work', pct: 30 },
    { code: 'T4', name: 'Complete Finishing of Building Work and Civil Structure Works as per Approved Drawings & Specifications', pct: 30 },
    { code: 'T5', name: "Testing & Commissioning of STP's/IPS's", pct: 5 },
    { code: 'T6', name: 'After Issuance of Completion Certificate by UEED', pct: 5 },
    { code: 'T7', name: 'O&M for 5 Years', pct: 5 },
  ],
  electro_mechanical: [
    // ✅ OFFICIAL SIGNED SCHEDULE 14-01-2026: 40% delivery, 25% installation
    { code: 'E1', name: 'Delivery of Electro-Mechanical Components at Site after TPI', pct: 40 },
    { code: 'E2', name: 'Installation, Erection & Testing of Electro-Mechanical Components at Site', pct: 25 },
    { code: 'E3', name: 'Commissioning of Electro-Mechanical Components at Site', pct: 10 },
    { code: 'E4', name: 'Successful Completion of Six Months Free Trial Run', pct: 10 },
    { code: 'E5', name: 'Successful Completion of Defect Liability Period', pct: 10 },
    { code: 'E6', name: 'O&M for 5 Years', pct: 5 },
  ],
  om_component: [
    { code: 'O1', name: '1st Year O&M', pct: 0.5 },
    { code: 'O2', name: '2nd Year O&M', pct: 0.5 },
    { code: 'O3', name: '3rd Year O&M', pct: 1.0 },
    { code: 'O4', name: '4th Year O&M', pct: 1.5 },
    { code: 'O5', name: '5th Year O&M', pct: 1.5 },
  ],
}

@Injectable()
export class EpcService {
  constructor(
    @InjectRepository(BoqItem)     private readonly boqRepo:  Repository<BoqItem>,
    @InjectRepository(RaBill)      private readonly raRepo:   Repository<RaBill>,
    @InjectRepository(Measurement) private readonly mbRepo:   Repository<Measurement>,
  ) {}

  getPaymentMilestones() { return PAYMENT_MILESTONES }

  // ── BOQ Items ──────────────────────────────────────────────────────────────

  async seedBoqItems(projectId: string, force = false): Promise<{ seeded: number }> {
    if (force) {
      await this.boqRepo.delete({ projectId })
    } else {
      const existing = await this.boqRepo.count({ where: { projectId } })
      if (existing > 0) return { seeded: 0 }
    }
    const items = DAL_LAKE_BOQ.map(item => this.boqRepo.create({ ...item, projectId }))
    await this.boqRepo.save(items)
    return { seeded: items.length }
  }

  async listBoqItems(projectId: string, category?: string) {
    const qb = this.boqRepo.createQueryBuilder('b')
      .where('b.projectId = :pid', { pid: projectId })
      .andWhere('b.isActive = true')
      .orderBy('b.slNo', 'ASC')
    if (category) qb.andWhere('b.category = :cat', { cat: category })
    return qb.getMany()
  }

  async createBoqItem(data: Partial<BoqItem>): Promise<BoqItem> {
    return this.boqRepo.save(this.boqRepo.create(data))
  }

  async updateBoqItem(id: string, data: Partial<BoqItem>): Promise<BoqItem> {
    await this.boqRepo.update(id, data)
    const item = await this.boqRepo.findOne({ where: { id } })
    if (!item) throw new NotFoundException('BOQ item not found')
    return item
  }

  async updateMeasuredQty(id: string, measuredQty: number): Promise<BoqItem> {
    const item = await this.boqRepo.findOne({ where: { id } })
    if (!item) throw new NotFoundException('BOQ item not found')
    const measuredAmount = measuredQty * Number(item.rate)
    await this.boqRepo.update(id, { measuredQty, measuredAmount })
    return this.boqRepo.findOne({ where: { id } }) as Promise<BoqItem>
  }

  // Save quoted rate to all BOQ items in a category/subCategory
  // Called when user manually enters quoted rate in RA Bill wizard
  // So future bills auto-fill the field
  async saveQuotedRateByCategory(
    projectId: string,
    category: string,
    subCategory: string,
    quotedAmount: number,
  ): Promise<void> {
    const items = await this.boqRepo.find({
      where: { projectId, category: category as any, subCategory, isActive: true },
    })
    if (items.length === 0) return
    // Distribute quoted amount proportionally by estimated amount
    const totalEst = items.reduce((s, i) => s + Number(i.estimatedAmount), 0)
    for (const item of items) {
      const proportion = totalEst > 0
        ? Number(item.estimatedAmount) / totalEst
        : 1 / items.length
      await this.boqRepo.update(item.id, {
        quotedAmount: quotedAmount * proportion,
        quotedRate: (quotedAmount * proportion) / Number(item.estimatedQty || 1),
      })
    }
  }

  async boqSummary(projectId: string) {
    const items = await this.listBoqItems(projectId)
    const totalEstimated  = items.reduce((s, i) => s + Number(i.estimatedAmount), 0)
    const totalQuoted     = items.reduce((s, i) => s + Number(i.quotedAmount || i.estimatedAmount), 0)
    const totalMeasured   = items.reduce((s, i) => s + Number(i.measuredAmount), 0)

    const byCategory: Record<string, any> = {}
    for (const item of items) {
      const cat = item.category
      if (!byCategory[cat]) byCategory[cat] = { estimated: 0, quoted: 0, measured: 0, items: 0 }
      byCategory[cat].estimated += Number(item.estimatedAmount)
      byCategory[cat].quoted    += Number(item.quotedAmount || item.estimatedAmount)
      byCategory[cat].measured  += Number(item.measuredAmount)
      byCategory[cat].items++
    }

    const raBills = await this.raRepo.find({ where: { projectId } })
    const totalBilled = raBills
      .filter(b => b.status !== RaBillStatus.REJECTED)
      .reduce((s, b) => s + Number(b.netPayable), 0)

    return {
      totalEstimated,
      totalQuoted,
      totalMeasured,
      percentageComplete: totalQuoted > 0
        ? (totalMeasured / totalQuoted * 100).toFixed(2)
        : '0',
      totalBilled,
      balance: totalQuoted - totalBilled,
      items: items.length,
      byCategory,
      raBills: raBills.length,
    }
  }

  // ── RA Bills ───────────────────────────────────────────────────────────────

  async createRaBill(data: Partial<RaBill>): Promise<RaBill> {
    const gross = Number(data.grossAmount ?? 0)
    const prevBilled = Number(data.prevBilled ?? 0)
    const netThisBill = gross - prevBilled
    const gstPct = Number(data.gstPct ?? 0)
    const tdsPct = Number(data.tdsPct ?? 2)
    const sdPct  = Number(data.securityDepositPct ?? 5)
    const gstAmt = netThisBill * gstPct / 100
    const tdsAmt = (netThisBill + gstAmt) * tdsPct / 100
    const sdAmt  = netThisBill * sdPct / 100
    const netPayable = netThisBill + gstAmt - tdsAmt - sdAmt

    return this.raRepo.save(this.raRepo.create({
      ...data,
      netThisBill,
      gstAmount: gstAmt,
      tdsAmount: tdsAmt,
      securityDepositAmount: sdAmt,
      netPayable,
    }))
  }

  async deleteRaBill(id: string): Promise<{ deleted: boolean }> {
    const bill = await this.raRepo.findOne({ where: { id } })
    if (!bill) throw new NotFoundException('RA Bill not found')
    // allow delete on any status during testing
    await this.raRepo.delete(id)
    return { deleted: true }
  }

  async updateRaBill(id: string, data: Partial<RaBill>): Promise<RaBill> {
    const bill = await this.raRepo.findOne({ where: { id } })
    if (!bill) throw new NotFoundException('RA Bill not found')
    await this.raRepo.update(id, data)
    return this.getRaBill(id)
  }

  async listRaBills(projectId: string) {
    return this.raRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    })
  }

  async getRaBill(id: string): Promise<RaBill> {
    const bill = await this.raRepo.findOne({ where: { id } })
    if (!bill) throw new NotFoundException('RA Bill not found')
    return bill
  }

  async updateRaBillStatus(id: string, status: RaBillStatus, remarks?: string): Promise<RaBill> {
    const update: any = { status }
    if (status === RaBillStatus.SUBMITTED) update.submittedDate = new Date().toISOString().split('T')[0]
    if (status === RaBillStatus.APPROVED)  update.approvedDate  = new Date().toISOString().split('T')[0]
    if (status === RaBillStatus.PAID)      update.paidDate      = new Date().toISOString().split('T')[0]
    if (remarks) update.remarks = remarks
    await this.raRepo.update(id, update)
    return this.getRaBill(id)
  }

  // ── Measurement Book ───────────────────────────────────────────────────────

  async addMeasurement(data: Partial<Measurement>): Promise<Measurement> {
    const m = await this.mbRepo.save(this.mbRepo.create(data))
    const all = await this.mbRepo.find({ where: { boqItemId: data.boqItemId } })
    const totalQty = all.reduce((s, mb) => s + Number(mb.totalQty), 0)
    await this.updateMeasuredQty(data.boqItemId!, totalQty)
    return m
  }

  async listMeasurements(p: { projectId?: string; boqItemId?: string; raBillId?: string }) {
    const qb = this.mbRepo.createQueryBuilder('m').orderBy('m.date', 'DESC')
    if (p.projectId)  qb.andWhere('m.projectId = :pid', { pid: p.projectId })
    if (p.boqItemId)  qb.andWhere('m.boqItemId = :bid', { bid: p.boqItemId })
    if (p.raBillId)   qb.andWhere('m.raBillId = :rid', { rid: p.raBillId })
    return qb.getMany()
  }
}
