// Comprehensive PDF, Reports & Weekly Scope Validation Test Suite
import { createFleetPDFDoc, formatCurrency, formatLiters, formatKm, formatConsumption, formatDateBR } from './client/src/services/exportService.js';

async function runReportTests() {
  console.log('🧪 Iniciando Testes Automatizados da Interface de Relatórios, Lógica de Semanas e Motor PDF...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Formatters
  assert(formatCurrency(1353.51) === 'R$ 1.353,51', 'formatCurrency(1353.51) retorna R$ 1.353,51');
  assert(formatCurrency(6.97) === 'R$ 6,97', 'formatCurrency(6.97) retorna R$ 6,97 com vírgula padrão BR');
  assert(formatLiters(194.19) === '194,19 L', 'formatLiters(194.19) retorna 194,19 L');
  assert(formatKm(232941.8) === '232.941,8 km', 'formatKm(232941.8) retorna 232.941,8 km');
  assert(formatConsumption(7.42) === '7,42 km/L', 'formatConsumption(7.42) retorna 7,42 km/L');
  assert(formatDateBR('2026-09-15') === '15/09/2026', 'formatDateBR(2026-09-15) retorna 15/09/2026');

  // 2. Scenario 1: SEMANA 1 (14/09/2026 a 20/09/2026) - 4 abastecimentos, R$ 1.353,51
  const week1Records = [
    {
      vehicle_name: 'Mercedinha 710',
      vehicle_plate: 'NQM7096',
      fuel_type: 'Diesel S10',
      odometer_working: 1,
      km_previous: 232718.5,
      km_current: 232941.8,
      km_driven: 223.3,
      liters: 58.58,
      price_per_liter: 6.97,
      total_cost: 408.30,
      consumption_kml: 3.81,
      cost_per_km: 1.83,
      driver_name: 'Marcos Silva'
    },
    {
      vehicle_name: 'Volks Delivery 8.160',
      vehicle_plate: 'DEF2G34',
      fuel_type: 'Diesel S10',
      odometer_working: 1,
      km_previous: 189075,
      km_current: 189450,
      km_driven: 375,
      liters: 55.20,
      price_per_liter: 6.95,
      total_cost: 383.64,
      consumption_kml: 6.79,
      cost_per_km: 1.02,
      driver_name: 'José Santos'
    },
    {
      vehicle_name: 'Fiat Fiorino',
      vehicle_plate: 'GHI3J45',
      fuel_type: 'Gasolina',
      odometer_working: 1,
      km_previous: null, // First fueling
      km_current: 94320,
      km_driven: null,
      liters: 38.60,
      price_per_liter: 6.19,
      total_cost: 238.93,
      consumption_kml: null,
      cost_per_km: null,
      driver_name: 'Lucas Pereira'
    },
    {
      vehicle_name: 'Renault Master',
      vehicle_plate: 'PQR6S78',
      fuel_type: 'Diesel S10',
      odometer_working: 0, // Broken odometer
      km_previous: null,
      km_current: null,
      km_driven: null,
      liters: 46.40,
      price_per_liter: 6.95,
      total_cost: 322.64,
      consumption_kml: null,
      cost_per_km: null,
      driver_name: 'Eduardo Oliveira'
    }
  ];

  const week1TotalSpent = week1Records.reduce((s, r) => s + r.total_cost, 0);
  const week1TotalLiters = week1Records.reduce((s, r) => s + r.liters, 0);
  assert(Math.round(week1TotalSpent * 100) / 100 === 1353.51, `Semana 1 soma R$ 1.353,51 (calculado: R$ ${week1TotalSpent.toFixed(2)})`);
  assert(week1Records.length === 4, 'Semana 1 possui 4 abastecimentos');

  const docWeek1 = createFleetPDFDoc({
    reportType: 'semanal',
    title: 'RELATÓRIO SEMANAL DE ABASTECIMENTO',
    periodStr: '14/09/2026 a 20/09/2026',
    dateStr: '2026-09-20',
    records: week1Records,
    summary: { total_vehicles: 4, total_liters: week1TotalLiters, total_cost: week1TotalSpent }
  });

  const pageCountWeek1 = docWeek1.internal.getNumberOfPages();
  assert(pageCountWeek1 <= 2, `PDF da Semana 1 cabe em ${pageCountWeek1} página(s)`);

  // 3. Scenario 2: SEMANA 2 (21/09/2026 a 27/09/2026) - 6 abastecimentos, R$ 1.298,15
  const week2Records = [
    {
      vehicle_name: 'Fiat Fiorino 01',
      vehicle_plate: 'GWH3623',
      fuel_type: 'Gasolina',
      odometer_working: 1,
      km_previous: 265890.0,
      km_current: 266067.0,
      km_driven: 177.0,
      liters: 32.19,
      price_per_liter: 6.97,
      total_cost: 224.36,
      consumption_kml: 5.50,
      cost_per_km: 1.27,
      driver_name: 'Marcos Silva'
    },
    {
      vehicle_name: 'Fiat Fiorino 02',
      vehicle_plate: 'GWH3624',
      fuel_type: 'Gasolina',
      odometer_working: 1,
      km_previous: 195400,
      km_current: 195650,
      km_driven: 250.0,
      liters: 28.50,
      price_per_liter: 6.97,
      total_cost: 198.65,
      consumption_kml: 8.77,
      cost_per_km: 0.79,
      driver_name: 'João Pedro'
    },
    {
      vehicle_name: 'Fiat Fiorino 03',
      vehicle_plate: 'GWH3625',
      fuel_type: 'Gasolina',
      odometer_working: 1,
      km_previous: 142100,
      km_current: 142280,
      km_driven: 180.0,
      liters: 22.78,
      price_per_liter: 6.97,
      total_cost: 158.78,
      consumption_kml: 7.90,
      cost_per_km: 0.88,
      driver_name: 'Carlos Lima'
    },
    {
      vehicle_name: 'Caminhão 710',
      vehicle_plate: 'NQM7096',
      fuel_type: 'Diesel S10',
      odometer_working: 1,
      km_previous: 232941.8,
      km_current: 233190.0,
      km_driven: 248.2,
      liters: 45.00,
      price_per_liter: 6.97,
      total_cost: 313.65,
      consumption_kml: 5.52,
      cost_per_km: 1.26,
      driver_name: 'Marcos Silva'
    },
    {
      vehicle_name: 'Volks Delivery',
      vehicle_plate: 'DEF2G34',
      fuel_type: 'Diesel S10',
      odometer_working: 1,
      km_previous: 189450,
      km_current: 189720,
      km_driven: 270.0,
      liters: 38.00,
      price_per_liter: 6.97,
      total_cost: 264.86,
      consumption_kml: 7.11,
      cost_per_km: 0.98,
      driver_name: 'José Santos'
    },
    {
      vehicle_name: 'Renault Master',
      vehicle_plate: 'PQR6S78',
      fuel_type: 'Diesel S10',
      odometer_working: 1,
      km_previous: 110200,
      km_current: 110350,
      km_driven: 150.0,
      liters: 19.78,
      price_per_liter: 6.97,
      total_cost: 137.85,
      consumption_kml: 7.58,
      cost_per_km: 0.92,
      driver_name: 'Eduardo Oliveira'
    }
  ];

  const week2TotalSpent = week2Records.reduce((s, r) => s + r.total_cost, 0);
  const week2TotalLiters = week2Records.reduce((s, r) => s + r.liters, 0);
  assert(Math.round(week2TotalSpent * 100) / 100 === 1298.15, `Semana 2 soma R$ 1.298,15 (calculado: R$ ${week2TotalSpent.toFixed(2)})`);
  assert(week2Records.length === 6, 'Semana 2 possui 6 abastecimentos');

  const docWeek2 = createFleetPDFDoc({
    reportType: 'semanal',
    title: 'RELATÓRIO SEMANAL DE ABASTECIMENTO',
    periodStr: '21/09/2026 a 27/09/2026',
    dateStr: '2026-09-27',
    records: week2Records,
    summary: { total_vehicles: 6, total_liters: week2TotalLiters, total_cost: week2TotalSpent }
  });

  const pageCountWeek2 = docWeek2.internal.getNumberOfPages();
  assert(pageCountWeek2 <= 2, `PDF da Semana 2 (6 veículos) paginado em ${pageCountWeek2} página(s)`);

  // 4. Scenario 3: CONSOLIDADO (Semana 1 + Semana 2) -> 10 abastecimentos, R$ 2.651,66
  const combinedRecords = [...week1Records, ...week2Records];
  const combinedTotalCost = combinedRecords.reduce((s, r) => s + r.total_cost, 0);
  const combinedTotalLiters = combinedRecords.reduce((s, r) => s + r.liters, 0);
  assert(Math.round(combinedTotalCost * 100) / 100 === 2651.66, `Consolidado das 2 semanas soma R$ 2.651,66 (calculado: R$ ${combinedTotalCost.toFixed(2)})`);
  assert(combinedRecords.length === 10, 'Consolidado possui 10 abastecimentos');

  const docConsolidado = createFleetPDFDoc({
    reportType: 'consolidado',
    title: 'RELATÓRIO CONSOLIDADO DE ABASTECIMENTO',
    periodStr: '14/09/2026 a 27/09/2026',
    dateStr: '2026-09-27',
    records: combinedRecords,
    summary: { total_vehicles: 10, total_liters: combinedTotalLiters, total_cost: combinedTotalCost }
  });

  const pageCountConsolidado = docConsolidado.internal.getNumberOfPages();
  assert(pageCountConsolidado >= 2, `PDF Consolidado de 10 veículos paginado em ${pageCountConsolidado} páginas`);

  // 5. Scenario 4: RELATÓRIO MENSAL / MULTI-PERÍODO COM AGRUPAMENTO POR VEÍCULO E MÉDIA SEMANAL
  const monthRecords = [
    // F1000 - Semana 1
    {
      vehicle_id: 1,
      vehicle_name: 'F1000',
      vehicle_plate: 'ABC1234',
      fuel_type: 'Diesel S10',
      fuel_date: '2026-09-02',
      odometer_working: 1,
      km_previous: 100000,
      km_current: 100348.5,
      km_driven: 348.5,
      liters: 50.0,
      price_per_liter: 7.00,
      total_cost: 350.00,
      consumption_kml: 6.97, // 348.5 / 50 = 6.97
      driver_name: 'Carlos'
    },
    // F1000 - Semana 2
    {
      vehicle_id: 1,
      vehicle_name: 'F1000',
      vehicle_plate: 'ABC1234',
      fuel_type: 'Diesel S10',
      fuel_date: '2026-09-09',
      odometer_working: 1,
      km_previous: 100348.5,
      km_current: 100732.0,
      km_driven: 383.5,
      liters: 50.0,
      price_per_liter: 7.00,
      total_cost: 350.00,
      consumption_kml: 7.67, // 383.5 / 50 = 7.67
      driver_name: 'Carlos'
    },
    // Strada - Semana 1
    {
      vehicle_id: 2,
      vehicle_name: 'Fiat Strada',
      vehicle_plate: 'XYZ9876',
      fuel_type: 'Gasolina',
      fuel_date: '2026-09-03',
      odometer_working: 1,
      km_previous: 50000,
      km_current: 50440,
      km_driven: 440,
      liters: 40.0,
      price_per_liter: 6.00,
      total_cost: 240.00,
      consumption_kml: 11.0,
      driver_name: 'Marcos'
    },
    // Master com odômetro quebrado
    {
      vehicle_id: 3,
      vehicle_name: 'Renault Master',
      vehicle_plate: 'PQR6S78',
      fuel_type: 'Diesel S10',
      fuel_date: '2026-09-04',
      odometer_working: 0,
      km_previous: null,
      km_current: null,
      km_driven: null,
      liters: 60.0,
      price_per_liter: 7.00,
      total_cost: 420.00,
      consumption_kml: null,
      driver_name: 'Eduardo'
    }
  ];

  const monthTotalCost = monthRecords.reduce((s, r) => s + r.total_cost, 0);
  const monthTotalLiters = monthRecords.reduce((s, r) => s + r.liters, 0);

  // Média aritmética da F1000: (6.97 + 7.67) / 2 = 7.32 km/L
  const f1000KmlAvg = (6.97 + 7.67) / 2;
  assert(Math.round(f1000KmlAvg * 100) / 100 === 7.32, `Média aritmética F1000: (6.97 + 7.67)/2 = 7.32 km/L (calculado: ${f1000KmlAvg.toFixed(2)})`);

  const docMonth = createFleetPDFDoc({
    reportType: 'mes',
    title: 'RELATÓRIO MENSAL DE ABASTECIMENTO',
    periodStr: '01/09/2026 a 30/09/2026',
    dateStr: '2026-09-30',
    records: monthRecords,
    summary: { total_vehicles: 3, total_liters: monthTotalLiters, total_cost: monthTotalCost }
  });

  const pageCountMonth = docMonth.internal.getNumberOfPages();
  assert(pageCountMonth >= 1, `PDF Mensal gerado com sucesso com ${pageCountMonth} página(s)`);
  const pdfMonthOutput = docMonth.output().toUpperCase();
  assert(pdfMonthOutput.includes('F1000'), 'PDF Mensal contém veículo F1000');
  assert(pdfMonthOutput.includes('FIAT STRADA'), 'PDF Mensal contém veículo Fiat Strada');
  assert(pdfMonthOutput.includes('RENAULT MASTER'), 'PDF Mensal contém veículo Renault Master');
  assert(pdfMonthOutput.includes('RESUMO GERAL DA FROTA'), 'PDF Mensal contém RESUMO GERAL DA FROTA no final');

  // 6. Check PDF Content & Aesthetics
  const pdfOutput = docWeek2.output();
  assert(!pdfOutput.includes('Ø'), 'PDF não contém caractere quebrado Ø');
  assert(!pdfOutput.includes('â›½'), 'PDF não contém sequências quebradas de emoji');
  assert(pdfOutput.includes('GERENCIAMENTO DE FROTA'), 'Cabeçalho contém GERENCIAMENTO DE FROTA');
  assert(pdfOutput.includes('RELAT'), 'Contém título com RELATÓRIO');
  assert(!pdfOutput.includes('Preco medio') && !pdfOutput.includes('Preço médio'), 'PDF não exibe "Preço médio"');
  assert(pdfOutput.includes('21/09/2026 a 27/09/2026'), 'PDF da Semana 2 contém o período correto 21/09/2026 a 27/09/2026');

  console.log(`\n========================================`);
  console.log(`RESULTADO DOS TESTES: ${passed} PASSOU | ${failed} FALHOU`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runReportTests().catch((err) => {
  console.error('Erro ao executar testes:', err);
  process.exit(1);
});
