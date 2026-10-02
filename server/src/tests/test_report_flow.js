import { getDb, query, run } from '../config/database.js';
import { getFleetReports } from '../controllers/reportController.js';

async function testFleetReports() {
  await getDb();
  console.log('--- Testing getFleetReports Controller ---');

  const mockRes = () => {
    const res = {};
    res.statusCode = 200;
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.data = data;
      return res;
    };
    return res;
  };

  // 1. All records (no date filter)
  const req1 = { query: {} };
  const res1 = mockRes();
  getFleetReports(req1, res1);
  console.log(`Test 1 (All): StatusCode=${res1.statusCode}, records=${res1.data.records.length}, vehicles=${res1.data.vehicles_data.length}, total_cost=R$ ${res1.data.summary.total_cost}`);

  // 2. Specific date range (2026-09-07 to 2026-09-07)
  const req2 = { query: { start_date: '2026-09-07', end_date: '2026-09-07' } };
  const res2 = mockRes();
  getFleetReports(req2, res2);
  console.log(`Test 2 (2026-09-07): StatusCode=${res2.statusCode}, records=${res2.data.records.length}, vehicles=${res2.data.vehicles_data.length}`);

  // 3. Filter by vehicle_id (vehicle 33 - Mercedes 710)
  const req3 = { query: { vehicle_id: '33' } };
  const res3 = mockRes();
  getFleetReports(req3, res3);
  console.log(`Test 3 (Vehicle 33): StatusCode=${res3.statusCode}, records=${res3.data.records.length}, vehicles=${res3.data.vehicles_data.length}`);

  // 4. Filter by fuel_type (Gasolina)
  const req4 = { query: { fuel_type: 'Gasolina' } };
  const res4 = mockRes();
  getFleetReports(req4, res4);
  console.log(`Test 4 (Fuel Gasolina): StatusCode=${res4.statusCode}, records=${res4.data.records.length}, vehicles=${res4.data.vehicles_data.length}`);

  // 5. Empty period (2026-01-01 to 2026-01-02)
  const req5 = { query: { start_date: '2026-01-01', end_date: '2026-01-02' } };
  const res5 = mockRes();
  getFleetReports(req5, res5);
  console.log(`Test 5 (Empty Period): StatusCode=${res5.statusCode}, records=${res5.data.records.length}, vehicles=${res5.data.vehicles_data.length}`);
}

testFleetReports().catch(console.error);
