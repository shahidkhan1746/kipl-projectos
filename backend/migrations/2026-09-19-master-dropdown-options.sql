-- Migration: 2026-09-19-master-dropdown-options.sql
-- Description: Central Master Data & Dropdown Options engine

CREATE TABLE IF NOT EXISTS master_dropdown_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dropdown_type VARCHAR(64) NOT NULL, -- 'material', 'unit', 'equipment_type', 'site_zone', 'stakeholder'
  label VARCHAR(255) NOT NULL,
  value VARCHAR(255) NOT NULL,
  category VARCHAR(64), -- For materials: 'cement_steel', 'pipes_fittings', 'aggregate_sand', 'chemicals', 'other'
  unit VARCHAR(32), -- Default unit for materials
  spec TEXT, -- IS code or technical specification
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb, -- Store aliases, extra metadata
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_dropdown_type_value UNIQUE (dropdown_type, value)
);

CREATE INDEX IF NOT EXISTS idx_mdo_type_active ON master_dropdown_options (dropdown_type, is_active);
CREATE INDEX IF NOT EXISTS idx_mdo_type_category ON master_dropdown_options (dropdown_type, category);

-- 1. SEED UNITS OF MEASUREMENT
INSERT INTO master_dropdown_options (dropdown_type, label, value, display_order)
VALUES
  ('unit', 'Cu.m (Cubic Metre)', 'Cu.m', 1),
  ('unit', 'MT (Metric Tonne)', 'MT', 2),
  ('unit', 'KG (Kilogram)', 'KG', 3),
  ('unit', 'Nos (Numbers)', 'Nos', 4),
  ('unit', 'Bags (Cement / Grout)', 'Bags', 5),
  ('unit', 'Rmt (Running Metre)', 'Rmt', 6),
  ('unit', 'Litre (Liquid)', 'Litre', 7),
  ('unit', 'Litres (Liquid)', 'Litres', 8),
  ('unit', 'Trip (Truck / Dumper)', 'Trip', 9),
  ('unit', 'Brass (100 Cu.ft)', 'Brass', 10),
  ('unit', 'Sets (Assembly / Fitting)', 'Sets', 11),
  ('unit', 'Sqm (Square Metre)', 'Sqm', 12)
ON CONFLICT (dropdown_type, value) DO UPDATE
SET label = EXCLUDED.label, display_order = EXCLUDED.display_order;

-- 2. SEED EQUIPMENT TYPES
INSERT INTO master_dropdown_options (dropdown_type, label, value, display_order)
VALUES
  ('equipment_type', 'Excavator', 'Excavator', 1),
  ('equipment_type', 'Tipper / Dumper', 'Tipper/Dumper', 2),
  ('equipment_type', 'JCB / Backhoe Loader', 'JCB / Backhoe', 3),
  ('equipment_type', 'Transit Mixer', 'Transit Mixer', 4),
  ('equipment_type', 'Concrete Mixer', 'Concrete Mixer', 5),
  ('equipment_type', 'Needle / Surface Vibrator', 'Vibrator', 6),
  ('equipment_type', 'Water Tanker', 'Water Tanker', 7),
  ('equipment_type', 'Soil Compactor / Roller', 'Compactor', 8),
  ('equipment_type', 'Hydra / Mobile Crane', 'Crane', 9),
  ('equipment_type', 'Diesel Generator (DG Set)', 'Generator', 10),
  ('equipment_type', 'Dewatering Pump', 'Pump', 11),
  ('equipment_type', 'Pipe Laying Machine / Trench Box', 'Pipe Laying Machine', 12),
  ('equipment_type', 'Other Plant & Machinery', 'Other', 99)
ON CONFLICT (dropdown_type, value) DO UPDATE
SET label = EXCLUDED.label, display_order = EXCLUDED.display_order;

