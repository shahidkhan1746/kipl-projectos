-- ============================================================
-- Migration: Procurement & Purchase Order (PO) Module
-- Description: Requisitions (Site Indents), Head Office Dual
--              Approvals (Procurement & Accounts), and POs.
-- ============================================================

CREATE TABLE IF NOT EXISTS material_requisitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  req_number VARCHAR(60) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  site_location VARCHAR(255),
  requested_by_id UUID,
  requested_by_name VARCHAR(120),
  required_by_date DATE,
  priority VARCHAR(30) DEFAULT 'normal', -- normal, high, urgent
  justification TEXT,
  attachment_url TEXT,
  status VARCHAR(40) DEFAULT 'submitted_to_ho', -- draft, submitted_to_ho, partially_approved, approved, rejected, converted_to_po, cancelled
  
  -- HO Procurement Review
  procurement_status VARCHAR(30) DEFAULT 'pending', -- pending, approved, rejected
  procurement_approved_by_id UUID,
  procurement_approved_by_name VARCHAR(120),
  procurement_approved_at TIMESTAMPTZ,
  procurement_remarks TEXT,
  recommended_vendor VARCHAR(255),
  
  -- HO Accounts Review
  accounts_status VARCHAR(30) DEFAULT 'pending', -- pending, approved, rejected
  accounts_approved_by_id UUID,
  accounts_approved_by_name VARCHAR(120),
  accounts_approved_at TIMESTAMPTZ,
  accounts_remarks TEXT,
  budget_head VARCHAR(120),
  
  estimated_total NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mat_req_project_id ON material_requisitions(project_id);
CREATE INDEX IF NOT EXISTS idx_mat_req_status ON material_requisitions(status);

CREATE TABLE IF NOT EXISTS requisition_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id UUID NOT NULL REFERENCES material_requisitions(id) ON DELETE CASCADE,
  item_description VARCHAR(255) NOT NULL,
  category VARCHAR(80),
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 1,
  unit VARCHAR(40) DEFAULT 'Nos',
  estimated_rate NUMERIC(14, 2) DEFAULT 0,
  estimated_amount NUMERIC(15, 2) DEFAULT 0,
  specifications TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_req_items_requisition_id ON requisition_items(requisition_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  po_number VARCHAR(60) NOT NULL UNIQUE,
  requisition_id UUID REFERENCES material_requisitions(id) ON DELETE SET NULL,
  vendor_name VARCHAR(255) NOT NULL,
  vendor_contact_person VARCHAR(120),
  vendor_phone VARCHAR(50),
  vendor_email VARCHAR(120),
  vendor_gstin VARCHAR(50),
  vendor_address TEXT,
  billing_address TEXT,
  shipping_address TEXT,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  payment_terms TEXT,
  delivery_terms TEXT,
  subtotal_amount NUMERIC(15, 2) DEFAULT 0,
  tax_amount NUMERIC(15, 2) DEFAULT 0,
  freight_charges NUMERIC(15, 2) DEFAULT 0,
  other_charges NUMERIC(15, 2) DEFAULT 0,
  grand_total NUMERIC(15, 2) DEFAULT 0,
  status VARCHAR(40) DEFAULT 'draft', -- draft, issued, partially_delivered, completed, cancelled
  issued_by_id UUID,
  issued_by_name VARCHAR(120),
  approved_by_id UUID,
  approved_by_name VARCHAR(120),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_project_id ON purchase_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_po_requisition_id ON purchase_orders(requisition_id);
CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status);

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_description VARCHAR(255) NOT NULL,
  hsn_code VARCHAR(40),
  quantity NUMERIC(12, 3) NOT NULL DEFAULT 1,
  unit VARCHAR(40) DEFAULT 'Nos',
  unit_rate NUMERIC(14, 2) NOT NULL DEFAULT 0,
  discount_percent NUMERIC(5, 2) DEFAULT 0,
  gst_rate NUMERIC(5, 2) DEFAULT 18,
  taxable_amount NUMERIC(15, 2) DEFAULT 0,
  gst_amount NUMERIC(15, 2) DEFAULT 0,
  total_amount NUMERIC(15, 2) DEFAULT 0,
  received_qty NUMERIC(12, 3) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_po_items_po_id ON purchase_order_items(purchase_order_id);
