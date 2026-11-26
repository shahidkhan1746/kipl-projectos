-- The pump account for the diesel register: where the site buys fuel, money
-- paid to it in advance, and fuel taken from it. A purchase in the register
-- names its supplier, and is paid for out of that supplier's advance.
-- Additive and idempotent: runs on every boot, changes nothing after the first.

CREATE TABLE IF NOT EXISTS fuel_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id varchar NOT NULL,
  name varchar(160) NOT NULL,
  rate numeric(10,2),
  is_default boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fuel_suppliers_project ON fuel_suppliers(project_id);
-- One default supplier per project.
CREATE UNIQUE INDEX IF NOT EXISTS uq_fuel_suppliers_default ON fuel_suppliers(project_id) WHERE is_default;

CREATE TABLE IF NOT EXISTS fuel_supplier_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id varchar NOT NULL,
  supplier_id uuid NOT NULL REFERENCES fuel_suppliers(id) ON DELETE RESTRICT,
  entry_type varchar(10) NOT NULL,
  date date NOT NULL,
  amount numeric(12,2) NOT NULL,
  litres numeric(10,2),
  rate numeric(10,2),
  mode varchar(20),
  reference varchar(80),
  remarks text,
  recorded_by_id uuid,
  recorded_by_name varchar(120),
  voided_at timestamp,
  voided_by_name varchar(120),
  void_reason text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fuel_supplier_entries_supplier ON fuel_supplier_entries(project_id, supplier_id);

ALTER TABLE fuel_entries ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES fuel_suppliers(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_fuel_entries_supplier ON fuel_entries(supplier_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fuel_suppliers_values_check') THEN
    ALTER TABLE fuel_suppliers ADD CONSTRAINT fuel_suppliers_values_check CHECK (
      NULLIF(TRIM(name), '') IS NOT NULL AND (rate IS NULL OR rate > 0));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fuel_supplier_entries_values_check') THEN
    ALTER TABLE fuel_supplier_entries ADD CONSTRAINT fuel_supplier_entries_values_check CHECK (
      entry_type IN ('payment', 'lift') AND amount > 0
      AND (entry_type <> 'lift' OR (litres IS NOT NULL AND litres > 0)));
  END IF;
END $$;