-- 3. SEED SITE ZONES & LOCATIONS
INSERT INTO master_dropdown_options (dropdown_type, label, value, display_order)
VALUES
  ('site_zone', 'IPS-1 (Node 102)', 'IPS-1 (Node 102)', 1),
  ('site_zone', 'IPS-2 (Node 702)', 'IPS-2 (Node 702)', 2),
  ('site_zone', 'IPS-3 (Node 1053)', 'IPS-3 (Node 1053)', 3),
  ('site_zone', 'IPS-4 (Node 1266)', 'IPS-4 (Node 1266)', 4),
  ('site_zone', 'IPS-5 (Node 1532)', 'IPS-5 (Node 1532)', 5),
  ('site_zone', 'IPS-6 (Node 1763)', 'IPS-6 (Node 1763)', 6),
  ('site_zone', 'IPS-7 (Node 2670)', 'IPS-7 (Node 2670)', 7),
  ('site_zone', 'IPS-8 (Node 3561)', 'IPS-8 (Node 3561)', 8),
  ('site_zone', 'IPS-9 (Node 4011)', 'IPS-9 (Node 4011)', 9),
  ('site_zone', 'MPS (Habak)', 'MPS (Habak)', 10),
  ('site_zone', 'STP Site (Nishat)', 'STP Site', 11),
  ('site_zone', 'Rising Main Corridor', 'Rising Main', 12),
  ('site_zone', 'General Site Area', 'General Site', 13)
ON CONFLICT (dropdown_type, value) DO UPDATE
SET label = EXCLUDED.label, display_order = EXCLUDED.display_order;

-- 4. SEED STAKEHOLDERS & AGENCIES
INSERT INTO master_dropdown_options (dropdown_type, label, value, display_order)
VALUES
  ('stakeholder', 'J&K UEED (Employer)', 'UEED', 1),
  ('stakeholder', 'LCMA (Lake Authority)', 'LCMA', 2),
  ('stakeholder', 'NIT Srinagar (Third Party QA)', 'NIT Srinagar', 3),
  ('stakeholder', 'AMRUT Mission Directorate', 'AMRUT', 4),
  ('stakeholder', 'J&K Forest Department', 'Forest Department', 5),
  ('stakeholder', 'Srinagar Municipal Corporation (SMC)', 'SMC', 6),
  ('stakeholder', 'Deputy Commissioner Office Srinagar', 'DC Office', 7),
  ('stakeholder', 'Public Works Department (PWD)', 'PWD', 8),
  ('stakeholder', 'Traffic Police Srinagar', 'Traffic Police', 9),
  ('stakeholder', 'IRMA (Independent Reviewing Agency)', 'IRMA', 10),
  ('stakeholder', 'Keller Ground Engineering Pvt Ltd', 'Keller Ground Engineering Pvt Ltd', 11),
  ('stakeholder', 'Wani Infrastructure Pvt Ltd', 'Wani Infrastructure Pvt Ltd', 12),
  ('stakeholder', 'Project Management Consultant', 'Consultant', 13),
  ('stakeholder', 'J&K Bank Ltd', 'J&K Bank', 14),
  ('stakeholder', 'Khilari Infrastructure Pvt. Ltd. (Contractor)', 'KIPL', 15)
ON CONFLICT (dropdown_type, value) DO UPDATE
SET label = EXCLUDED.label, display_order = EXCLUDED.display_order;

