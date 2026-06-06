-- =============================================
-- VendorBridge ERP - Seed Data Migration
-- =============================================
-- This file contains sample data for testing and development

-- =============================================
-- SEED USERS
-- =============================================
-- Password for all users: password123
-- Hash generated using bcrypt with 10 rounds

INSERT INTO users (first_name, last_name, email, password_hash, phone, role) VALUES
('John', 'Admin', 'john.admin@vendorbridge.com', '$2b$10$XGZzY5Z5Z5Z5Z5Z5Z5Z5ZOZzY5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', '+1-555-0101', 'admin'),
('Sarah', 'Johnson', 'sarah.procurement@vendorbridge.com', '$2b$10$XGZzY5Z5Z5Z5Z5Z5Z5Z5ZOZzY5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', '+1-555-0102', 'procurement_officer'),
('Mike', 'Manager', 'mike.manager@vendorbridge.com', '$2b$10$XGZzY5Z5Z5Z5Z5Z5Z5Z5ZOZzY5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', '+1-555-0103', 'manager'),
('Linda', 'Finance', 'linda.finance@vendorbridge.com', '$2b$10$XGZzY5Z5Z5Z5Z5Z5Z5Z5ZOZzY5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', '+1-555-0104', 'manager'),
('Vendor', 'One', 'vendor1@example.com', '$2b$10$XGZzY5Z5Z5Z5Z5Z5Z5Z5ZOZzY5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', '+1-555-0201', 'vendor'),
('Vendor', 'Two', 'vendor2@example.com', '$2b$10$XGZzY5Z5Z5Z5Z5Z5Z5Z5ZOZzY5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z', '+1-555-0202', 'vendor');

-- =============================================
-- SEED VENDORS
-- =============================================

INSERT INTO vendors (company_name, category, gst_number, contact_name, contact_email, contact_phone, address, status, created_by) VALUES
('TechSupplies Inc', 'Electronics', '29ABCDE1234F1Z5', 'Robert Smith', 'robert@techsupplies.com', '+1-555-1001', '123 Tech Street, Silicon Valley, CA 94025', 'active', 2),
('Office Essentials Ltd', 'Office Supplies', '27BCDEF2345G2Z6', 'Emily Davis', 'emily@officeessentials.com', '+1-555-1002', '456 Office Park, New York, NY 10001', 'active', 2),
('Industrial Solutions', 'Manufacturing', '19CDEFG3456H3Z7', 'David Wilson', 'david@industrial.com', '+1-555-1003', '789 Industrial Blvd, Detroit, MI 48201', 'active', 2),
('Green Energy Corp', 'Energy', '36DEFGH4567I4Z8', 'Lisa Anderson', 'lisa@greenenergy.com', '+1-555-1004', '321 Solar Ave, Austin, TX 78701', 'pending', 2),
('FastLogistics LLC', 'Logistics', '29EFGHI5678J5Z9', 'James Brown', 'james@fastlogistics.com', '+1-555-1005', '654 Transport Way, Chicago, IL 60601', 'active', 2),
('Quality Materials', 'Raw Materials', '27FGHIJ6789K6Z0', 'Maria Garcia', 'maria@qualitymaterials.com', '+1-555-1006', '987 Material Road, Houston, TX 77001', 'blocked', 2);

-- =============================================
-- SEED RFQs
-- =============================================

INSERT INTO rfqs (title, category, deadline, description, status, created_by) VALUES
('Office Furniture for New Branch', 'Office Supplies', '2026-07-15 17:00:00', 'We need office furniture including desks, chairs, and cabinets for our new branch office. Total capacity for 50 employees.', 'published', 2),
('Laptop Procurement Q3 2026', 'Electronics', '2026-07-01 17:00:00', 'Procurement of 100 laptops with specified configurations for engineering team.', 'published', 2),
('Annual Stationery Supply', 'Office Supplies', '2026-06-20 17:00:00', 'Annual contract for office stationery including pens, paper, folders, and other supplies.', 'published', 2),
('Solar Panel Installation', 'Energy', '2026-08-30 17:00:00', 'Installation of solar panels for warehouse facility - 500kW capacity.', 'draft', 2),
('Raw Material Supply Q3', 'Raw Materials', '2026-05-30 17:00:00', 'Quarterly supply of steel and aluminum for manufacturing operations.', 'closed', 2);

