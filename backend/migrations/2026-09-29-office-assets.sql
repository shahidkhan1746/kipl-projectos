-- Additive only. Discovered by the existing startup SQL migration runner.
BEGIN;
CREATE TABLE IF NOT EXISTS office_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id varchar NOT NULL,
  asset_tag varchar(60) NOT NULL,
  name varchar(200) NOT NULL,
  category varchar(40) NOT NULL CHECK (category IN ('furniture','computer','laptop','printer','vehicle','office_equipment','other')),
  location varchar(200) NOT NULL,
  status varchar(30) NOT NULL DEFAULT 'available' CHECK (status IN ('available','assigned','under_repair','lost','disposed')),
  condition varchar(30) NOT NULL DEFAULT 'good' CHECK (condition IN ('new','good','fair','poor','unserviceable')),
  brand varchar(120), model varchar(120), serial_number varchar(150), supplier varchar(200), invoice_number varchar(100),
  purchase_date date, purchase_cost numeric(14,2) CHECK (purchase_cost >= 0), warranty_until date,
  registration_number varchar(60), insurance_until date, service_due date,
  document_url text, photo_url text, notes text,
  assigned_employee_id uuid, assigned_to varchar(220), last_verified date, version integer NOT NULL DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT uq_office_assets_project_tag UNIQUE (project_id, asset_tag)
);
CREATE TABLE IF NOT EXISTS office_asset_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES office_assets(id) ON DELETE RESTRICT,
  project_id varchar NOT NULL, action varchar(30) NOT NULL, event_date date NOT NULL, reason text NOT NULL,
  actor_id uuid NOT NULL, actor_name varchar(220) NOT NULL,
  "before" jsonb, "after" jsonb NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_office_asset_events_asset ON office_asset_events(asset_id, created_at);
COMMIT;