-- 5. SEED MATERIALS & SPECIFICATIONS
-- Cement & Steel
INSERT INTO master_dropdown_options (dropdown_type, label, value, category, unit, spec, metadata, display_order)
VALUES
  ('material', 'TMT SAIL BARS 8MM', 'TMT SAIL BARS 8MM', 'cement_steel', 'KG', 'Fe500D TMT, IS 1786, seismic Zone V', '{"aliases": ["8mm tmt", "8mm rebar", "tmt 8mm"]}'::jsonb, 1),
  ('material', 'TMT SAIL BARS 10MM', 'TMT SAIL BARS 10MM', 'cement_steel', 'KG', 'Fe500D TMT, IS 1786', '{"aliases": ["10mm tmt", "10mm rebar", "tmt 10mm"]}'::jsonb, 2),
  ('material', 'TMT SAIL BARS 12MM', 'TMT SAIL BARS 12MM', 'cement_steel', 'KG', 'Fe500D TMT, IS 1786', '{"aliases": ["12mm tmt", "12mm rebar", "tmt 12mm"]}'::jsonb, 3),
  ('material', 'TMT SAIL BARS 16MM', 'TMT SAIL BARS 16MM', 'cement_steel', 'KG', 'Fe500D TMT, IS 1786, main reinforcement', '{"aliases": ["16mm tmt", "16mm rebar", "tmt 16mm"]}'::jsonb, 4),
  ('material', 'TMT SAIL BARS 20MM', 'TMT SAIL BARS 20MM', 'cement_steel', 'KG', 'Fe500D TMT, IS 1786', '{"aliases": ["20mm tmt", "20mm rebar", "tmt 20mm"]}'::jsonb, 5),
  ('material', 'TMT SAIL BARS 25MM', 'TMT SAIL BARS 25MM', 'cement_steel', 'KG', 'Fe500D TMT, IS 1786', '{"aliases": ["25mm tmt", "25mm rebar", "tmt 25mm"]}'::jsonb, 6),
  ('material', 'TMT SAIL BARS 32MM', 'TMT SAIL BARS 32MM', 'cement_steel', 'KG', 'Fe500D TMT, IS 1786, raft / column', '{"aliases": ["32mm tmt", "32mm rebar", "tmt 32mm"]}'::jsonb, 7),
  ('material', 'TMT Steel Fe500D (Jindal/SAIL)', 'TMT Steel Fe500D (Jindal/SAIL)', 'cement_steel', 'MT', 'High ductile TMT, IS 1786', '{"aliases": ["tmt steel", "jindal tmt", "sail tmt", "fe500d"]}'::jsonb, 8),
  ('material', 'Structural Steel (Angles/Channels IS 2062)', 'Structural Steel (Angles/Channels IS 2062)', 'cement_steel', 'MT', 'Angles, channels, beams, IS 2062 Grade E250', '{"aliases": ["structural steel", "ms angle", "ms channel", "is 2062"]}'::jsonb, 9),
  ('material', 'Binding Wire (18 Gauge)', 'Binding Wire (18 Gauge)', 'cement_steel', 'KG', 'Annealed galvanized binding wire 18 gauge', '{"aliases": ["binding wire", "gi wire", "wire 18g"]}'::jsonb, 10),
  ('material', 'OPC Cement 43 Grade (IS 269)', 'OPC Cement 43 Grade (IS 269)', 'cement_steel', 'Bags', '50 kg bags, IS 8112 / IS 269', '{"aliases": ["opc 43", "opc cement 43", "cement 43"]}'::jsonb, 11),
  ('material', 'OPC Cement 53 Grade (IS 269)', 'OPC Cement 53 Grade (IS 269)', 'cement_steel', 'Bags', '50 kg bags, IS 12269 / IS 269', '{"aliases": ["opc 53", "opc cement 53", "cement 53"]}'::jsonb, 12),
  ('material', 'PPC Cement (IS 1489)', 'PPC Cement (IS 1489)', 'cement_steel', 'Bags', 'Fly-ash blended, 50 kg bags, IS 1489 Part 1', '{"aliases": ["ppc", "ppc cement", "blended cement"]}'::jsonb, 13),
  ('material', 'Concrete Cover Blocks 40mm/50mm', 'Concrete Cover Blocks 40mm/50mm', 'cement_steel', 'Nos', 'High strength precast mortar cover blocks', '{"aliases": ["cover blocks", "cover block 40mm", "cover block 50mm"]}'::jsonb, 14)
ON CONFLICT (dropdown_type, value) DO UPDATE
SET label = EXCLUDED.label, category = EXCLUDED.category, unit = EXCLUDED.unit, spec = EXCLUDED.spec, metadata = EXCLUDED.metadata;

