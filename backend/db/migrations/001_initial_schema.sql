-- =============================================
-- VendorBridge ERP - Initial Schema Migration
-- =============================================

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS purchase_orders CASCADE;
DROP TABLE IF EXISTS approvals CASCADE;
DROP TABLE IF EXISTS quotation_line_items CASCADE;
DROP TABLE IF EXISTS quotations CASCADE;
DROP TABLE IF EXISTS rfq_vendors CASCADE;
DROP TABLE IF EXISTS rfq_line_items CASCADE;
DROP TABLE IF EXISTS rfqs CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS vendor_status CASCADE;
DROP TYPE IF EXISTS rfq_status CASCADE;
DROP TYPE IF EXISTS quotation_status CASCADE;
DROP TYPE IF EXISTS approval_status CASCADE;
DROP TYPE IF EXISTS po_status CASCADE;

-- =============================================
-- CREATE ENUM TYPES
-- =============================================

CREATE TYPE user_role AS ENUM ('admin', 'procurement_officer', 'vendor', 'manager');
CREATE TYPE vendor_status AS ENUM ('active', 'pending', 'blocked');
CREATE TYPE rfq_status AS ENUM ('draft', 'published', 'closed');
CREATE TYPE quotation_status AS ENUM ('draft', 'submitted', 'selected', 'rejected');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE po_status AS ENUM ('draft', 'approved', 'pending_payment', 'paid');

-- =============================================
-- 1. USERS TABLE
-- =============================================

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role user_role NOT NULL DEFAULT 'procurement_officer',
  profile_photo_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- =============================================
-- 2. VENDORS TABLE
-- =============================================

