import { getDb, query, get, run, saveDatabase } from '../config/database.js';
import { logAudit } from '../middlewares/audit.js';

async function main() {
  await getDb();
  console.log('================================================================');
  console.log('🔍 ANÁLISE DETALHADA DOS REGISTROS ANTES DA EXCLUSÃO');
  console.log('================================================================\n');

  const rec38 = get('SELECT fr.*, v.name as vehicle_name, v.plate FROM fuel_records fr JOIN vehicles v ON fr.vehicle_id = v.id WHERE fr.id = 38');
  const rec40 = get('SELECT fr.*, v.name as vehicle_name, v.plate FROM fuel_records fr JOIN vehicles v ON fr.vehicle_id = v.id WHERE fr.id = 40');

  console.log('🔹 1º Registro (ORIGINAL - SERÁ MANTIDO):');
  console.log({
    id: rec38?.id,
    veiculo: `${rec38?.vehicle_name} (${rec38?.plate})`,
    data: rec38?.created_at,
    combustivel: rec38?.fuel_type,
    km_atual: rec38?.km_current,
    litros: rec38?.liters,
    preco_litro: rec38?.price_per_liter,
    total: rec38?.total_cost,
    consumo: rec38?.consumption_kml
  });

  console.log('\n🔹 2º Registro (DUPLICADO - SERÁ EXCLUÍDO):');
  console.log({
    id: rec40?.id,
    veiculo: `${rec40?.vehicle_name} (${rec40?.plate})`,
    data: rec40?.created_at,
    combustivel: rec40?.fuel_type,
    km_atual: rec40?.km_current,
    litros: rec40?.liters,
    preco_litro: rec40?.price_per_liter,
    total: rec40?.total_cost,
    consumo: rec40?.consumption_kml
  });

  if (!rec40) {
    console.log('⚠️ Registro 40 já não existe.');
    return;
  }

  console.log('\n🗑️ EXCLUINDO APENAS O SEGUNDO REGISTRO (ID 40)...');
  run('DELETE FROM fuel_records WHERE id = 40');

  // If session 9 is now empty, remove or update it
  const remainingInSess9 = query('SELECT * FROM fuel_records WHERE session_id = 9');
  if (remainingInSess9.length === 0) {
    run('DELETE FROM fueling_sessions WHERE id = 9');
    console.log('🧹 Sessão 9 (vazia após exclusão do duplicado) removida.');
  }

  // If vehicle 51 has no remaining records and was the duplicate vehicle, remove it
  const remainingVeh51Records = query('SELECT * FROM fuel_records WHERE vehicle_id = 51');
  if (remainingVeh51Records.length === 0) {
    run('DELETE FROM vehicles WHERE id = 51');
    console.log('🧹 Veículo de teste 51 (sem abastecimentos restantes) removido.');
  }

  // Registrar log de auditoria
  logAudit({
    entityType: 'fuel_records',
    entityId: 40,
    action: 'DELETE_DUPLICATE',
    userName: 'Gerente',
    oldData: rec40,
    newData: null
  });

  saveDatabase();
  console.log('💾 Banco de dados persistido com sucesso.');

  console.log('\n================================================================');
  console.log('📊 CONFERÊNCIA FINAL DOS ABASTECIMENTOS RESTANTES NO BANCO');
  console.log('================================================================\n');

  const finalRecords = query(`
    SELECT fr.id, fr.session_id, fr.vehicle_id, v.name as vehicle_name, v.plate,
           fr.created_at, fs.date as session_date, fr.fuel_type, fr.km_previous, fr.km_current,
           fr.km_driven, fr.liters, fr.price_per_liter, fr.total_cost, fr.consumption_kml
    FROM fuel_records fr
    JOIN vehicles v ON fr.vehicle_id = v.id
    LEFT JOIN fueling_sessions fs ON fr.session_id = fs.id
    ORDER BY fr.id ASC
  `);
  console.table(finalRecords);

  console.log(`\nTotal de abastecimentos restantes no banco: ${finalRecords.length}`);
  const duplicateCheck = finalRecords.filter(r => r.id === 40);
  if (duplicateCheck.length === 0) {
    console.log('✅ CONFIRMADO: O registro duplicado (ID 40) foi 100% removido do banco de dados.');
  } else {
    console.error('❌ ERRO: O registro 40 ainda existe.');
  }

  const originalCheck = finalRecords.filter(r => r.id === 38);
  if (originalCheck.length === 1) {
    console.log('✅ CONFIRMADO: O registro original (ID 38) foi preservado intacto.');
  } else {
    console.error('❌ ERRO: O registro original foi alterado.');
  }
}

main().catch(console.error);
