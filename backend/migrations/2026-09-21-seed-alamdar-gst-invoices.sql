-- Migration: Seed / Update Alamdar Stone Crusher GST Invoices (#1098, #1099, #1100) & Updated Statement of Account (₹9,10,088.00 Dr)
-- Date: 2026-09-21

DO $$
DECLARE
  v_project_id UUID := '4a5176c7-0f53-42cc-bbd8-1a7259648a96';
  v_vendor_id UUID := 'b99e1d96-575d-4213-8d7d-a4be9808e355';
BEGIN
  -- 1. Update Expenses to Official GST Invoices
  UPDATE expenses
  SET 
    bill_no = '1098',
    bill_date = '2026-08-11',
    gross_amount = 580500.00,
    gst_pct = 5.00,
    gst_amount = 29025.00,
    cgst_amount = 14512.50,
    sgst_amount = 14512.50,
    igst_amount = 0.00,
    net_payable = 609525.00,
    status = 'approved',
    description = 'Alamdar Stone Crusher GST Invoice #1098 (774 MT / 19,350 cft CTSB & WMM against site challan bill #149)',
    remarks = 'GST Invoice #1098 dt 11/08/2026. 774 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST. Balance Dr ₹6,09,525.00. RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
    updated_at = NOW()
  WHERE id = '1111da40-570e-4b11-9e23-786000000149' OR bill_no = '149' OR bill_no = '1098';

  UPDATE expenses
  SET 
    bill_no = '1099',
    bill_date = '2026-08-11',
    gross_amount = 186000.00,
    gst_pct = 5.00,
    gst_amount = 9300.00,
    cgst_amount = 4650.00,
    sgst_amount = 4650.00,
    igst_amount = 0.00,
    net_payable = 195300.00,
    status = 'approved',
    description = 'Alamdar Stone Crusher GST Invoice #1099 (248 MT / 6,200 cft Bajari / Over Gauge Soling against site challan bill #150)',
    remarks = 'GST Invoice #1099 dt 11/08/2026. 248 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST. Balance Dr ₹1,95,300.00. RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
    updated_at = NOW()
  WHERE id = '1111da40-570e-4b11-9e23-786000000150' OR bill_no = '150' OR bill_no = '1099';

  UPDATE expenses
  SET 
    bill_no = '1100',
    bill_date = '2026-08-11',
    gross_amount = 24000.00,
    gst_pct = 5.00,
    gst_amount = 1200.00,
    cgst_amount = 600.00,
    sgst_amount = 600.00,
    igst_amount = 0.00,
    net_payable = 25200.00,
    status = 'approved',
    description = 'Alamdar Stone Crusher GST Invoice #1100 (32 MT / 800 cft Bajari / Stone Dust against site challan bill #151)',
    remarks = 'GST Invoice #1100 dt 11/08/2026. 32 MT Bajari (HSN 251710) @ ₹750/MT + 5% GST. Balance Dr ₹25,200.00. RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
    updated_at = NOW()
  WHERE id = '1111da40-570e-4b11-9e23-786000000151' OR bill_no = '151' OR bill_no = '1100';

  -- 2. Update Purchase Orders and Items
  UPDATE purchase_orders
  SET 
    subject = 'Supply of CTSB & WMM Sub-Base (774 MT) — Alamdar Stone Crusher (GST Invoice #1098 / Bill #149)',
    taxable_amount = 580500.00,
    subtotal_amount = 580500.00,
    cgst_amount = 14512.50,
    sgst_amount = 14512.50,
    igst_amount = 0.00,
    total_tax = 29025.00,
    tax_amount = 29025.00,
    grand_total = 609525.00,
    total_amount = 609525.00,
    status = 'completed',
    items = '[{"item_description": "Bajari / CTSB & WMM (HSN 251710)", "quantity": 774, "unit": "MT", "unit_rate": 750.00, "gst_rate": 5.00, "taxable_amount": 580500.00, "gst_amount": 29025.00, "total_amount": 609525.00, "site_ref": "49 Tippers (19,350 cft) against Bill #149"}]'::jsonb,
    remarks = 'GST Invoice #1098 (Internal Bill #149) - 774 MT Bajari/CTSB @ ₹750/MT + 5% GST = ₹6,09,525.00.',
    notes = 'GST Invoice #1098 (Internal Bill #149) - 774 MT Bajari/CTSB @ ₹750/MT + 5% GST = ₹6,09,525.00.',
    updated_at = NOW()
  WHERE po_number = 'PO-KIPL-2026-0008';

  UPDATE purchase_orders
  SET 
    subject = 'Supply of Over Gauge Soling / Bajari (248 MT) — Alamdar Stone Crusher (GST Invoice #1099 / Bill #150)',
    taxable_amount = 186000.00,
    subtotal_amount = 186000.00,
    cgst_amount = 4650.00,
    sgst_amount = 4650.00,
    igst_amount = 0.00,
    total_tax = 9300.00,
    tax_amount = 9300.00,
    grand_total = 195300.00,
    total_amount = 195300.00,
    status = 'completed',
    items = '[{"item_description": "Bajari / Over Gauge Soling (HSN 251710)", "quantity": 248, "unit": "MT", "unit_rate": 750.00, "gst_rate": 5.00, "taxable_amount": 186000.00, "gst_amount": 9300.00, "total_amount": 195300.00, "site_ref": "16 Tippers (6,200 cft) against Bill #150"}]'::jsonb,
    remarks = 'GST Invoice #1099 (Internal Bill #150) - 248 MT Bajari/Soling @ ₹750/MT + 5% GST = ₹1,95,300.00.',
    notes = 'GST Invoice #1099 (Internal Bill #150) - 248 MT Bajari/Soling @ ₹750/MT + 5% GST = ₹1,95,300.00.',
    updated_at = NOW()
  WHERE po_number = 'PO-KIPL-2026-0009';

  UPDATE purchase_orders
  SET 
    subject = 'Supply of Stone Dust / Bajari (32 MT) — Alamdar Stone Crusher (GST Invoice #1100 / Bill #151)',
    taxable_amount = 24000.00,
    subtotal_amount = 24000.00,
    cgst_amount = 600.00,
    sgst_amount = 600.00,
    igst_amount = 0.00,
    total_tax = 1200.00,
    tax_amount = 1200.00,
    grand_total = 25200.00,
    total_amount = 25200.00,
    status = 'completed',
    items = '[{"item_description": "Bajari / Stone Dust (HSN 251710)", "quantity": 32, "unit": "MT", "unit_rate": 750.00, "gst_rate": 5.00, "taxable_amount": 24000.00, "gst_amount": 1200.00, "total_amount": 25200.00, "site_ref": "2 Tippers (800 cft) against Bill #151"}]'::jsonb,
    remarks = 'GST Invoice #1100 (Internal Bill #151) - 32 MT Bajari/Dust @ ₹750/MT + 5% GST = ₹25,200.00.',
    notes = 'GST Invoice #1100 (Internal Bill #151) - 32 MT Bajari/Dust @ ₹750/MT + 5% GST = ₹25,200.00.',
    updated_at = NOW()
  WHERE po_number = 'PO-KIPL-2026-0010';

  -- 3. Update GRNs
  UPDATE goods_receipt_notes
  SET invoice_number = '1098 (Bill #149)', updated_at = NOW()
  WHERE grn_number = 'GRN-2026-0008';

  UPDATE goods_receipt_notes
  SET invoice_number = '1099 (Bill #150)', updated_at = NOW()
  WHERE grn_number = 'GRN-2026-0009';

  UPDATE goods_receipt_notes
  SET invoice_number = '1100 (Bill #151)', updated_at = NOW()
  WHERE grn_number = 'GRN-2026-0010';

  -- 4. Update Payment Requisitions
  UPDATE payment_requisitions
  SET 
    title = 'Payment Requisition for CTSB (774 MT / 19,350 cft) — Alamdar Stone Crusher (GST Invoice #1098 / Bill #149)',
    total_order_cost = 609525.00,
    total_amount_to_pay = 609525.00,
    accounts_remarks = 'GST Invoice #1098 dt 11/08/2026 verified. Total ₹6,09,525.00 (Taxable ₹5,80,500.00 + UTGST ₹14,512.50 + CGST ₹14,512.50) passed for RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
    notes = 'Payment against Alamdar Stone Crusher GST Invoice #1098 dated 11/08/2026 (Internal Bill #149).',
    updated_at = NOW()
  WHERE pr_number = 'PR-2026-0007';

  UPDATE payment_requisitions
  SET 
    title = 'Payment Requisition for Over Gauge Soling (248 MT / 6,200 cft) — Alamdar Stone Crusher (GST Invoice #1099 / Bill #150)',
    total_order_cost = 195300.00,
    total_amount_to_pay = 195300.00,
    accounts_remarks = 'GST Invoice #1099 dt 11/08/2026 verified. Total ₹1,95,300.00 (Taxable ₹1,86,000.00 + UTGST ₹4,650.00 + CGST ₹4,650.00) passed for RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
    notes = 'Payment against Alamdar Stone Crusher GST Invoice #1099 dated 11/08/2026 (Internal Bill #150).',
    updated_at = NOW()
  WHERE pr_number = 'PR-2026-0008';

  UPDATE payment_requisitions
  SET 
    title = 'Payment Requisition for Stone Dust (32 MT / 800 cft) — Alamdar Stone Crusher (GST Invoice #1100 / Bill #151)',
    total_order_cost = 25200.00,
    total_amount_to_pay = 25200.00,
    accounts_remarks = 'GST Invoice #1100 dt 11/08/2026 verified. Total ₹25,200.00 (Taxable ₹24,000.00 + UTGST ₹600.00 + CGST ₹600.00) passed for RTGS to J&K Bank Khonmoh A/C 0244020100000164.',
    notes = 'Payment against Alamdar Stone Crusher GST Invoice #1100 dated 11/08/2026 (Internal Bill #151).',
    updated_at = NOW()
  WHERE pr_number = 'PR-2026-0009';

  -- 5. Update Material Register
  UPDATE material_register
  SET invoice_no = '1098 / 149', updated_at = NOW()
  WHERE invoice_no IN ('149', '1098 / 149');

  UPDATE material_register
  SET invoice_no = '1099 / 150', updated_at = NOW()
  WHERE invoice_no IN ('150', '1099 / 150');

  UPDATE material_register
  SET invoice_no = '1100 / 151', updated_at = NOW()
  WHERE invoice_no IN ('151', '1100 / 151');

END $$;