CREATE TABLE vendors (
  id SERIAL PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  gst_number VARCHAR(15) UNIQUE,
  contact_name VARCHAR(100) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(20),
  address TEXT,
  status vendor_status NOT NULL DEFAULT 'pending',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for vendors table
CREATE INDEX idx_vendors_status ON vendors(status);
CREATE INDEX idx_vendors_category ON vendors(category);
CREATE INDEX idx_vendors_created_by ON vendors(created_by);
CREATE INDEX idx_vendors_gst_number ON vendors(gst_number);

-- =============================================
-- 3. RFQs (Request for Quotations) TABLE
-- =============================================

CREATE TABLE rfqs (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  deadline TIMESTAMP NOT NULL,
  description TEXT,
  status rfq_status NOT NULL DEFAULT 'draft',
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for rfqs table
CREATE INDEX idx_rfqs_status ON rfqs(status);
CREATE INDEX idx_rfqs_category ON rfqs(category);
CREATE INDEX idx_rfqs_created_by ON rfqs(created_by);
CREATE INDEX idx_rfqs_deadline ON rfqs(deadline);

-- =============================================
-- 4. RFQ LINE ITEMS TABLE
-- =============================================

CREATE TABLE rfq_line_items (
  id SERIAL PRIMARY KEY,
  rfq_id INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
  unit VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for rfq_line_items table
CREATE INDEX idx_rfq_line_items_rfq_id ON rfq_line_items(rfq_id);

-- =============================================
-- 5. RFQ VENDORS TABLE (Many-to-Many)
-- =============================================

CREATE TABLE rfq_vendors (
  id SERIAL PRIMARY KEY,
  rfq_id INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(rfq_id, vendor_id)
);

-- Indexes for rfq_vendors table
CREATE INDEX idx_rfq_vendors_rfq_id ON rfq_vendors(rfq_id);
CREATE INDEX idx_rfq_vendors_vendor_id ON rfq_vendors(vendor_id);

-- =============================================
-- 6. QUOTATIONS TABLE
-- =============================================

CREATE TABLE quotations (
  id SERIAL PRIMARY KEY,
  rfq_id INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  tax_percent DECIMAL(5, 2) DEFAULT 0 CHECK (tax_percent >= 0 AND tax_percent <= 100),
  notes TEXT,
  status quotation_status NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for quotations table
CREATE INDEX idx_quotations_rfq_id ON quotations(rfq_id);
CREATE INDEX idx_quotations_vendor_id ON quotations(vendor_id);
CREATE INDEX idx_quotations_status ON quotations(status);

-- =============================================
-- 7. QUOTATION LINE ITEMS TABLE
-- =============================================

CREATE TABLE quotation_line_items (
  id SERIAL PRIMARY KEY,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
  total DECIMAL(15, 2) NOT NULL CHECK (total >= 0),
  delivery_days INTEGER CHECK (delivery_days >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for quotation_line_items table
CREATE INDEX idx_quotation_line_items_quotation_id ON quotation_line_items(quotation_id);

-- =============================================
-- 8. APPROVALS TABLE
-- =============================================

CREATE TABLE approvals (
  id SERIAL PRIMARY KEY,
  rfq_id INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
  quotation_id INTEGER REFERENCES quotations(id) ON DELETE CASCADE,
  approver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level > 0),
  status approval_status NOT NULL DEFAULT 'pending',
  remarks TEXT,
  actioned_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for approvals table
CREATE INDEX idx_approvals_rfq_id ON approvals(rfq_id);
CREATE INDEX idx_approvals_quotation_id ON approvals(quotation_id);
CREATE INDEX idx_approvals_approver_id ON approvals(approver_id);
CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_level ON approvals(level);

-- =============================================
-- 9. PURCHASE ORDERS TABLE
-- =============================================

CREATE TABLE purchase_orders (
  id SERIAL PRIMARY KEY,
  po_number VARCHAR(50) UNIQUE NOT NULL,
  rfq_id INTEGER NOT NULL REFERENCES rfqs(id) ON DELETE RESTRICT,
  quotation_id INTEGER NOT NULL REFERENCES quotations(id) ON DELETE RESTRICT,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  status po_status NOT NULL DEFAULT 'draft',
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal DECIMAL(15, 2) NOT NULL CHECK (subtotal >= 0),
  cgst DECIMAL(15, 2) DEFAULT 0 CHECK (cgst >= 0),
  sgst DECIMAL(15, 2) DEFAULT 0 CHECK (sgst >= 0),
  grand_total DECIMAL(15, 2) NOT NULL CHECK (grand_total >= 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for purchase_orders table
CREATE INDEX idx_purchase_orders_po_number ON purchase_orders(po_number);
CREATE INDEX idx_purchase_orders_rfq_id ON purchase_orders(rfq_id);
CREATE INDEX idx_purchase_orders_quotation_id ON purchase_orders(quotation_id);
CREATE INDEX idx_purchase_orders_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_po_date ON purchase_orders(po_date);

-- =============================================
-- 10. ACTIVITY LOGS TABLE (Write-Only)
-- =============================================

CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for activity_logs table
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX idx_activity_logs_entity_id ON activity_logs(entity_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- =============================================
-- TRIGGERS FOR UPDATED_AT COLUMNS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON vendors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rfqs_updated_at
  BEFORE UPDATE ON rfqs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- PREVENT UPDATES/DELETES ON ACTIVITY LOGS
-- =============================================

CREATE OR REPLACE FUNCTION prevent_activity_logs_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Activity logs are write-only and cannot be updated or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_activity_logs_update
  BEFORE UPDATE ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_activity_logs_modification();

CREATE TRIGGER prevent_activity_logs_delete
  BEFORE DELETE ON activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION prevent_activity_logs_modification();

-- =============================================
-- INITIAL DATA (Optional)
-- =============================================

-- Insert default admin user (password: admin123)
INSERT INTO users (first_name, last_name, email, password_hash, phone, role) VALUES
('Admin', 'User', 'admin@vendorbridge.com', '$2b$10$rQZ8vXK7X3Km9XzFZXvz0.GxqP4JYqZxHfzYKzGzYyKzGzYzGzYzG', '+1234567890', 'admin');

-- =============================================
-- GRANT PERMISSIONS (Adjust as needed)
-- =============================================

-- Grant permissions to your database user if needed
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_db_user;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 001_initial_schema.sql completed successfully!';
  RAISE NOTICE 'Created 10 tables with proper foreign keys, indexes, and constraints.';
END $$;