-- Pipes & Fittings
INSERT INTO master_dropdown_options (dropdown_type, label, value, category, unit, spec, metadata, display_order)
VALUES
  ('material', 'DI K9 Pipe 150mm dia (IS 8329)', 'DI K9 Pipe 150mm dia (IS 8329)', 'pipes_fittings', 'Rmt', 'Centrifugally cast ductile iron K9 pipe', '{"aliases": ["di pipe 150mm", "150mm di pipe", "di k9 150"]}'::jsonb, 15),
  ('material', 'DI K9 Pipe 200mm dia (IS 8329)', 'DI K9 Pipe 200mm dia (IS 8329)', 'pipes_fittings', 'Rmt', 'Centrifugally cast ductile iron K9 pipe', '{"aliases": ["di pipe 200mm", "200mm di pipe", "di k9 200"]}'::jsonb, 16),
  ('material', 'DI K9 Pipe 250mm dia (IS 8329)', 'DI K9 Pipe 250mm dia (IS 8329)', 'pipes_fittings', 'Rmt', 'Centrifugally cast ductile iron K9 pipe', '{"aliases": ["di pipe 250mm", "250mm di pipe", "di k9 250"]}'::jsonb, 17),
  ('material', 'DI K9 Pipe 300mm dia (IS 8329)', 'DI K9 Pipe 300mm dia (IS 8329)', 'pipes_fittings', 'Rmt', 'Centrifugally cast ductile iron K9 pipe', '{"aliases": ["di pipe 300mm", "300mm di pipe", "di k9 300"]}'::jsonb, 18),
  ('material', 'DI K9 Pipe 400mm dia (IS 8329)', 'DI K9 Pipe 400mm dia (IS 8329)', 'pipes_fittings', 'Rmt', 'Centrifugally cast ductile iron K9 pipe', '{"aliases": ["di pipe 400mm", "400mm di pipe", "di k9 400"]}'::jsonb, 19),
  ('material', 'HDPE Pipe 110mm OD PN6 PE100', 'HDPE Pipe 110mm OD PN6 PE100', 'pipes_fittings', 'Rmt', 'High density polyethylene, IS 4984', '{"aliases": ["hdpe 110mm", "110mm hdpe", "hdpe pipe 110"]}'::jsonb, 20),
  ('material', 'HDPE Pipe 160mm OD PN6 PE100', 'HDPE Pipe 160mm OD PN6 PE100', 'pipes_fittings', 'Rmt', 'High density polyethylene, IS 4984', '{"aliases": ["hdpe 160mm", "160mm hdpe", "hdpe pipe 160"]}'::jsonb, 21),
  ('material', 'HDPE Pipe 200mm OD PN10 PE100', 'HDPE Pipe 200mm OD PN10 PE100', 'pipes_fittings', 'Rmt', 'High density polyethylene, IS 4984', '{"aliases": ["hdpe 200mm", "200mm hdpe", "hdpe pipe 200"]}'::jsonb, 22),
  ('material', 'RCC NP3 Pipe 200mm dia (IS 458)', 'RCC NP3 Pipe 200mm dia (IS 458)', 'pipes_fittings', 'Rmt', 'Reinforced concrete pipe class NP3', '{"aliases": ["np3 200mm", "rcc pipe 200", "np3 pipe 200"]}'::jsonb, 23),
  ('material', 'RCC NP3 Pipe 300mm dia (IS 458)', 'RCC NP3 Pipe 300mm dia (IS 458)', 'pipes_fittings', 'Rmt', 'Reinforced concrete pipe class NP3', '{"aliases": ["np3 300mm", "rcc pipe 300", "np3 pipe 300"]}'::jsonb, 24),
  ('material', 'RCC NP3 Pipe 450mm dia (IS 458)', 'RCC NP3 Pipe 450mm dia (IS 458)', 'pipes_fittings', 'Rmt', 'Reinforced concrete pipe class NP3', '{"aliases": ["np3 450mm", "rcc pipe 450", "np3 pipe 450"]}'::jsonb, 25),
  ('material', 'RCC NP3 Pipe 600mm dia (IS 458)', 'RCC NP3 Pipe 600mm dia (IS 458)', 'pipes_fittings', 'Rmt', 'Reinforced concrete pipe class NP3', '{"aliases": ["np3 600mm", "rcc pipe 600", "np3 pipe 600"]}'::jsonb, 26),
  ('material', 'Sluice Valve 150mm PN 1.0 (IS 14846)', 'Sluice Valve 150mm PN 1.0 (IS 14846)', 'pipes_fittings', 'Nos', 'Cast iron / ductile iron sluice valve IS 14846', '{"aliases": ["sluice valve 150", "valve 150mm", "gate valve 150"]}'::jsonb, 27),
  ('material', 'Sluice Valve 200mm PN 1.0 (IS 14846)', 'Sluice Valve 200mm PN 1.0 (IS 14846)', 'pipes_fittings', 'Nos', 'Cast iron / ductile iron sluice valve IS 14846', '{"aliases": ["sluice valve 200", "valve 200mm", "gate valve 200"]}'::jsonb, 28),
  ('material', 'Non-Return (Check) Valve 150mm', 'Non-Return (Check) Valve 150mm', 'pipes_fittings', 'Nos', 'Dual plate / swing check non-return valve', '{"aliases": ["nrv 150", "check valve 150", "non return valve 150"]}'::jsonb, 29),
  ('material', 'Non-Return (Check) Valve 200mm', 'Non-Return (Check) Valve 200mm', 'pipes_fittings', 'Nos', 'Dual plate / swing check non-return valve', '{"aliases": ["nrv 200", "check valve 200", "non return valve 200"]}'::jsonb, 30),
  ('material', 'Air Release Valve 50mm Double Orifice', 'Air Release Valve 50mm Double Orifice', 'pipes_fittings', 'Nos', 'Kinetic double orifice air valve, IS 14845', '{"aliases": ["air valve 50mm", "air release valve", "kinetic air valve"]}'::jsonb, 31),
  ('material', 'DI Dismantling Joint 150mm', 'DI Dismantling Joint 150mm', 'pipes_fittings', 'Nos', 'Ductile iron dismantling joint with tie rods', '{"aliases": ["dismantling joint 150", "dj 150mm"]}'::jsonb, 32)
