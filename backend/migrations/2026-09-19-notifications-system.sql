-- ============================================================
-- Migration: Notifications System
-- Description: Creates the persistent notifications table and
--              indexes for real-time operational notifications.
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  category VARCHAR(20) NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical', 'success'
  type VARCHAR(60) NOT NULL,                    -- 'task_assigned', 'leave_applied', 'leave_status', 'diary_submitted', 'diary_status', 'indent_submitted', 'indent_status', 'payment_req_submitted', 'payment_req_status', 'timesheet_submitted', 'site_order_issued'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(255),                            -- web link to navigate to, e.g. /tasks?taskId=..., /hr/leave, /procurement, /diary
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
