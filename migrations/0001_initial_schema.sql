-- ==============================================================================
-- Migration: 0001_initial_schema.sql
-- Sistema: GCS2 - Gestão e Controle de Abastecimento de Frota
-- Plataforma: Cloudflare D1 (Serverless SQLite)
-- ==============================================================================

-- 1. TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE VEÍCULOS
CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  version TEXT,
  color TEXT,
  year_fab INTEGER,
  year_model INTEGER,
  plate TEXT UNIQUE NOT NULL,
  renavam TEXT,
  chassi TEXT,
  crlv_number TEXT,
  owner_name TEXT,
  owner_doc TEXT,
  uf TEXT,
  city TEXT,
  license_date TEXT,
  license_year INTEGER,
  fuel_type_default TEXT DEFAULT 'Diesel S10',
  tank_capacity REAL DEFAULT 0,
  photo_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'working',
  status_date TEXT,
  status_reason TEXT,
  status_workshop TEXT,
  status_return_forecast TEXT,
  status_notes TEXT,
  odometer_working INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE SESSÕES / CARRINHOS DE ABASTECIMENTO
CREATE TABLE IF NOT EXISTS fueling_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  notes TEXT,
  total_vehicles INTEGER DEFAULT 0,
  total_liters REAL DEFAULT 0,
  total_cost REAL DEFAULT 0,
  created_by TEXT,
  finalized_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE REGISTROS INDIVIDUAIS DE ABASTECIMENTO
CREATE TABLE IF NOT EXISTS fuel_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER,
  vehicle_id INTEGER NOT NULL,
  driver_name TEXT,
  fuel_station TEXT,
  fuel_type TEXT NOT NULL,
  is_full_tank INTEGER DEFAULT 1,
  odometer_working INTEGER NOT NULL DEFAULT 1,
  km_previous REAL,
  km_current REAL,
  km_driven REAL,
  liters REAL NOT NULL,
  price_per_liter REAL NOT NULL,
  total_cost REAL NOT NULL,
  consumption_kml REAL,
  cost_per_km REAL,
  payment_method TEXT,
  photo_dashboard_url TEXT,
  photo_pump_url TEXT,
  receipt_url TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES fueling_sessions(id) ON DELETE SET NULL,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 5. TABELA DE DESPESAS DE VEÍCULOS
CREATE TABLE IF NOT EXISTS vehicle_expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  date TEXT NOT NULL,
  cost REAL NOT NULL,
  km REAL,
  receipt_url TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 6. TABELA DE REGISTROS DE MANUTENÇÃO
CREATE TABLE IF NOT EXISTS maintenance_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  problem TEXT NOT NULL,
  service TEXT,
  workshop TEXT,
  entry_date TEXT NOT NULL,
  exit_date TEXT,
  km REAL,
  cost REAL DEFAULT 0,
  parts TEXT,
  notes TEXT,
  receipt_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 7. TABELA DE LEMBRETES DE MANUTENÇÃO
CREATE TABLE IF NOT EXISTS maintenance_reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  trigger_km REAL,
  trigger_date TEXT,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 8. TABELA DE DOCUMENTOS E METADADOS
CREATE TABLE IF NOT EXISTS vehicle_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  issue_date TEXT,
  expiration_date TEXT,
  file_url TEXT NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- 9. TABELA DE TRILHA DE AUDITORIA
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  action TEXT NOT NULL,
  user_name TEXT,
  old_data TEXT,
  new_data TEXT,
  justification TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- ÍNDICES DE PERFORMANCE E INTEGRIDADE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_fueling_sessions_status ON fueling_sessions(status);
CREATE INDEX IF NOT EXISTS idx_fueling_sessions_date ON fueling_sessions(date);
CREATE INDEX IF NOT EXISTS idx_fuel_records_session ON fuel_records(session_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_vehicle ON fuel_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fuel_records_created ON fuel_records(created_at);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle ON vehicle_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reminders_vehicle ON maintenance_reminders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reminders_status ON maintenance_reminders(status);
CREATE INDEX IF NOT EXISTS idx_documents_vehicle ON vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
