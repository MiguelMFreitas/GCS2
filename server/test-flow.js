import { getDb, query, get } from './src/config/database.js';
import { seedDatabase } from './src/seed.js';
import { calculateSessionSummary } from './src/controllers/sessionController.js';

async function runTestFlow() {
  console.log('🧪 Iniciando Teste Automatizado de Regras de Negócio do GCS2...\n');

  // 1. Initialize and Seed
  await seedDatabase();

  // 2. Test Vehicles filtering
  const allVehicles = query('SELECT * FROM vehicles');
  console.log(`✅ Total de veículos cadastrados: ${allVehicles.length}`);

  const workingVehicles = query("SELECT * FROM vehicles WHERE status = 'working'");
  console.log(`✅ Veículos ativos para o Abastecimento da Semana: ${workingVehicles.length}`);

  const nonWorkingVehicles = query("SELECT * FROM vehicles WHERE status != 'working'");
  console.log(`✅ Veículos fora da lista semanal (parados/manutenção/inativos): ${nonWorkingVehicles.length}`);
  if (nonWorkingVehicles.length !== 2) throw new Error('Falha no filtro de veículos não operacionais');

  // 3. Check Odometer logic
  const odomWorking = query('SELECT * FROM vehicles WHERE odometer_working = 1');
  const odomNonWorking = query('SELECT * FROM vehicles WHERE odometer_working = 0');
  console.log(`✅ Veículos com odômetro funcional: ${odomWorking.length}`);
  console.log(`✅ Veículos com odômetro NÃO funcional: ${odomNonWorking.length}`);

  // 4. Test Fueling Cart Calculation
  const mockCartRecords = [
    {
      vehicle_name: 'Mercedes 710',
      fuel_type: 'Diesel S10',
      odometer_working: 1,
      km_previous: 233020,
      km_current: 233350,
      km_driven: 330,
      liters: 45.0,
      price_per_liter: 6.97,
      total_cost: 313.65,
      consumption_kml: 7.33,
      cost_per_km: 0.95
    },
    {
      vehicle_name: 'Renault Master',
      fuel_type: 'Diesel S10',
      odometer_working: 0,
      km_previous: null,
      km_current: null,
      km_driven: null,
      liters: 50.0,
      price_per_liter: 6.95,
      total_cost: 347.50,
      consumption_kml: null,
      cost_per_km: null
    },
    {
      vehicle_name: 'Fiat Fiorino',
      fuel_type: 'Gasolina',
      odometer_working: 1,
      km_previous: 94320,
      km_current: 94750,
      km_driven: 430,
      liters: 40.0,
      price_per_liter: 6.19,
      total_cost: 247.60,
      consumption_kml: 10.75,
      cost_per_km: 0.58
    }
  ];

  const summary = calculateSessionSummary(mockCartRecords);
  console.log('\n📊 Resumo da Sessão Calculado:');
  console.log(`- Total de Veículos: ${summary.total_vehicles}`);
  console.log(`- Total de Litros: ${summary.total_liters} L`);
  console.log(`- Valor Total Pago: R$ ${summary.total_cost}`);
  console.log(`- Média da Frota (km/L): ${summary.fleet_avg_consumption_kml} km/L`);
  console.log(`- Veículos com odômetro: ${summary.vehicles_with_odometer}`);
  console.log(`- Veículos sem odômetro: ${summary.vehicles_without_odometer}`);

  console.log('\n⛽ Consolidação por Combustível:');
  summary.fuels.forEach(f => {
    console.log(`  * ${f.name}: ${f.count} veículos | ${f.liters} L | Preço Médio: R$ ${f.avg_price_per_liter}/L | Total: R$ ${f.total_cost}`);
  });

  // Validations
  if (summary.total_vehicles !== 3) throw new Error('Total de veículos incorreto');
  if (summary.total_liters !== 135.0) throw new Error('Total de litros incorreto');
  if (summary.total_cost !== 908.75) throw new Error('Total de custo incorreto');
  
  // Verify fleet average does NOT divide by 3 (ignores the non-odometer vehicle!)
  const expectedAvg = ((7.33 + 10.75) / 2).toFixed(2);
  if (String(summary.fleet_avg_consumption_kml) !== expectedAvg) {
    throw new Error(`Média da frota calculou incorretamente: esperado ${expectedAvg}, obtido ${summary.fleet_avg_consumption_kml}`);
  }

  console.log('\n🎉 Todos os testes de regras de negócio passaram com 100% de sucesso!');
}

runTestFlow()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erro no teste:', err);
    process.exit(1);
  });
