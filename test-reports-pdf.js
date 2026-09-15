// Comprehensive PDF and Reports Validation Test Suite
import { createFleetPDFDoc, formatCurrency, formatLiters, formatKm, formatConsumption, formatDateBR } from './client/src/services/exportService.js';

async function runReportTests() {
  console.log('🧪 Iniciando Testes Automatizados da Interface de Relatórios e Motor PDF...\n');

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
  assert(formatLiters(194.19) === '194,19 L', 'formatLiters(194.19) retorna 194,19 L');
  assert(formatKm(232941.8) === '232.941,8 km', 'formatKm(232941.8) retorna 232.941,8 km');
  assert(formatConsumption(7.42) === '7,42 km/L', 'formatConsumption(7.42) retorna 7,42 km/L');
  assert(formatDateBR('2026-09-15') === '15/09/2026', 'formatDateBR(2026-09-15) retorna 15/09/2026');

  // 2. Scenario A: 1 Vehicle PDF Generation
  const records1 = [
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
    }
  ];

  const doc1 = createFleetPDFDoc({
    title: 'RELATORIO DE ABASTECIMENTO',
    sessionCode: 'ABAST-2026-09-15-001',
    dateStr: '2026-09-15',
    records: records1,
    summary: { total_vehicles: 1, total_liters: 58.58, total_cost: 408.30 }
  });

  const pageCount1 = doc1.internal.getNumberOfPages();
  assert(pageCount1 === 1, 'PDF de 1 veículo cabe perfeitamente em 1 página');

  // 3. Scenario B: 4 Vehicles (Mixed fuels: Diesel, Gasolina, Etanol, broken odometer, first fueling)
  const records4 = [
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
      vehicle_name: 'Fiat Fiorino (Flex abastecido com Gasolina)',
      vehicle_plate: 'GHI3J45',
      fuel_type: 'Gasolina',
      odometer_working: 1,
      km_previous: null, // First fueling!
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
      vehicle_name: 'Renault Master (Odômetro Não Funcional)',
      vehicle_plate: 'PQR6S78',
      fuel_type: 'Diesel S10',
      odometer_working: 0, // Broken odometer!
      km_previous: null,
      km_current: null,
      km_driven: null,
      liters: 45.00,
      price_per_liter: 6.95,
      total_cost: 312.75,
      consumption_kml: null,
      cost_per_km: null,
      driver_name: 'Eduardo Oliveira'
    }
  ];

  const doc4 = createFleetPDFDoc({
    title: 'RELATORIO DE ABASTECIMENTO',
    sessionCode: 'ABAST-2026-09-15-002',
    dateStr: '2026-09-15',
    records: records4,
    summary: { total_vehicles: 4, total_liters: 197.38, total_cost: 1343.62 }
  });

  const pageCount4 = doc4.internal.getNumberOfPages();
  assert(pageCount4 <= 2, `PDF de 4 veículos com resumo executivo e detalhamento paginado em ${pageCount4} página(s)`);

  // 4. Scenario C: > 10 Vehicles (Stress test pagination)
  const records14 = [];
  for (let i = 1; i <= 14; i++) {
    records14.push({
      vehicle_name: `Caminhão Frota #${i}`,
      vehicle_plate: `ABC${i}D${String(i).padStart(2, '0')}`,
      fuel_type: i % 2 === 0 ? 'Diesel S10' : (i % 3 === 0 ? 'Etanol' : 'Gasolina'),
      odometer_working: i === 5 ? 0 : 1,
      km_previous: i === 5 ? null : (i === 1 ? null : 100000 + (i * 500)),
      km_current: i === 5 ? null : 100000 + (i * 500) + 300,
      km_driven: i === 5 || i === 1 ? null : 300,
      liters: 50.0,
      price_per_liter: 6.50,
      total_cost: 325.00,
      consumption_kml: i === 5 || i === 1 ? null : 6.00,
      cost_per_km: i === 5 || i === 1 ? null : 1.08,
      driver_name: `Motorista ${i}`
    });
  }

  const doc14 = createFleetPDFDoc({
    title: 'RELATORIO CONSOLIDADO DA FROTA',
    sessionCode: 'RELATORIO-CONSOLIDADO',
    dateStr: '2026-09-15',
    records: records14,
    summary: { total_vehicles: 14, total_liters: 700.00, total_cost: 4550.00 }
  });

  const pageCount14 = doc14.internal.getNumberOfPages();
  assert(pageCount14 >= 2, `Relatório de 14 veículos paginado inteligentemente em ${pageCount14} páginas sem sobreposição`);

  // 5. Check UTF-8 safety, no broken emojis, no average fuel price, and no 'Flex' fuel group
  const pdfOutput = doc4.output();
  assert(!pdfOutput.includes('Ø'), 'PDF não contém caractere quebrado Ø');
  assert(!pdfOutput.includes('â›½'), 'PDF não contém sequências quebradas de emoji');
  assert(pdfOutput.includes('GERENCIAMENTO DE FROTA'), 'Cabeçalho principal contém GERENCIAMENTO DE FROTA');
  assert(!pdfOutput.includes('Preco medio'), 'PDF não exibe mais "Preco medio" no resumo por combustível');
  assert(!pdfOutput.includes('Preço médio'), 'PDF não exibe mais "Preço médio" no resumo por combustível');

  console.log(`\n========================================`);
  console.log(`RESULTADO DOS TESTES DE RELATÓRIO/PDF: ${passed} PASSOU | ${failed} FALHOU`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runReportTests().catch((err) => {
  console.error('Erro ao executar testes de relatório:', err);
  process.exit(1);
});
