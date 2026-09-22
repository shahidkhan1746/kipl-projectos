-- Migration: 2026-09-22-trusted-devices.sql
-- Description: Adds user_devices table for Adaptive Device Recognition and links device_id to refresh_tokens

CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(128) NOT NULL,
  device_name VARCHAR(128) NOT NULL,
  device_fingerprint VARCHAR(64) NOT NULL,
  ip_address VARCHAR(64) NOT NULL,
  subnet VARCHAR(64) NOT NULL,
  user_agent TEXT NOT NULL,
  is_trusted BOOLEAN NOT NULL DEFAULT true,
  trust_score INT NOT NULL DEFAULT 100,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  login_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_device UNIQUE (user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices (user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_lookup ON user_devices (user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_subnet ON user_devices (user_id, subnet);

ALTER TABLE refresh_tokens ADD COLUMN IF NOT EXISTS device_id VARCHAR(128);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_device ON refresh_tokens (user_id, device_id);
