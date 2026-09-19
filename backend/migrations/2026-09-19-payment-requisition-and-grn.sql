-- ============================================================
-- Migration: Payment Requisition (Excel Proforma), GRN & Vendor Link
-- Description: Supports KIPL official Payment Requisition schema,
--              Goods Receipt Notes (GRN), and vendor master links.
-- ============================================================

-- 1. Payment Requisitions (Header)
CREATE TABLE IF NOT EXISTS payment_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  pr_number VARCHAR(60) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  pr_date DATE NOT NULL DEFAULT CURRENT_DATE,
  site_location VARCHAR(255) DEFAULT '38.5 MLD STP Nishat Sgr.',
  requested_by_id UUID,
  requested_by_name VARCHAR(120),
  status VARCHAR(40) DEFAULT 'submitted_to_ho', -- draft, submitted_to_ho, partially_approved, approved, rejected, paid, cancelled
  
  -- Running Financial Totals
  total_order_cost NUMERIC(15, 2) DEFAULT 0,
  total_advance_paid NUMERIC(15, 2) DEFAULT 0,
  total_amount_to_pay NUMERIC(15, 2) DEFAULT 0,
  total_balance NUMERIC(15, 2) DEFAULT 0,
  
  -- HO Procurement Review
  procurement_status VARCHAR(30) DEFAULT 'pending', -- pending, approved, rejected
  procurement_approved_by_id UUID,
  procurement_approved_by_name VARCHAR(120),
  procurement_approved_at TIMESTAMPTZ,
  procurement_remarks TEXT,
  
  -- HO Accounts Review
  accounts_status VARCHAR(30) DEFAULT 'pending', -- pending, approved, rejected
  accounts_approved_by_id UUID,
  accounts_approved_by_name VARCHAR(120),
  accounts_approved_at TIMESTAMPTZ,
  accounts_remarks TEXT,
  
  notes TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_req_project_id ON payment_requisitions(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_req_status ON payment_requisitions(status);

-- 2. Payment Requisition Line Items (Matches Excel Columns Exactly)
CREATE TABLE IF NOT EXISTS payment_requisition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_requisition_id UUID NOT NULL REFERENCES payment_requisitions(id) ON DELETE CASCADE,
  sr_no INT NOT NULL DEFAULT 1,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  vendor_name VARCHAR(255) NOT NULL,
  description VARCHAR(255) NOT NULL,
  material_or_services VARCHAR(50) DEFAULT 'Material', -- Material / Services
  is_msme BOOLEAN DEFAULT false,
  total_order_cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
  advance_paid NUMERIC(15, 2) NOT NULL DEFAULT 0,
  amount_to_pay NUMERIC(15, 2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  site_location VARCHAR(255) DEFAULT '38.5 MLD STP Nishat Sgr.',
  remark VARCHAR(255) DEFAULT 'Against Tax Invoice',
  against_ref VARCHAR(100), -- Against PI / Tax Inv / PO reference
  mode_of_payment VARCHAR(50) DEFAULT 'RTGS', -- RTGS, NEFT, Cheque, Account Transfer
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_items_req_id ON payment_requisition_items(payment_requisition_id);
CREATE INDEX IF NOT EXISTS idx_pr_items_vendor_id ON payment_requisition_items(vendor_id);

-- 3. Goods Receipt Notes (GRN Header)
CREATE TABLE IF NOT EXISTS goods_receipt_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  grn_number VARCHAR(60) NOT NULL UNIQUE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  challan_number VARCHAR(100),
  invoice_number VARCHAR(100),
  vehicle_number VARCHAR(50),
  received_by_id UUID,
  received_by_name VARCHAR(120),
  remarks TEXT,
  write_to_material_register BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grn_project_id ON goods_receipt_notes(project_id);
CREATE INDEX IF NOT EXISTS idx_grn_po_id ON goods_receipt_notes(purchase_order_id);

-- 4. Goods Receipt Note Line Items
CREATE TABLE IF NOT EXISTS goods_receipt_note_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grn_id UUID NOT NULL REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES purchase_order_items(id) ON DELETE SET NULL,
  item_description VARCHAR(255) NOT NULL,
  received_qty NUMERIC(12, 3) NOT NULL DEFAULT 0,
  unit VARCHAR(40) DEFAULT 'Nos',
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grn_items_grn_id ON goods_receipt_note_items(grn_id);

-- 5. Foreign Key and Metadata Enhancements
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS work_component VARCHAR(255);
ALTER TABLE material_requisitions ADD COLUMN IF NOT EXISTS work_component VARCHAR(255);
