-- =============================================
-- VendorBridge ERP - Migration 003
-- Activity Logs: enforce immutability + perf indexes
-- Run this if your DB was created before 001 included the triggers.
-- Safe to run multiple times (CREATE OR REPLACE / IF NOT EXISTS).
-- =============================================

-- Re-create the guard function (idempotent)
CREATE OR REPLACE FUNCTION prevent_activity_logs_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Activity logs are immutable — UPDATE and DELETE are not permitted';
END;
$$ LANGUAGE plpgsql;

-- Drop & re-create triggers so they are always present
DROP TRIGGER IF EXISTS prevent_activity_logs_update ON activity_logs;
CREATE TRIGGER prevent_activity_logs_update
  BEFORE UPDATE ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_activity_logs_modification();

DROP TRIGGER IF EXISTS prevent_activity_logs_delete ON activity_logs;
CREATE TRIGGER prevent_activity_logs_delete
  BEFORE DELETE ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_activity_logs_modification();

-- Revoke TRUNCATE on activity_logs from non-superuser roles if desired:
-- REVOKE TRUNCATE ON activity_logs FROM PUBLIC;

-- ── Performance: composite index for the most common log queries ──────────────

-- entity_type + created_at (used by filter + sort)
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type_created_at
  ON activity_logs (entity_type, created_at DESC);

-- user_id + created_at (used by per-user audit trail)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id_created_at
  ON activity_logs (user_id, created_at DESC);

-- ── Performance: indexes for reports queries ──────────────────────────────────

-- PO date range queries (used by all /api/reports/* endpoints)
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_date_vendor_id
  ON purchase_orders (po_date, vendor_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_date_status
  ON purchase_orders (po_date, status);

DO $$
BEGIN
  RAISE NOTICE 'Migration 003_activity_logs_and_reports_indexes.sql completed.';
END $$;
