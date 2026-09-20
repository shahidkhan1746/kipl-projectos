-- Material register: link stock to the receipt it came from, and stop losing
-- Clause 55 rows to a hard delete.
--
-- Production does not run TypeORM synchronize, so these are applied by hand.

-- The goods receipt a register row came from. Previously the only link was a
-- sentence in `remarks` ("GRN 0012 against PO/..."), which nothing can join on:
-- a GRN submitted twice wrote its stock twice with no way to tell the duplicate
-- from a second genuine delivery, and a GRN entered wrongly left rows that
-- could never be traced back to it.
ALTER TABLE material_register ADD COLUMN IF NOT EXISTS grn_id uuid;

CREATE INDEX IF NOT EXISTS idx_material_register_grn
  ON material_register (grn_id) WHERE grn_id IS NOT NULL;

-- Stock is read per project and material on every page load, and the running
-- balance needs every row for a material, so the whole set is scanned.
CREATE INDEX IF NOT EXISTS idx_material_register_project_material
  ON material_register (project_id, material);

-- Clause 55 records are signed by both parties. They are withdrawn, not
-- destroyed: a deleted row stays readable, and what it said remains
-- reconstructible.
ALTER TABLE material_register ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE material_register ADD COLUMN IF NOT EXISTS deleted_by_id uuid;
ALTER TABLE material_register ADD COLUMN IF NOT EXISTS deleted_reason text;

CREATE INDEX IF NOT EXISTS idx_material_register_live
  ON material_register (project_id) WHERE deleted_at IS NULL;

-- The audit trail recorded that a write happened and never what changed, so a
-- destroyed register row left no recoverable trace of its quantity, material,
-- date or signatures.
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_table varchar(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id varchar(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS change_requested jsonb;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS change_result jsonb;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON audit_logs (entity_table, entity_id) WHERE entity_table IS NOT NULL;

-- Goods receipts could be created and read and nothing else, while a purchase
-- order's cumulative received quantity only ever incremented. A delivery keyed
-- as 10,000 instead of 1,000 marked the order complete forever and left stock
-- in the register that no longer matched the site.
ALTER TABLE goods_receipt_notes ADD COLUMN IF NOT EXISTS reversed_at timestamptz;
ALTER TABLE goods_receipt_notes ADD COLUMN IF NOT EXISTS reversed_by_id uuid;
ALTER TABLE goods_receipt_notes ADD COLUMN IF NOT EXISTS reversed_by_name varchar(255);
ALTER TABLE goods_receipt_notes ADD COLUMN IF NOT EXISTS reversed_reason text;

-- Purpose, cost and the work consumption was booked against.
--
-- The register recorded what moved and never why or at what value: rates lived
-- on purchase orders, quantities lived here, and the only thing joining them
-- was a sentence in `remarks`. "How much of each material have we procured and
-- at what cost" could not be answered from the register at all.
ALTER TABLE material_register ADD COLUMN IF NOT EXISTS purpose text;
ALTER TABLE material_register ADD COLUMN IF NOT EXISTS wbs_code varchar(100);
ALTER TABLE material_register ADD COLUMN IF NOT EXISTS rate numeric(14,2);
ALTER TABLE material_register ADD COLUMN IF NOT EXISTS amount numeric(15,2);
ALTER TABLE material_register ADD COLUMN IF NOT EXISTS vendor_id uuid;
ALTER TABLE material_register ADD COLUMN IF NOT EXISTS supplier_name varchar(255);
ALTER TABLE material_register ADD COLUMN IF NOT EXISTS invoice_no varchar(100);
ALTER TABLE material_register ADD COLUMN IF NOT EXISTS challan_no varchar(100);

CREATE INDEX IF NOT EXISTS idx_material_register_wbs
  ON material_register (project_id, wbs_code) WHERE wbs_code IS NOT NULL;