ON CONFLICT (dropdown_type, value) DO UPDATE
SET label = EXCLUDED.label, category = EXCLUDED.category, unit = EXCLUDED.unit, spec = EXCLUDED.spec, metadata = EXCLUDED.metadata;

-- Aggregates & Sand
INSERT INTO master_dropdown_options (dropdown_type, label, value, category, unit, spec, metadata, display_order)
VALUES
  ('material', 'Coarse Aggregate 10mm Graded (IS 383)', 'Coarse Aggregate 10mm Graded (IS 383)', 'aggregate_sand', 'Cu.m', '10mm single graded aggregate for concrete, IS 383', '{"aliases": ["10mm aggregate", "10mm bajri", "aggregate 10mm"]}'::jsonb, 33),
  ('material', 'Coarse Aggregate 20mm Graded (IS 383)', 'Coarse Aggregate 20mm Graded (IS 383)', 'aggregate_sand', 'Cu.m', '20mm graded aggregate for RCC, IS 383', '{"aliases": ["20mm aggregate", "20mm bajri", "aggregate 20mm"]}'::jsonb, 34),
  ('material', 'Coarse Aggregate 40mm Graded', 'Coarse Aggregate 40mm Graded', 'aggregate_sand', 'Cu.m', '40mm graded coarse aggregate for PCC, IS 383', '{"aliases": ["40mm aggregate", "40mm bajri", "aggregate 40mm"]}'::jsonb, 35),
  ('material', 'Coarse Aggregate 63mm Graded', 'Coarse Aggregate 63mm Graded', 'aggregate_sand', 'Cu.m', '63mm single graded coarse aggregate, IS 383', '{"aliases": ["63mm graded", "63 mm graded", "63mm aggregate", "63 mm", "63mm"]}'::jsonb, 36),
  ('material', '63mm Downgrade', '63mm Downgrade', 'aggregate_sand', 'Cu.m', '63mm down graded aggregate for sub-base / WBM / soling', '{"aliases": ["63 mm downgrade", "63mm downgrade aggregate", "coarse aggregate 63mm downgrade", "63mm d/g", "downgrade 63mm"]}'::jsonb, 37),
  ('material', 'Coarse Aggregate 70–80mm Oversized', 'Coarse Aggregate 70–80mm Oversized', 'aggregate_sand', 'Cu.m', 'Oversized stone ballast / pitching stone', '{"aliases": ["70mm aggregate", "80mm aggregate", "oversized aggregate"]}'::jsonb, 38),
  ('material', 'Fine River Sand (Zone II IS 383)', 'Fine River Sand (Zone II IS 383)', 'aggregate_sand', 'Cu.m', 'Clean natural river sand Zone II for plaster / RCC, IS 383', '{"aliases": ["river sand", "sand zone 2", "fine sand"]}'::jsonb, 39),
  ('material', 'Coarse Sand', 'Coarse Sand', 'aggregate_sand', 'Cu.m', 'Coarse washed sand for concrete / bedding', '{"aliases": ["coarse sand", "concrete sand"]}'::jsonb, 40),
  ('material', 'Khak Bajri', 'Khak Bajri', 'aggregate_sand', 'Cu.m', 'Crusher dust / fine stone dust for leveling, bedding and masonry', '{"aliases": ["khak bajri", "khaka bajri", "khakha bajri", "khak-bajri", "khakbajri", "crusher dust"]}'::jsonb, 41),
  ('material', 'Stone Dust / Crushed Sand', 'Stone Dust / Crushed Sand', 'aggregate_sand', 'Cu.m', 'Manufactured sand / quarry dust (IS 383)', '{"aliases": ["stone dust", "crushed sand", "m-sand"]}'::jsonb, 42),
  ('material', 'Granular Sub-Base (GSB) Material', 'Granular Sub-Base (GSB) Material', 'aggregate_sand', 'Cu.m', 'Graded natural gravel/crushed stone GSB MORTH Table 400-1', '{"aliases": ["gsb", "gsb material", "granular sub-base"]}'::jsonb, 43),
  ('material', 'Wet Mix Macadam (WMM)', 'Wet Mix Macadam (WMM)', 'aggregate_sand', 'Cu.m', 'Plant mixed crushed stone aggregate with controlled water, MORTH 406', '{"aliases": ["wmm", "wet mix macadam", "wmm mix"]}'::jsonb, 44),
  ('material', 'Soling Stone / Boulders', 'Soling Stone / Boulders', 'aggregate_sand', 'Cu.m', 'Hard sound angular boulders 150–250mm for foundation soling', '{"aliases": ["soling stone", "boulders", "stone boulders"]}'::jsonb, 45)