-- =============================================
-- SEED RFQ LINE ITEMS
-- =============================================

INSERT INTO rfq_line_items (rfq_id, item_name, quantity, unit) VALUES
-- RFQ 1: Office Furniture
(1, 'Executive Desk', 50, 'pieces'),
(1, 'Office Chair (Ergonomic)', 50, 'pieces'),
(1, 'Filing Cabinet (4-drawer)', 25, 'pieces'),
(1, 'Conference Table (12-seater)', 5, 'pieces'),
-- RFQ 2: Laptops
(2, 'Laptop - i7, 16GB RAM, 512GB SSD', 100, 'pieces'),
(2, 'Laptop Bag', 100, 'pieces'),
(2, 'Wireless Mouse', 100, 'pieces'),
-- RFQ 3: Stationery
(3, 'A4 Paper (Ream)', 500, 'reams'),
(3, 'Ballpoint Pen (Blue)', 2000, 'pieces'),
(3, 'File Folders', 1000, 'pieces'),
(3, 'Stapler', 50, 'pieces'),
-- RFQ 4: Solar Panels
(4, 'Solar Panel 250W', 2000, 'pieces'),
(4, 'Inverter 500kW', 1, 'pieces'),
(4, 'Mounting Structure', 2000, 'pieces'),
-- RFQ 5: Raw Materials
(5, 'Steel Sheets 2mm', 5000, 'kg'),
(5, 'Aluminum Rods 10mm', 3000, 'kg');

-- =============================================
-- SEED RFQ VENDORS (Assignments)
-- =============================================

INSERT INTO rfq_vendors (rfq_id, vendor_id) VALUES
-- RFQ 1 assigned to Office Essentials and Industrial Solutions
(1, 2),
(1, 3),
-- RFQ 2 assigned to TechSupplies
(2, 1),
-- RFQ 3 assigned to Office Essentials
(3, 2),
-- RFQ 4 assigned to Green Energy
(4, 4),
-- RFQ 5 assigned to Quality Materials and Industrial Solutions
(5, 6),
(5, 3);

-- =============================================
-- SEED QUOTATIONS
-- =============================================

INSERT INTO quotations (rfq_id, vendor_id, tax_percent, notes, status, submitted_at) VALUES
(1, 2, 18.00, 'Premium quality office furniture with 2-year warranty. Installation included.', 'submitted', '2026-06-05 14:30:00'),
(1, 3, 18.00, 'Competitive pricing with 3-year warranty. Free delivery and assembly.', 'submitted', '2026-06-06 10:15:00'),
(2, 1, 18.00, 'Latest generation laptops with manufacturer warranty. Bulk discount applied.', 'selected', '2026-06-15 16:00:00'),
(3, 2, 18.00, 'Annual supply contract with monthly delivery schedule.', 'submitted', '2026-06-10 11:00:00'),
(5, 6, 18.00, 'Premium grade materials with quality certification.', 'rejected', '2026-05-20 09:30:00'),
(5, 3, 18.00, 'Industrial grade materials with fast delivery.', 'selected', '2026-05-21 14:00:00');

-- =============================================
-- SEED QUOTATION LINE ITEMS
-- =============================================

