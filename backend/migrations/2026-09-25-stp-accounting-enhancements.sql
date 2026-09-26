-- 4-Date Engine, STP WBS Cost Codes, Subcontractor Contra-Deductions, and Vendor Credit Terms
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS document_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS received_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS posting_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS wbs_code VARCHAR(100);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS boq_item_id VARCHAR(100);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS contra_deduction DECIMAL(15,2) DEFAULT 0;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS contra_remarks TEXT;

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS credit_days INTEGER DEFAULT 30;
