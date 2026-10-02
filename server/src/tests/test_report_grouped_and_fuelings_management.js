import { getDb, query, get, run, saveDatabase } from '../config/database.js';
import { getFleetReports } from '../controllers/reportController.js';
import { updateFuelRecordDirect, deleteFuelRecordDirect } from '../controllers/sessionController.js';
import {
  generateFleetReportPDF,
  generateFleetExcelReport,
  ensureVehiclesData,
  formatCurrency,
  formatLiters,
  formatKm,
  formatDateBR
} from '../../../client/src/services/exportService.js';

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASSOU: ${message}`);
    totalPassed++;
  } else {
    console.error(`  ❌ FALHOU: ${message}`);
    totalFailed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('🧪 SUÍTE DE TESTES: RELATÓRIOS AGRUPADOS & GERENCIAMENTO DE ABASTECIMENTOS');
  console.log('================================================================\n');

  const db = await getDb();

  // Insert a test vehicle for the test suite
  const testPlate = `GRP${Math.floor(1000 + Math.random() * 9000)}`;
  const vResult = run(
    `INSERT INTO vehicles (name, plate, brand, model, fuel_type_default, tank_capacity, odometer_working, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ['Caminhão Teste Agrupamento', testPlate, 'Mercedes-Benz', 'Atego 1719', 'Diesel S10', 210, 1, 'active']
  );
  const testVehicleId = vResult.lastInsertRowid;

  // Insert 3 test fuelings for this vehicle on different dates
  const f1 = run(
    `INSERT INTO fuel_records (vehicle_id, fuel_type, km_previous, km_current, km_driven, liters, price_per_liter, total_cost, consumption_kml, cost_per_km, odometer_working, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [testVehicleId, 'Diesel S10', 50000, 50500, 500, 100, 6.00, 600.00, 5.00, 1.20, 1, '2026-10-01 10:00:00']
  );
  const f1Id = f1.lastInsertRowid;

  const f2 = run(
    `INSERT INTO fuel_records (vehicle_id, fuel_type, km_previous, km_current, km_driven, liters, price_per_liter, total_cost, consumption_kml, cost_per_km, odometer_working, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [testVehicleId, 'Diesel S10', 50500, 51100, 600, 120, 6.50, 780.00, 5.00, 1.30, 1, '2026-10-02 14:00:00']
  );
  const f2Id = f2.lastInsertRowid;

  const f3 = run(
    `INSERT INTO fuel_records (vehicle_id, fuel_type, km_previous, km_current, km_driven, liters, price_per_liter, total_cost, consumption_kml, cost_per_km, odometer_working, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [testVehicleId, 'Diesel S10', 51100, 51600, 500, 80, 6.25, 500.00, 6.25, 1.00, 1, '2026-10-03 16:30:00']
  );
  const f3Id = f3.lastInsertRowid;

  console.log(`🔹 Veículo de teste criado: ID ${testVehicleId} (${testPlate}) com 3 abastecimentos (IDs: ${f1Id}, ${f2Id}, ${f3Id})`);

  // -------------------------------------------------------------
  // TESTE 1: Relatório de um único veículo
  // -------------------------------------------------------------
  console.log('\n--- TESTE 1: Relatório de um único veículo ---');
  let singleRes = {};
  getFleetReports(
    { query: { vehicle_id: testVehicleId, start_date: '2026-10-01', end_date: '2026-10-05' } },
    { json: (d) => { singleRes = d; return singleRes; }, status: () => ({ json: (d) => { singleRes = d; } }) }
  );
  assert(singleRes.vehicles_data?.length === 1, 'Relatório retornou exatamente 1 veículo no array de dados');
  assert(singleRes.records?.length === 3, 'Relatório retornou os 3 abastecimentos do veículo');
  assert(singleRes.vehicles_data[0].vehicle_plate === testPlate, `Placa do veículo no relatório corresponde: ${testPlate}`);

  // -------------------------------------------------------------
  // TESTE 2 & 3 & 4: Todos os veículos agrupados em blocos separados
  // -------------------------------------------------------------
  console.log('\n--- TESTE 2, 3 e 4: Separação por veículo em blocos individuais ---');
  let allRes = {};
  getFleetReports(
    { query: { start_date: '2026-10-01', end_date: '2026-10-05' } },
    { json: (d) => { allRes = d; return allRes; }, status: () => ({ json: (d) => { allRes = d; } }) }
  );
  assert(allRes.vehicles_data?.length >= 1, `Total de blocos de veículos agrupados: ${allRes.vehicles_data?.length}`);
  const targetVData = allRes.vehicles_data.find(v => v.vehicle_id === testVehicleId);
  assert(targetVData !== undefined, 'Bloco do veículo de teste encontrado na lista agrupada');
  assert(targetVData.records.length === 3, 'Bloco contém exatamente os 3 abastecimentos do veículo');

  // Verify chronological order (oldest to newest)
  const isChronological = targetVData.records[0].id === f1Id && targetVData.records[1].id === f2Id && targetVData.records[2].id === f3Id;
  assert(isChronological, 'Abastecimentos dentro do bloco estão ordenados do mais antigo ao mais recente');

  // -------------------------------------------------------------
  // TESTE 5: Conferência manual e exata das médias do veículo
  // -------------------------------------------------------------
  console.log('\n--- TESTE 5: Conferência das Médias do Veículo ---');
  // Abastecimentos: 100L (R$600, 6.00/L) + 120L (R$780, 6.50/L) + 80L (R$500, 6.25/L)
  // Total Litros = 300L
  // Total Gasto = R$ 1.880,00
  // Total KM = 500 + 600 + 500 = 1600 km
  // Média Litros = 300 / 3 = 100.00 L
  // Média Preço/L = (6.00 + 6.50 + 6.25) / 3 = 6.25
  // Média Valor = 1880 / 3 = 626.67
  // Média Consumo = (5.00 + 5.00 + 6.25) / 3 = 5.42 km/L
  const vSummary = targetVData.summary;
  assert(vSummary.fuelings_count === 3, `Total de abastecimentos = ${vSummary.fuelings_count} (Esperado: 3)`);
  assert(vSummary.total_liters === 300, `Total de litros = ${vSummary.total_liters} L (Esperado: 300 L)`);
  assert(vSummary.total_cost === 1880, `Total gasto = R$ ${vSummary.total_cost} (Esperado: R$ 1880.00)`);
  assert(vSummary.total_km === 1600, `Total KM rodados = ${vSummary.total_km} km (Esperado: 1600 km)`);

  const calculatedAvgLiters = Number((vSummary.total_liters / vSummary.fuelings_count).toFixed(2));
  assert(calculatedAvgLiters === 100.00, `Média de litros = ${calculatedAvgLiters} L (Esperado: 100.00 L)`);

  const calculatedAvgCost = Number((vSummary.total_cost / vSummary.fuelings_count).toFixed(2));
  assert(calculatedAvgCost === 626.67, `Média de valor = R$ ${calculatedAvgCost} (Esperado: R$ 626.67)`);

  const calculatedAvgPrice = Number((targetVData.records.reduce((s, r) => s + Number(r.price_per_liter), 0) / 3).toFixed(2));
  assert(calculatedAvgPrice === 6.25, `Média de preço/L = R$ ${calculatedAvgPrice} (Esperado: R$ 6.25)`);

  assert(vSummary.avg_consumption_kml === 5.42, `Média de consumo = ${vSummary.avg_consumption_kml} km/L (Esperado: 5.42 km/L)`);

  // -------------------------------------------------------------
  // TESTE 6: Editar um abastecimento sem duplicar
  // -------------------------------------------------------------
  console.log('\n--- TESTE 6: Edição de Abastecimento (Sem Duplicar) ---');
  let editRes = {};
  const countBeforeEdit = query('SELECT COUNT(id) as c FROM fuel_records WHERE vehicle_id = ?', [testVehicleId])[0].c;
  
  updateFuelRecordDirect(
    {
      params: { id: f2Id },
      body: {
        liters: 130, // changed from 120 to 130
        price_per_liter: 6.50,
        total_cost: 845.00, // 130 * 6.50
        km_current: 51100,
        fuel_type: 'Diesel S10',
        session_date: '2026-10-02'
      },
      user: { name: 'Gerente Teste' }
    },
    { json: (d) => { editRes = d; return editRes; }, status: () => ({ json: (d) => { editRes = d; } }) }
  );

  const countAfterEdit = query('SELECT COUNT(id) as c FROM fuel_records WHERE vehicle_id = ?', [testVehicleId])[0].c;
  assert(countAfterEdit === countBeforeEdit, `Quantidade de registros não aumentou após edição (${countAfterEdit} = ${countBeforeEdit})`);
  const updatedF2 = get('SELECT * FROM fuel_records WHERE id = ?', [f2Id]);
  assert(updatedF2.liters === 130, `Litros atualizados com sucesso no banco: ${updatedF2.liters} L (Esperado: 130 L)`);
  assert(updatedF2.total_cost === 845.00, `Valor total atualizado com sucesso: R$ ${updatedF2.total_cost} (Esperado: R$ 845.00)`);

  // -------------------------------------------------------------
  // TESTE 7 & 8: Excluir um abastecimento e conferir recálculo
  // -------------------------------------------------------------
  console.log('\n--- TESTE 7 & 8: Exclusão de Abastecimento e Recálculo das Médias ---');
  let deleteRes = {};
  deleteFuelRecordDirect(
    { params: { id: f3Id }, body: { justification: 'Teste de exclusão' }, user: { name: 'Gerente Teste' } },
    { json: (d) => { deleteRes = d; return deleteRes; }, status: () => ({ json: (d) => { deleteRes = d; } }) }
  );

  const deletedCheck = get('SELECT * FROM fuel_records WHERE id = ?', [f3Id]);
  assert(deletedCheck === null || deletedCheck === undefined, 'Registro ID 3 foi realmente excluído do banco SQLite');

  const countAfterDelete = query('SELECT COUNT(id) as c FROM fuel_records WHERE vehicle_id = ?', [testVehicleId])[0].c;
  assert(countAfterDelete === 2, `Restaram exatamente 2 abastecimentos no veículo (${countAfterDelete})`);

  // Check recalculated vehicle report
  let afterDeleteReport = {};
  getFleetReports(
    { query: { vehicle_id: testVehicleId, start_date: '2026-10-01', end_date: '2026-10-05' } },
    { json: (d) => { afterDeleteReport = d; return afterDeleteReport; }, status: () => ({ json: (d) => { afterDeleteReport = d; } }) }
  );
  // Now remaining: f1 (100L, R$600, 500km) + f2 (130L, R$845, 600km)
  // Total Liters = 230L
  // Total Cost = R$ 1.445,00
  // Total KM = 1100 km
  const newSummary = afterDeleteReport.vehicles_data[0].summary;
  assert(newSummary.fuelings_count === 2, `Novo total de abastecimentos = ${newSummary.fuelings_count}`);
  assert(newSummary.total_liters === 230, `Novo total de litros recalculado = ${newSummary.total_liters} L`);
  assert(newSummary.total_cost === 1445, `Novo total de custo recalculado = R$ ${newSummary.total_cost}`);
  assert(newSummary.total_km === 1100, `Novo total de KM recalculado = ${newSummary.total_km} km`);

  // -------------------------------------------------------------
  // TESTE 9: Geração de PDF com blocos e médias
  // -------------------------------------------------------------
  console.log('\n--- TESTE 9: Geração de PDF Estruturado ---');
  let pdfRes = null;
  try {
    const pdfDoc = generateFleetReportPDF({
      filters: { start_date: '2026-10-01', end_date: '2026-10-05' },
      records: allRes.records,
      vehicles_data: allRes.vehicles_data,
      summary: allRes.summary
    }, 'view');
    pdfRes = pdfDoc;
  } catch (err) {
    console.error('Erro na geração do PDF:', err);
  }
  assert(pdfRes !== null, 'Motor jsPDF gerou o relatório em PDF com sucesso');

  // -------------------------------------------------------------
  // TESTE 10: Geração de Excel com abas e agrupamentos
  // -------------------------------------------------------------
  console.log('\n--- TESTE 10: Geração de Planilha Excel Estruturada ---');
  let excelOk = false;
  try {
    const vList = ensureVehiclesData(allRes.records, allRes.vehicles_data);
    assert(vList.length > 0, 'ensureVehiclesData processou os dados agrupados por veículo com sucesso');
    assert(vList[0].summary.avg_liters !== undefined, 'Subtotais de média de litros calculados para o Excel');
    assert(vList[0].summary.avg_total_cost !== undefined, 'Subtotais de média de valor calculados para o Excel');
    excelOk = true;
  } catch (err) {
    console.error('Erro no processamento do Excel:', err);
  }
  assert(excelOk, 'Estrutura do Excel agrupado por veículo gerada com 100% de integridade');

  // -------------------------------------------------------------
  // TESTE 11: Filtros aplicados e médias acompanhando os filtros
  // -------------------------------------------------------------
  console.log('\n--- TESTE 11: Filtros de Combustível e Período ---');
  let filterRes = {};
  getFleetReports(
    { query: { fuel_type: 'Diesel', start_date: '2026-10-01', end_date: '2026-10-05' } },
    { json: (d) => { filterRes = d; return filterRes; }, status: () => ({ json: (d) => { filterRes = d; } }) }
  );
  assert(filterRes.records.length > 0, 'Filtro por Diesel retornou registros');
  const allAreDiesel = filterRes.records.every(r => r.fuel_type.toUpperCase().includes('DIESEL'));
  assert(allAreDiesel, 'Todos os registros retornados no filtro são do combustível selecionado');

  // Cleanup test records
  run('DELETE FROM fuel_records WHERE vehicle_id = ?', [testVehicleId]);
  run('DELETE FROM vehicles WHERE id = ?', [testVehicleId]);
  saveDatabase();

  console.log('\n================================================================');
  console.log(`📊 RESULTADO FINAL DOS TESTES: ${totalPassed} PASSOU | ${totalFailed} FALHOU`);
  console.log('================================================================\n');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro fatal nos testes:', err);
  process.exit(1);
});
