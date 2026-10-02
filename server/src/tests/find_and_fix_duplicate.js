import { getDb, query, get, run, saveDatabase } from '../config/database.js';

async function main() {
  await getDb();
  console.log('--- BUSCANDO TODOS OS ABASTECIMENTOS NO BANCO DE DADOS ---');
  const records = query(`
    SELECT fr.id, fr.session_id, fr.vehicle_id, v.name as vehicle_name, v.plate,
           fr.created_at, fs.date as session_date, fr.fuel_type, fr.km_previous, fr.km_current,
           fr.km_driven, fr.liters, fr.price_per_liter, fr.total_cost, fr.consumption_kml, fr.cost_per_km
    FROM fuel_records fr
    JOIN vehicles v ON fr.vehicle_id = v.id
    LEFT JOIN fueling_sessions fs ON fr.session_id = fs.id
    ORDER BY fr.id ASC
  `);
  console.table(records);

  // Group by vehicle, km_current, liters, total_cost, price_per_liter
  const duplicates = [];
  for (let i = 0; i < records.length; i++) {
    for (let j = i + 1; j < records.length; j++) {
      const a = records[i];
      const b = records[j];
      if (
        a.vehicle_id === b.vehicle_id &&
        a.fuel_type === b.fuel_type &&
        Number(a.liters) === Number(b.liters) &&
        Number(a.price_per_liter) === Number(b.price_per_liter) &&
        Number(a.total_cost) === Number(b.total_cost) &&
        Number(a.km_current) === Number(b.km_current)
      ) {
        duplicates.push({ original: a, duplicate: b });
      }
    }
  }

  console.log('\n--- DUPLICIDADES ENCONTRADAS ---');
  console.log(duplicates);
}

main().catch(console.error);
