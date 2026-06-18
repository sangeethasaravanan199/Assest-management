DROP TABLE IF EXISTS maintenance_requests;
DROP TABLE IF EXISTS asset_audit_files;
DROP TABLE IF EXISTS asset_audits;
DROP TABLE IF EXISTS asset_assignments;
DROP TABLE IF EXISTS asset_stock_logs;
DROP TABLE IF EXISTS assets;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'auditor', 'it', 'employee')),
  department VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  asset_tag VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(180) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('laptop', 'desktop', 'monitor', 'printer', 'network_device')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('available', 'reserved', 'assigned', 'maintenance', 'lost', 'retired')),
  purchase_date DATE NOT NULL,
  warranty_expiry DATE NOT NULL,
  location VARCHAR(120) NOT NULL,
  specs TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE asset_assignments (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id),
  employee_id INTEGER NOT NULL REFERENCES users(id),
  assigned_by INTEGER NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expected_return_date DATE,
  returned_at TIMESTAMP,
  notes TEXT
);

CREATE TABLE maintenance_requests (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id),
  requested_by INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  cost NUMERIC(10,2),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE TABLE asset_stock_logs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  type VARCHAR(30) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  location VARCHAR(120) NOT NULL,
  vendor VARCHAR(180),
  purchase_date DATE,
  warranty_expiry DATE,
  unit_cost NUMERIC(12,2),
  default_status VARCHAR(20) NOT NULL,
  remarks TEXT,
  source VARCHAR(20) NOT NULL CHECK (source IN ('purchase', 'return', 'adjustment')),
  added_by INTEGER NOT NULL REFERENCES users(id),
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_asset_ids INTEGER[] NOT NULL DEFAULT '{}'
);

CREATE TABLE asset_audits (
  id SERIAL PRIMARY KEY,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  auditor_id INTEGER NOT NULL REFERENCES users(id),
  audit_status VARCHAR(20) NOT NULL CHECK (audit_status IN ('verified', 'missing', 'damaged')),
  physical_status VARCHAR(20) NOT NULL CHECK (physical_status IN ('assigned', 'available', 'repair', 'retired')),
  physical_condition VARCHAR(20) NOT NULL CHECK (physical_condition IN ('good', 'damaged', 'not_working', 'not_found')),
  remarks TEXT,
  reason TEXT,
  responsible_person VARCHAR(180),
  target_date DATE,
  resolution_status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'in_progress', 'closed')),
  audit_date DATE NOT NULL,
  compliant BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (asset_id)
);

CREATE TABLE asset_audit_files (
  id SERIAL PRIMARY KEY,
  audit_id INTEGER NOT NULL REFERENCES asset_audits(id) ON DELETE CASCADE,
  asset_id INTEGER NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  uploaded_by INTEGER NOT NULL REFERENCES users(id),
  file_kind VARCHAR(10) NOT NULL CHECK (file_kind IN ('photo', 'video')),
  original_name VARCHAR(260) NOT NULL,
  stored_name VARCHAR(260) NOT NULL UNIQUE,
  mime_type VARCHAR(150) NOT NULL,
  size_bytes BIGINT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
