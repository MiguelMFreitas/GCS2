import { getFleetReports } from '../../../worker/routes/reports.js';
import { getDb, query } from '../config/database.js';

async function testWorkerReports() {
  console.log('--- Testing Worker getFleetReports function ---');
  await getDb();

  // Create a mock env.DB matching Cloudflare D1 query API
  const mockEnv = {
    DB: {
      prepare: (sql) => ({
        bind: (...params) => ({
          all: async () => ({ results: query(sql, params) }),
          first: async () => query(sql, params)[0] || null,
          run: async () => ({ success: true })
        })
      })
    }
  };

  const req1 = new Request('https://api.domain.com/api/reports/fleet?start_date=2026-09-01&end_date=2026-10-04');
  const res1 = await getFleetReports(req1, mockEnv);
  console.log(`Worker Response status: ${res1.status}`);
  const data1 = await res1.json();
  console.log(`Worker Records returned: ${data1.records?.length || 0}`);
  console.log(`Worker Vehicles returned: ${data1.vehicles_data?.length || 0}`);
  if (data1.error) {
    console.error('Worker returned error:', data1.error);
    process.exit(1);
  }
  console.log('✅ Worker getFleetReports executed successfully with 0 errors!');
}

testWorkerReports().catch((err) => {
  console.error('Worker test failed:', err);
  process.exit(1);
});
