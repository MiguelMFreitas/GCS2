import { getDb, query, run } from '../config/database.js';
import { getFleetReports } from '../controllers/reportController.js';
import { createFleetPDFDoc, generateFleetReportPDF, formatCurrency, formatLiters, formatKm, formatDateBR } from '../../../client/src/services/exportService.js';

async function runEndToEndReportTest() {
  console.log('================================================================');
  console.log('🚀 TESTE DE PONTA A PONTA: FLUXO COMPLETO DE GERAÇÃO DE RELATÓRIO');
  console.log('================================================================\n');

  await getDb();

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASSOU: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FALHOU: ${message}`);
      failed++;
    }
  }

  // 1. Cadastrar um novo veículo de teste para este teste
  const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
  const testPlate = `AXO${randomSuffix}`;
  const vResult = run(
    "INSERT INTO vehicles (name, model, brand, plate, status, odometer_working, fuel_type_default) VALUES (?, 'Axor 2544', 'Mercedes-Benz', ?, 'working', 1, 'Diesel S10')",
    [`Caminhão Mercedes Axor ${randomSuffix}`, testPlate]
  );
  const vehicleId = vResult.lastInsertRowid;
  assert(vehicleId > 0, `Veículo de teste inserido com ID ${vehicleId} e placa ${testPlate}`);

  // 2. Cadastrar abastecimento do veículo com data de hoje (2026-10-01)
  const testDate = '2026-10-01';
  const testTime = '2026-10-01 14:30:00';
  const testKmCurrent = 145890;
  const testLiters = 85.5;
  const testPrice = 6.89;
  const testTotal = 589.10;

  // Create session for today
  const sResult = run(
    "INSERT INTO fueling_sessions (code, date, status, created_by) VALUES (?, '2026-10-01', 'in_progress', 'Gerente')",
    [`ABAST-2026-10-01-${randomSuffix}`]
  );
  const sessionId = sResult.lastInsertRowid;

  const fResult = run(
    `INSERT INTO fuel_records (
      session_id, vehicle_id, driver_name, fuel_type, is_full_tank,
      odometer_working, km_previous, km_current, km_driven,
      liters, price_per_liter, total_cost, consumption_kml, cost_per_km,
      photo_dashboard_url, photo_pump_url, created_at
    ) VALUES (?, ?, 'Roberto Silva', 'Diesel S10', 1, 1, 145200, ?, 690, ?, ?, ?, 8.07, 0.85, 'https://img.mock/dash.jpg', 'https://img.mock/pump.jpg', ?)`,
    [sessionId, vehicleId, testKmCurrent, testLiters, testPrice, testTotal, testTime]
  );
  const fuelId = fResult.lastInsertRowid;
  assert(fuelId > 0, `Abastecimento inserido com ID ${fuelId}`);

  // 3. Confirmar que ele foi salvo no banco
  const savedRecord = query('SELECT * FROM fuel_records WHERE id = ?', [fuelId])[0];
  assert(savedRecord && savedRecord.id === fuelId, 'Abastecimento confirmado na tabela fuel_records');
  assert(Number(savedRecord.total_cost) === testTotal, `Valor total salvo no banco: R$ ${savedRecord.total_cost}`);
  assert(Number(savedRecord.liters) === testLiters, `Litros salvos no banco: ${savedRecord.liters} L`);
  assert(Number(savedRecord.price_per_liter) === testPrice, `Preço por litro salvo: R$ ${savedRecord.price_per_liter}`);
  assert(Number(savedRecord.km_current) === testKmCurrent, `KM Atual salvo: ${savedRecord.km_current} km`);

  // Helper to mock controller response
  const callReportController = (queryParams) => {
    let responseData = null;
    let statusCode = 200;
    const req = { query: queryParams };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };
    getFleetReports(req, res);
    return { statusCode, data: responseData };
  };

  // 4. Testar consulta ao endpoint de relatórios para o período exato (01/10/2026 até 01/10/2026)
  console.log('\n🔹 4. Consultando relatório para 01/10/2026 a 01/10/2026...');
  const repToday = callReportController({ start_date: '2026-10-01', end_date: '2026-10-01' });
  assert(repToday.statusCode === 200, 'API de relatórios respondeu HTTP 200');
  assert(repToday.data.records.length >= 1, `Relatório retornou ${repToday.data.records.length} registros`);

  // 5. Confirmar que o abastecimento recém cadastrado aparece no relatório
  const foundInReport = repToday.data.records.find(r => r.id === fuelId);
  assert(!!foundInReport, 'O abastecimento cadastrado está presente no relatório retornado');
  assert(foundInReport.vehicle_name.includes('Caminhão Mercedes Axor'), `Nome do veículo: ${foundInReport.vehicle_name}`);
  assert(foundInReport.vehicle_plate === testPlate, `Placa do veículo: ${foundInReport.vehicle_plate}`);
  assert(Number(foundInReport.km_current) === testKmCurrent, `KM Atual no relatório: ${foundInReport.km_current}`);
  assert(Number(foundInReport.liters) === testLiters, `Litros no relatório: ${foundInReport.liters}`);
  assert(Number(foundInReport.price_per_liter) === testPrice, `Preço por litro no relatório: ${foundInReport.price_per_liter}`);
  assert(Number(foundInReport.total_cost) === testTotal, `Valor total no relatório: ${foundInReport.total_cost}`);

  // 6. Testar geração de PDF a partir dos dados do relatório
  console.log('\n🔹 6. Gerando PDF com o motor do sistema...');
  const pdfDoc = createFleetPDFDoc({
    reportType: 'individual',
    title: 'RELATÓRIO DE GESTÃO DE FROTA',
    periodStr: '01/10/2026 a 01/10/2026',
    dateStr: '2026-10-01',
    records: repToday.data.records,
    vehicles_data: repToday.data.vehicles_data,
    summary: repToday.data.summary
  });

  const pdfPages = pdfDoc.internal.getNumberOfPages();
  assert(pdfPages >= 1, `PDF gerado com sucesso contendo ${pdfPages} página(s)`);
  const pdfText = pdfDoc.output().toUpperCase();
  assert(pdfText.includes('CAMINHÃO MERCEDES AXOR') || pdfText.includes('AXO2026'), 'PDF contém o nome ou placa do veículo abastecido');
  assert(pdfText.includes('GERENCIAMENTO DE FROTA'), 'PDF contém o cabeçalho executivo');
  assert(pdfText.includes('RESUMO GERAL DA FROTA'), 'PDF contém a consolidação final da frota');

  // 7. Testar com outros filtros
  console.log('\n🔹 7. Testando filtros por veículo e por combustível...');
  // Filtro pelo veículo específico
  const repVehicle = callReportController({ vehicle_id: String(vehicleId) });
  assert(repVehicle.data.records.length === 1, `Filtro por veículo ID ${vehicleId} retornou exatamente 1 registro`);

  // Filtro por combustível Diesel S10
  const repDiesel = callReportController({ fuel_type: 'Diesel' });
  assert(repDiesel.data.records.some(r => r.id === fuelId), 'Filtro por Diesel contém o abastecimento');

  // Filtro por combustível que não existe para esse veículo (ex: Etanol)
  const repEtanol = callReportController({ vehicle_id: String(vehicleId), fuel_type: 'Etanol' });
  assert(repEtanol.data.records.length === 0, 'Filtro por veículo + combustível diferente retornou 0 registros');

  // 8. Testar período sem registros
  console.log('\n🔹 8. Testando período sem registros (2025-01-01 a 2025-01-02)...');
  const repEmpty = callReportController({ start_date: '2025-01-01', end_date: '2025-01-02' });
  assert(repEmpty.statusCode === 200, 'Período sem registros retorna HTTP 200');
  assert(repEmpty.data.records.length === 0, 'Records é um array vazio');
  assert(repEmpty.data.vehicles_data.length === 0, 'Vehicles_data é um array vazio');
  assert(repEmpty.data.summary.total_records === 0, 'Summary indica 0 total_records');

  console.log('\n================================================================');
  console.log(`📊 RESULTADO FINAL DOS TESTES: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEndToEndReportTest().catch((err) => {
  console.error('Erro fatal no teste de relatório:', err);
  process.exit(1);
});