INSERT INTO quotation_line_items (quotation_id, item_name, quantity, unit_price, total, delivery_days) VALUES
-- Quotation 1 (Office Furniture - Vendor 2)
(1, 'Executive Desk', 50, 450.00, 22500.00, 30),
(1, 'Office Chair (Ergonomic)', 50, 250.00, 12500.00, 30),
(1, 'Filing Cabinet (4-drawer)', 25, 180.00, 4500.00, 30),
(1, 'Conference Table (12-seater)', 5, 1200.00, 6000.00, 45),
-- Quotation 2 (Office Furniture - Vendor 3)
(2, 'Executive Desk', 50, 425.00, 21250.00, 25),
(2, 'Office Chair (Ergonomic)', 50, 235.00, 11750.00, 25),
(2, 'Filing Cabinet (4-drawer)', 25, 175.00, 4375.00, 25),
(2, 'Conference Table (12-seater)', 5, 1150.00, 5750.00, 35),
-- Quotation 3 (Laptops - Vendor 1)
(3, 'Laptop - i7, 16GB RAM, 512GB SSD', 100, 1200.00, 120000.00, 15),
(3, 'Laptop Bag', 100, 25.00, 2500.00, 15),
(3, 'Wireless Mouse', 100, 15.00, 1500.00, 15),
-- Quotation 4 (Stationery - Vendor 2)
(4, 'A4 Paper (Ream)', 500, 4.50, 2250.00, 7),
(4, 'Ballpoint Pen (Blue)', 2000, 0.50, 1000.00, 7),
(4, 'File Folders', 1000, 1.20, 1200.00, 7),
(4, 'Stapler', 50, 8.00, 400.00, 7),
-- Quotation 5 (Raw Materials - Vendor 6)
(5, 'Steel Sheets 2mm', 5000, 3.50, 17500.00, 20),
(5, 'Aluminum Rods 10mm', 3000, 4.20, 12600.00, 20),
-- Quotation 6 (Raw Materials - Vendor 3)
(6, 'Steel Sheets 2mm', 5000, 3.30, 16500.00, 15),
(6, 'Aluminum Rods 10mm', 3000, 4.00, 12000.00, 15);

-- =============================================
-- SEED APPROVALS
-- =============================================

INSERT INTO approvals (rfq_id, quotation_id, approver_id, level, status, remarks, actioned_at) VALUES
-- Approval chain for Quotation 3 (Laptops) - Both levels approved
(2, 3, 3, 1, 'approved', 'Good pricing and specifications meet requirements.', '2026-06-16 10:00:00'),
(2, 3, 4, 2, 'approved', 'Budget approved. Proceed with purchase order.', '2026-06-16 14:00:00'),
-- Approval chain for Quotation 6 (Raw Materials) - Both levels approved
(5, 6, 3, 1, 'approved', 'Better pricing and faster delivery than competitor.', '2026-05-22 15:30:00'),
(5, 6, 4, 2, 'approved', 'Approved for procurement.', '2026-05-22 16:00:00'),
-- Approval chain for Quotation 5 (Raw Materials) - Rejected at Level 1
(5, 5, 3, 1, 'rejected', 'Pricing too high compared to alternative vendor.', '2026-05-22 15:30:00'),
(5, 5, 4, 2, 'rejected', 'Auto-rejected due to rejection at level 1', '2026-05-22 15:30:00'),
-- Pending 2-level approval chain for Quotation 1
(1, 1, 3, 1, 'pending', NULL, NULL),
(1, 1, 4, 2, 'pending', NULL, NULL);

-- =============================================
-- SEED PURCHASE ORDERS
-- =============================================

INSERT INTO purchase_orders (po_number, rfq_id, quotation_id, vendor_id, status, po_date, due_date, subtotal, cgst, sgst, grand_total) VALUES
('PO-2026-001', 2, 3, 1, 'paid', '2026-06-17', '2026-07-17', 124000.00, 11160.00, 11160.00, 146320.00),
('PO-2026-002', 5, 6, 3, 'approved', '2026-05-23', '2026-06-23', 28500.00, 2565.00, 2565.00, 33630.00);

-- =============================================
-- SEED ACTIVITY LOGS
-- =============================================

INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, created_at) VALUES
(2, 'CREATE', 'rfq', 1, 'Created RFQ: Office Furniture for New Branch', '2026-06-01 09:00:00'),
(2, 'CREATE', 'rfq', 2, 'Created RFQ: Laptop Procurement Q3 2026', '2026-06-01 10:30:00'),
(2, 'PUBLISH', 'rfq', 1, 'Published RFQ: Office Furniture for New Branch', '2026-06-01 11:00:00'),
(2, 'PUBLISH', 'rfq', 2, 'Published RFQ: Laptop Procurement Q3 2026', '2026-06-01 14:00:00'),
(2, 'ASSIGN_VENDOR', 'rfq', 1, 'Assigned vendor: Office Essentials Ltd to RFQ #1', '2026-06-01 14:30:00'),
(2, 'ASSIGN_VENDOR', 'rfq', 1, 'Assigned vendor: Industrial Solutions to RFQ #1', '2026-06-01 14:35:00'),
(2, 'ASSIGN_VENDOR', 'rfq', 2, 'Assigned vendor: TechSupplies Inc to RFQ #2', '2026-06-01 15:00:00'),
(5, 'SUBMIT', 'quotation', 1, 'Submitted quotation for RFQ: Office Furniture for New Branch', '2026-06-05 14:30:00'),
(5, 'SUBMIT', 'quotation', 2, 'Submitted quotation for RFQ: Office Furniture for New Branch', '2026-06-06 10:15:00'),
(5, 'SUBMIT', 'quotation', 3, 'Submitted quotation for RFQ: Laptop Procurement Q3 2026', '2026-06-15 16:00:00'),
(3, 'APPROVE', 'approval', 1, 'Approved quotation #3 for RFQ: Laptop Procurement Q3 2026', '2026-06-16 10:00:00'),
(4, 'APPROVE', 'approval', 2, 'Final approval for quotation #3 - authorized for PO creation', '2026-06-16 14:00:00'),
(2, 'CREATE', 'invoice', 1, 'Created Purchase Order: PO-2026-001 for TechSupplies Inc', '2026-06-17 09:00:00'),
(2, 'APPROVE', 'invoice', 1, 'Approved Purchase Order: PO-2026-001', '2026-06-17 10:00:00'),
(2, 'PAYMENT_COMPLETED', 'invoice', 1, 'Payment completed for PO-2026-001 (₹146,320.00)', '2026-06-18 15:30:00'),
(2, 'CREATE', 'vendor', 1, 'Created vendor: TechSupplies Inc', '2026-05-15 10:00:00'),
(2, 'CREATE', 'vendor', 2, 'Created vendor: Office Essentials Ltd', '2026-05-15 10:30:00'),
(2, 'UPDATE', 'vendor', 1, 'Updated vendor status to active: TechSupplies Inc', '2026-05-15 11:00:00'),
(2, 'BLOCK', 'vendor', 6, 'Blocked vendor: Quality Materials - Reason: Delayed deliveries', '2026-05-28 14:00:00'),
(2, 'CREATE', 'rfq', 3, 'Created RFQ: Annual Stationery Supply', '2026-05-20 09:00:00'),
(2, 'PUBLISH', 'rfq', 3, 'Published RFQ: Annual Stationery Supply', '2026-05-20 09:30:00'),
(5, 'SUBMIT', 'quotation', 4, 'Submitted quotation for RFQ: Annual Stationery Supply', '2026-06-10 11:00:00'),
(3, 'APPROVE', 'approval', 3, 'Approved quotation #6 for RFQ: Raw Material Supply Q3', '2026-05-22 15:30:00'),
(4, 'APPROVE', 'approval', 4, 'Final approval for quotation #6 - authorized for PO creation', '2026-05-22 16:00:00'),
(2, 'CREATE', 'invoice', 2, 'Created Purchase Order: PO-2026-002 for Industrial Solutions', '2026-05-23 09:00:00'),
(2, 'UPDATE', 'vendor', 3, 'Updated contact information for vendor: Industrial Solutions', '2026-06-03 10:30:00'),
(3, 'REJECT', 'approval', 5, 'Rejected quotation #5 - Pricing too high compared to alternatives', '2026-05-22 15:30:00'),
(2, 'CREATE', 'vendor', 4, 'Created vendor: Green Energy Corp', '2026-05-20 14:00:00'),
(2, 'CREATE', 'rfq', 4, 'Created RFQ: Solar Panel Installation', '2026-06-04 10:00:00'),
(2, 'ASSIGN_VENDOR', 'rfq', 4, 'Assigned vendor: Green Energy Corp to RFQ #4', '2026-06-04 10:30:00');

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 002_seed_data.sql completed successfully!';
  RAISE NOTICE 'Inserted sample data for testing and development.';
  RAISE NOTICE 'Users: 6 (1 admin, 1 officer, 2 managers, 2 vendors), Vendors: 6, RFQs: 5, Quotations: 6, POs: 2';
  RAISE NOTICE 'Approval workflow: 2-level approval chain (Procurement Head + Finance Approver)';
END $$;