ON CONFLICT (dropdown_type, value) DO UPDATE
SET label = EXCLUDED.label, category = EXCLUDED.category, unit = EXCLUDED.unit, spec = EXCLUDED.spec, metadata = EXCLUDED.metadata;

-- Chemicals & Admixtures
INSERT INTO master_dropdown_options (dropdown_type, label, value, category, unit, spec, metadata, display_order)
VALUES
  ('material', 'Integral Liquid Waterproofing Compound', 'Integral Liquid Waterproofing Compound', 'chemicals', 'Litres', 'IS 2645 certified waterproofing admixture for concrete', '{"aliases": ["waterproofing compound", "dr fixit", "waterproofing liquid"]}'::jsonb, 46),
  ('material', 'Superplasticizer & Retarder (IS 9103)', 'Superplasticizer & Retarder (IS 9103)', 'chemicals', 'Litres', 'Polycarboxylate ether (PCE) based admixture for slump retention', '{"aliases": ["superplasticizer", "admixture", "retarder", "pce"]}'::jsonb, 47),
  ('material', 'Aluminised Curing Compound', 'Aluminised Curing Compound', 'chemicals', 'Litres', 'Reflective membrane curing compound ASTM C309', '{"aliases": ["curing compound", "concrete curing agent"]}'::jsonb, 48),
  ('material', 'Non-Shrink Micro-Concrete / Grout', 'Non-Shrink Micro-Concrete / Grout', 'chemicals', 'Bags', 'High strength free-flow cementitious grout for machinery base', '{"aliases": ["micro concrete", "non shrink grout", "grout bags"]}'::jsonb, 49),
  ('material', 'Polysulphide Joint Sealant', 'Polysulphide Joint Sealant', 'chemicals', 'KG', 'Two-component pourable elastomeric joint sealant BS 4254', '{"aliases": ["joint sealant", "polysulphide", "sealant"]}'::jsonb, 50),
  ('material', 'Bitumen', 'Bitumen', 'chemicals', 'KG', 'Paving bitumen VG-30 / VG-10 for road surfacing, IS 73', '{"aliases": ["bitumen", "tar", "asphalt"]}'::jsonb, 51)
