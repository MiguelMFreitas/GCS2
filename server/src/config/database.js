import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'fleet.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbInstance = null;
let SQL = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(filebuffer);
  } else {
    dbInstance = new SQL.Database();
    saveDatabase();
  }

  initSchema();
  return dbInstance;
}

export function saveDatabase() {
  if (!dbInstance) return;
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

// Helpers for SQL execution with standard parameter binding and object returns
export function query(sql, params = []) {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

export function get(sql, params = []) {
  const rows = query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql, params = []) {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  const info = {
    changes: dbInstance.getRowsModified ? dbInstance.getRowsModified() : 1,
    lastInsertRowid: get('SELECT last_insert_rowid() as id')?.id || null
  };
  saveDatabase();
  return info;
}

export function exec(sql) {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.exec(sql);
  saveDatabase();
}

function initSchema() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'operator',
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

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
  `;
  dbInstance.exec(schema);
  saveDatabase();
}
