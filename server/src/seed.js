import bcrypt from 'bcryptjs';
import { getDb, run, get } from './config/database.js';

export async function seedDatabase() {
  await getDb();

  console.log('🧹 Limpando dados existentes para seed...');
  run('DELETE FROM audit_logs');
  run('DELETE FROM vehicle_documents');
  run('DELETE FROM maintenance_reminders');
  run('DELETE FROM maintenance_records');
  run('DELETE FROM vehicle_expenses');
  run('DELETE FROM fuel_records');
  run('DELETE FROM fueling_sessions');
  run('DELETE FROM vehicles');
  run('DELETE FROM users');

  // 1. Users
  const salt = bcrypt.genSaltSync(10);
  const hashGerente = bcrypt.hashSync('Civam123', salt);
  const hashOp = bcrypt.hashSync('123456', salt);

  run(
    'INSERT INTO users (username, name, email, password_hash, role, active) VALUES (?, ?, ?, ?, ?, 1)',
    ['gerente', 'Gerente', 'gerente@gcs.com.br', hashGerente, 'admin']
  );
  run(
    'INSERT INTO users (username, name, email, password_hash, role, active) VALUES (?, ?, ?, ?, ?, 1)',
    ['operador', 'Operador de Pista', 'operador@gcs.com.br', hashOp, 'operator']
  );

  // 2. Vehicles
  const vehiclesData = [
    {
      name: 'Mercedes 710',
      brand: 'Mercedes-Benz',
      model: '710 Plus',
      version: 'Baú 3/4',
      color: 'Branco',
      year_fab: 2008,
      year_model: 2009,
      plate: 'ABC1D23',
      renavam: '00987654321',
      chassi: '9BM9702209B123456',
      crlv_number: '123456789012',
      owner_name: 'GCS Logística e Transportes Ltda',
      owner_doc: '12.345.678/0001-90',
      uf: 'SP',
      city: 'São Paulo',
      license_date: '2026-08-15',
      license_year: 2026,
      fuel_type_default: 'Diesel S10',
      tank_capacity: 100,
      photo_url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80',
      notes: 'Caminhão principal para entregas na Grande SP. Manutenção em dia.',
      status: 'working',
      odometer_working: 1
    },
    {
      name: 'Volks Delivery 8.160',
      brand: 'Volkswagen',
      model: 'Delivery 8.160',
      version: 'Advantech',
      color: 'Prata',
      year_fab: 2014,
      year_model: 2015,
      plate: 'DEF2G34',
      renavam: '00876543210',
      chassi: '9BW816000FB234567',
      crlv_number: '234567890123',
      owner_name: 'GCS Logística e Transportes Ltda',
      owner_doc: '12.345.678/0001-90',
      uf: 'SP',
      city: 'Campinas',
      license_date: '2026-07-20',
      license_year: 2026,
      fuel_type_default: 'Diesel S10',
      tank_capacity: 150,
      photo_url: 'https://images.unsplash.com/photo-1586191582056-a60d5ebffb2e?auto=format&fit=crop&w=600&q=80',
      notes: 'Rota interior e distribuição regional.',
      status: 'working',
      odometer_working: 1
    },
    {
      name: 'Fiat Fiorino 1.4',
      brand: 'Fiat',
      model: 'Fiorino',
      version: 'Hard Working 1.4 EVO',
      color: 'Branco',
      year_fab: 2019,
      year_model: 2020,
      plate: 'GHI3J45',
      renavam: '00765432109',
      chassi: '9BD225000K1345678',
      crlv_number: '345678901234',
      owner_name: 'GCS Logística e Transportes Ltda',
      owner_doc: '12.345.678/0001-90',
      uf: 'SP',
      city: 'São Paulo',
      license_date: '2026-09-01',
      license_year: 2026,
      fuel_type_default: 'Gasolina',
      tank_capacity: 55,
      photo_url: 'https://images.unsplash.com/photo-1559297434-fae8a1916a79?auto=format&fit=crop&w=600&q=80',
      notes: 'Entregas expressas urbanas e centros restritos.',
      status: 'working',
      odometer_working: 1
    },
    {
      name: 'VW Saveiro Robust',
      brand: 'Volkswagen',
      model: 'Saveiro',
      version: 'Robust 1.6 MSI',
      color: 'Branco',
      year_fab: 2018,
      year_model: 2019,
      plate: 'JKL4M56',
      renavam: '00654321098',
      chassi: '9BW226000J1456789',
      crlv_number: '456789012345',
      owner_name: 'GCS Logística e Transportes Ltda',
      owner_doc: '12.345.678/0001-90',
      uf: 'SP',
      city: 'São Paulo',
      license_date: '2026-06-10',
      license_year: 2026,
      fuel_type_default: 'Gasolina',
      tank_capacity: 55,
      photo_url: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=600&q=80',
      notes: 'Apoio operacional e entregas técnicas.',
      status: 'working',
      odometer_working: 1
    },
    {
      name: 'Toyota Hilux CD',
      brand: 'Toyota',
      model: 'Hilux',
      version: 'SRV 2.8 4x4 Diesel Aut.',
      color: 'Prata',
      year_fab: 2021,
      year_model: 2022,
      plate: 'MNO5P67',
      renavam: '00543210987',
      chassi: '8AJBA3CD7N0567890',
      crlv_number: '567890123456',
      owner_name: 'GCS Logística e Transportes Ltda',
      owner_doc: '12.345.678/0001-90',
      uf: 'SP',
      city: 'São Paulo',
      license_date: '2026-05-18',
      license_year: 2026,
      fuel_type_default: 'Diesel S10',
      tank_capacity: 80,
      photo_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80',
      notes: 'Supervisão de frota e rotas de longa distância.',
      status: 'working',
      odometer_working: 1
    },
    {
      name: 'Renault Master Furgão',
      brand: 'Renault',
      model: 'Master',
      version: 'L2H2 2.3 dCi',
      color: 'Branco',
      year_fab: 2017,
      year_model: 2018,
      plate: 'PQR6S78',
      renavam: '00432109876',
      chassi: '93YMA1234H1678901',
      crlv_number: '678901234567',
      owner_name: 'GCS Logística e Transportes Ltda',
      owner_doc: '12.345.678/0001-90',
      uf: 'SP',
      city: 'Guarulhos',
      license_date: '2026-04-12',
      license_year: 2026,
      fuel_type_default: 'Diesel S10',
      tank_capacity: 100,
      photo_url: 'https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80',
      notes: 'Odômetro do painel digital com sensor quebrado. Aguardando peça de reposição.',
      status: 'working',
      odometer_working: 0 // ODÔMETRO NÃO FUNCIONANDO
    },
    {
      name: 'Ford Cargo 2428',
      brand: 'Ford',
      model: 'Cargo 2428',
      version: 'Truck 6x2',
      color: 'Azul',
      year_fab: 2012,
      year_model: 2013,
      plate: 'STU7V89',
      renavam: '00321098765',
      chassi: '9BF242800D1789012',
      crlv_number: '789012345678',
      owner_name: 'GCS Logística e Transportes Ltda',
      owner_doc: '12.345.678/0001-90',
      uf: 'SP',
      city: 'Santos',
      license_date: '2026-03-30',
      license_year: 2026,
      fuel_type_default: 'Diesel Comum',
      tank_capacity: 275,
      photo_url: 'https://images.unsplash.com/photo-1501700493788-fa1a4fc9fe62?auto=format&fit=crop&w=600&q=80',
      notes: 'Em revisão de câmbio e embreagem na Oficina Diesel Tech.',
      status: 'maintenance',
      status_date: '2026-09-10',
      status_reason: 'Revisão e troca do kit de embreagem',
      status_workshop: 'Oficina Diesel Tech Santos',
      status_return_forecast: '2026-09-22',
      odometer_working: 1
    },
    {
      name: 'Chevrolet Onix Plus',
      brand: 'Chevrolet',
      model: 'Onix Plus',
      version: 'LT 1.0 Flex',
      color: 'Preto',
      year_fab: 2020,
      year_model: 2021,
      plate: 'VWX8Y90',
      renavam: '00210987654',
      chassi: '9BG123450M1890123',
      crlv_number: '890123456789',
      owner_name: 'GCS Logística e Transportes Ltda',
      owner_doc: '12.345.678/0001-90',
      uf: 'SP',
      city: 'São Paulo',
      license_date: '2026-10-05',
      license_year: 2026,
      fuel_type_default: 'Gasolina',
      tank_capacity: 44,
      photo_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
      notes: 'Carro da diretoria parado temporariamente aguardando novo motorista.',
      status: 'stopped',
      status_date: '2026-09-01',
      status_reason: 'Aguardando contratação de motorista executivo',
      odometer_working: 1
    }
  ];

  const vehicleIds = {};
  for (const v of vehiclesData) {
    const res = run(
      `INSERT INTO vehicles (
        name, brand, model, version, color, year_fab, year_model,
        plate, renavam, chassi, crlv_number, owner_name, owner_doc,
        uf, city, license_date, license_year, fuel_type_default,
        tank_capacity, photo_url, notes, status, status_date,
        status_reason, status_workshop, status_return_forecast,
        odometer_working
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        v.name, v.brand, v.model, v.version, v.color, v.year_fab, v.year_model,
        v.plate, v.renavam, v.chassi, v.crlv_number, v.owner_name, v.owner_doc,
        v.uf, v.city, v.license_date, v.license_year, v.fuel_type_default,
        v.tank_capacity, v.photo_url, v.notes, v.status, v.status_date || null,
        v.status_reason || null, v.status_workshop || null, v.status_return_forecast || null,
        v.odometer_working
      ]
    );
    vehicleIds[v.plate] = res.lastInsertRowid;
  }

  // 3. Previous Week Fueling Session (Finalized)
  const prevSessionRes = run(
    `INSERT INTO fueling_sessions (
      code, date, status, notes, total_vehicles, total_liters, total_cost, created_by, finalized_at
    ) VALUES (?, ?, 'completed', ?, ?, ?, ?, ?, ?)`,
    [
      'ABAST-2026-09-07-001',
      '2026-09-07',
      'Abastecimento geral de segunda-feira - Feriado da Independência',
      6,
      273.50,
      1889.34,
      'Carlos Frotista',
      '2026-09-07 11:45:00'
    ]
  );
  const prevSessionId = prevSessionRes.lastInsertRowid;

  // Fuel records for previous session
  // Mercedes 710
  run(
    `INSERT INTO fuel_records (
      session_id, vehicle_id, driver_name, fuel_station, fuel_type,
      is_full_tank, odometer_working, km_previous, km_current, km_driven,
      liters, price_per_liter, total_cost, consumption_kml, cost_per_km,
      payment_method, photo_dashboard_url, photo_pump_url, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, 1, 1, 232718, 233020, 302, 42.50, 6.97, 296.23, 7.11, 0.98, 'Cartão Frota', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1527018607616-a656a38cb4d9?auto=format&fit=crop&w=400&q=80', 'Abastecimento tranquilo Posto Shell Bandeirantes', '2026-09-07 08:30:00')`,
    [prevSessionId, vehicleIds['ABC1D23'], 'Marcos Silva', 'Posto Shell Bandeirantes', 'Diesel S10']
  );

  // Volks Delivery
  run(
    `INSERT INTO fuel_records (
      session_id, vehicle_id, driver_name, fuel_station, fuel_type,
      is_full_tank, odometer_working, km_previous, km_current, km_driven,
      liters, price_per_liter, total_cost, consumption_kml, cost_per_km,
      payment_method, photo_dashboard_url, photo_pump_url, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, 1, 1, 189075, 189450, 375, 55.20, 6.95, 383.64, 6.79, 1.02, 'Cartão Frota', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1527018607616-a656a38cb4d9?auto=format&fit=crop&w=400&q=80', 'Tanque completo para rota Campinas', '2026-09-07 08:45:00')`,
    [prevSessionId, vehicleIds['DEF2G34'], 'José Santos', 'Posto Ipiranga Anhanguera', 'Diesel S10']
  );

  // Fiat Fiorino
  run(
    `INSERT INTO fuel_records (
      session_id, vehicle_id, driver_name, fuel_station, fuel_type,
      is_full_tank, odometer_working, km_previous, km_current, km_driven,
      liters, price_per_liter, total_cost, consumption_kml, cost_per_km,
      payment_method, photo_dashboard_url, photo_pump_url, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, 1, 1, 93840, 94320, 480, 38.60, 6.19, 238.93, 12.44, 0.50, 'Cartão Frota', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1527018607616-a656a38cb4d9?auto=format&fit=crop&w=400&q=80', 'Gasolina comum', '2026-09-07 09:05:00')`,
    [prevSessionId, vehicleIds['GHI3J45'], 'Lucas Pereira', 'Posto BR Marginal', 'Gasolina']
  );

  // Saveiro
  run(
    `INSERT INTO fuel_records (
      session_id, vehicle_id, driver_name, fuel_station, fuel_type,
      is_full_tank, odometer_working, km_previous, km_current, km_driven,
      liters, price_per_liter, total_cost, consumption_kml, cost_per_km,
      payment_method, photo_dashboard_url, photo_pump_url, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, 1, 1, 112050, 112500, 450, 41.20, 6.19, 255.03, 10.92, 0.57, 'Cartão Frota', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1527018607616-a656a38cb4d9?auto=format&fit=crop&w=400&q=80', 'Gasolina comum', '2026-09-07 09:20:00')`,
    [prevSessionId, vehicleIds['JKL4M56'], 'Anderson Souza', 'Posto BR Marginal', 'Gasolina']
  );

  // Hilux
  run(
    `INSERT INTO fuel_records (
      session_id, vehicle_id, driver_name, fuel_station, fuel_type,
      is_full_tank, odometer_working, km_previous, km_current, km_driven,
      liters, price_per_liter, total_cost, consumption_kml, cost_per_km,
      payment_method, photo_dashboard_url, photo_pump_url, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, 1, 1, 65280, 65800, 520, 51.00, 6.97, 355.47, 10.20, 0.68, 'Cartão Frota', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1527018607616-a656a38cb4d9?auto=format&fit=crop&w=400&q=80', 'Diesel S10', '2026-09-07 09:40:00')`,
    [prevSessionId, vehicleIds['MNO5P67'], 'Rafael Lima', 'Posto Shell Castelo Branco', 'Diesel S10']
  );

  // Renault Master (SEM ODÔMETRO FUNCIONANDO)
  run(
    `INSERT INTO fuel_records (
      session_id, vehicle_id, driver_name, fuel_station, fuel_type,
      is_full_tank, odometer_working, km_previous, km_current, km_driven,
      liters, price_per_liter, total_cost, consumption_kml, cost_per_km,
      payment_method, photo_dashboard_url, photo_pump_url, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, 1, 0, NULL, NULL, NULL, 45.00, 6.95, 312.75, NULL, NULL, 'Cartão Frota', NULL, 'https://images.unsplash.com/photo-1527018607616-a656a38cb4d9?auto=format&fit=crop&w=400&q=80', 'Odômetro não funcional. Apenas litros e valor.', '2026-09-07 10:00:00')`,
    [prevSessionId, vehicleIds['PQR6S78'], 'Eduardo Oliveira', 'Posto Ipiranga', 'Diesel S10']
  );

  // 4. Maintenance & Expenses
  run(
    `INSERT INTO vehicle_expenses (vehicle_id, category, description, date, cost, km, notes)
     VALUES (?, 'Troca de Óleo', 'Troca de óleo de motor 15W40 e filtro lubrificante', '2026-08-20', 480.00, 230000, 'Realizado na oficina autorizada')`,
    [vehicleIds['ABC1D23']]
  );
  run(
    `INSERT INTO vehicle_expenses (vehicle_id, category, description, date, cost, km, notes)
     VALUES (?, 'Pneus', 'Substituição de 2 pneus dianteiros 215/75R17.5', '2026-07-15', 1850.00, 185000, 'Pneus Bridgestone novos')`,
    [vehicleIds['DEF2G34']]
  );

  // 5. Reminders
  run(
    `INSERT INTO maintenance_reminders (vehicle_id, title, category, trigger_km, trigger_date, status, notes)
     VALUES (?, 'Revisão dos 240.000 KM', 'Revisão', 240000, '2026-11-30', 'pending', 'Trocar filtro de combustível e filtro de ar')`,
    [vehicleIds['ABC1D23']]
  );
  run(
    `INSERT INTO maintenance_reminders (vehicle_id, title, category, trigger_km, trigger_date, status, notes)
     VALUES (?, 'Renovação do Seguro Allianz', 'Seguro', NULL, '2026-10-15', 'pending', 'Entrar em contato com corretora')`,
    [vehicleIds['DEF2G34']]
  );

  // 6. Documents
  run(
    `INSERT INTO vehicle_documents (vehicle_id, name, doc_type, issue_date, expiration_date, file_url, notes)
     VALUES (?, 'CRLV 2026 Digital', 'CRLV', '2026-01-10', '2026-12-31', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'Documento de licenciamento anual')`,
    [vehicleIds['ABC1D23']]
  );
  run(
    `INSERT INTO vehicle_documents (vehicle_id, name, doc_type, issue_date, expiration_date, file_url, notes)
     VALUES (?, 'Apólice de Seguro Frota 2026', 'Seguro', '2025-10-15', '2026-10-15', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'Cobertura completa contra colisão e terceiros')`,
    [vehicleIds['DEF2G34']]
  );

  console.log('✅ Base de dados populada com sucesso com frota e histórico de exemplo!');
}

// If run directly via node src/seed.js
if (process.argv[1].endsWith('seed.js')) {
  seedDatabase().then(() => {
    console.log('🏁 Processo de seed concluído.');
    process.exit(0);
  });
}
