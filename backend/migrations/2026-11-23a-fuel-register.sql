-- Diesel and petrol register for Fleet & Plant: the machines that draw fuel
-- from the site store, and every litre bought, issued or adjusted.
-- Additive and idempotent: runs on every boot, changes nothing after the first.

CREATE TABLE IF NOT EXISTS fuel_machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id varchar NOT NULL,
  name varchar(120) NOT NULL,
  kind varchar(60),
  ownership varchar(10) NOT NULL DEFAULT 'owned',
  owner_name varchar(160),
  asset_id uuid,
  operator varchar(120),
  fuel_type varchar(10) NOT NULL DEFAULT 'diesel',
  meter_unit varchar(10) NOT NULL DEFAULT 'hours',
  logbook_names varchar(300),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fuel_machines_project ON fuel_machines(project_id);

CREATE TABLE IF NOT EXISTS fuel_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id varchar NOT NULL,
  entry_type varchar(12) NOT NULL,
  fuel_type varchar(10) NOT NULL DEFAULT 'diesel',
  date date NOT NULL,
  litres numeric(10,2) NOT NULL,
  rate numeric(10,2),
  amount numeric(12,2),
  supplier varchar(160),
  bill_no varchar(80),
  machine_id uuid REFERENCES fuel_machines(id) ON DELETE RESTRICT,
  operator varchar(120),
  meter_reading numeric(12,1),
  logbook_machine varchar(120),
  fleet_log_id uuid,
  remarks text,
  photo_url varchar(500),
  recorded_by_id uuid,
  recorded_by_name varchar(120),
  voided_at timestamp,
  voided_by_name varchar(120),
  void_reason text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fuel_entries_project_date ON fuel_entries(project_id, date);
CREATE INDEX IF NOT EXISTS idx_fuel_entries_fleet_log ON fuel_entries(fleet_log_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fuel_machines_values_check') THEN
    ALTER TABLE fuel_machines ADD CONSTRAINT fuel_machines_values_check CHECK (
      ownership IN ('owned', 'hired') AND fuel_type IN ('diesel', 'petrol') AND meter_unit IN ('hours', 'km')
      AND (ownership = 'owned' OR NULLIF(TRIM(owner_name), '') IS NOT NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fuel_entries_values_check') THEN
    ALTER TABLE fuel_entries ADD CONSTRAINT fuel_entries_values_check CHECK (
      entry_type IN ('receipt', 'issue', 'adjustment') AND fuel_type IN ('diesel', 'petrol')
      AND (entry_type = 'adjustment' OR litres > 0)
      AND (entry_type <> 'adjustment' OR litres <> 0));
  END IF;
END $$;