ON CONFLICT (dropdown_type, value) DO UPDATE
SET label = EXCLUDED.label, category = EXCLUDED.category, unit = EXCLUDED.unit, spec = EXCLUDED.spec, metadata = EXCLUDED.metadata;

-- Other Materials
INSERT INTO master_dropdown_options (dropdown_type, label, value, category, unit, spec, metadata, display_order)
VALUES
  ('material', 'Clay Bricks Class 75 (IS 1077)', 'Clay Bricks Class 75 (IS 1077)', 'other', 'Nos', 'Common burnt clay building bricks, min 7.5 N/mm²', '{"aliases": ["bricks", "clay bricks", "red bricks"]}'::jsonb, 52),
  ('material', 'Concrete Blocks', 'Concrete Blocks', 'other', 'Nos', 'Solid/hollow precast concrete masonry blocks IS 2185', '{"aliases": ["concrete blocks", "cement blocks", "hollow blocks"]}'::jsonb, 53),
  ('material', 'Precast RCC Manhole Cover & Frame (Heavy Duty)', 'Precast RCC Manhole Cover & Frame (Heavy Duty)', 'other', 'Sets', 'Heavy duty EHD-35 steel fiber reinforced concrete manhole cover', '{"aliases": ["manhole cover", "rcc cover", "manhole frame"]}'::jsonb, 54),
  ('material', 'Non-Woven Geotextile Fabric (200 GSM)', 'Non-Woven Geotextile Fabric (200 GSM)', 'other', 'Sqm', 'Polypropylene needle punched geotextile for drainage/separation', '{"aliases": ["geotextile", "filter fabric", "geo fabric 200gsm"]}'::jsonb, 55),
  ('material', 'PVC Waterstop 150mm', 'PVC Waterstop 150mm', 'other', 'Rmt', 'Hydrophilic / serrated ribbed PVC waterstop for construction joints', '{"aliases": ["waterstop", "pvc waterstop", "water bar"]}'::jsonb, 56),
  ('material', 'PVC Perforated Pipe 100mm Drainage', 'PVC Perforated Pipe 100mm Drainage', 'other', 'Rmt', 'Sub-surface perforated corrugated pipe for subsoil drainage', '{"aliases": ["perforated pipe", "drainage pipe 100mm"]}'::jsonb, 57),
  ('material', 'HSD / Diesel', 'HSD / Diesel', 'other', 'Litre', 'High speed diesel for site machinery and generators', '{"aliases": ["diesel", "hsd", "fuel"]}'::jsonb, 58),
  ('material', 'Water', 'Water', 'other', 'Litre', 'Potable / construction water conforming to IS 456 clause 5.4', '{"aliases": ["water", "curing water"]}'::jsonb, 59)
ON CONFLICT (dropdown_type, value) DO UPDATE
SET label = EXCLUDED.label, category = EXCLUDED.category, unit = EXCLUDED.unit, spec = EXCLUDED.spec, metadata = EXCLUDED.metadata;
