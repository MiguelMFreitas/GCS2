// Reports & Dashboard Stats Controller for Cloudflare Workers & D1
import { query, get } from '../utils/db.js';
import * as XLSX from 'xlsx';

export async function getDashboardStats(request, env) {
  try {
    // 1. Vehicle counts by status
    const vehicles = await query(env.DB, 'SELECT id, name, model, plate, status, odometer_working FROM vehicles');
    const totalVehicles = vehicles.length;
    const workingVehicles = vehicles.filter(v => v.status === 'working').length;
    const stoppedVehicles = vehicles.filter(v => v.status === 'stopped').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
    const inactiveVehicles = vehicles.filter(v => v.status === 'inactive').length;

    // 2. Current active or latest session (week)
    const activeSession = (await get(env.DB, "SELECT * FROM fueling_sessions WHERE status IN ('in_progress', 'draft') ORDER BY id DESC LIMIT 1"))
      || (await get(env.DB, "SELECT * FROM fueling_sessions WHERE status = 'completed' ORDER BY id DESC LIMIT 1"));

    let fueledCount = 0;
    let pendingCount = 0;
    let totalSpentWeek = 0;
    let totalLitersWeek = 0;
    let recordsThisWeek = [];

    if (activeSession) {
      recordsThisWeek = await query(
        env.DB,
        `SELECT fr.*, v.name as vehicle_name, v.plate as vehicle_plate, v.status as vehicle_status
         FROM fuel_records fr
         JOIN vehicles v ON fr.vehicle_id = v.id
         WHERE fr.session_id = ?`,
        [activeSession.id]
      );

      const fueledVehicleIds = new Set(recordsThisWeek.map(r => r.vehicle_id));
      const workingList = vehicles.filter(v => v.status === 'working');
      fueledCount = workingList.filter(v => fueledVehicleIds.has(v.id)).length;
      pendingCount = Math.max(0, workingList.length - fueledCount);

      totalSpentWeek = recordsThisWeek.reduce((sum, r) => sum + (Number(r.total_cost) || 0), 0);
      totalLitersWeek = recordsThisWeek.reduce((sum, r) => sum + (Number(r.liters) || 0), 0);
    } else {
      pendingCount = workingVehicles;
    }

    // 3. Fleet consumption average (ONLY for existing vehicles with odometer_working = 1 and valid km/L)
    const fleetAvgQuery = await get(
      env.DB,
      `SELECT 
        AVG(fr.consumption_kml) as avg_consumption,
        SUM(fr.km_driven) as total_km
       FROM fuel_records fr
       JOIN vehicles v ON fr.vehicle_id = v.id
       WHERE fr.odometer_working = 1 AND fr.consumption_kml > 0 AND fr.consumption_kml < 50`
    );
    const fleetAvgConsumption = totalVehicles > 0 && fleetAvgQuery?.avg_consumption
      ? Number(fleetAvgQuery.avg_consumption).toFixed(2)
      : null;

    // 4. Insights (Most economical, highest expense, most KM driven)
    const mostEconomical = totalVehicles > 0 ? await get(
      env.DB,
      `SELECT v.name, v.plate, AVG(fr.consumption_kml) as avg_kml
       FROM fuel_records fr
       JOIN vehicles v ON fr.vehicle_id = v.id
       WHERE fr.odometer_working = 1 AND fr.consumption_kml > 0
       GROUP BY v.id
       ORDER BY avg_kml DESC
       LIMIT 1`
    ) : null;

    const highestSpender = totalVehicles > 0 ? await get(
      env.DB,
      `SELECT v.name, v.plate, SUM(fr.total_cost) as total_spent, SUM(fr.liters) as total_liters
       FROM fuel_records fr
       JOIN vehicles v ON fr.vehicle_id = v.id
       GROUP BY v.id
       ORDER BY total_spent DESC
       LIMIT 1`
    ) : null;

    const mostKmDriven = totalVehicles > 0 ? await get(
      env.DB,
      `SELECT v.name, v.plate, SUM(fr.km_driven) as total_km
       FROM fuel_records fr
       JOIN vehicles v ON fr.vehicle_id = v.id
       WHERE fr.odometer_working = 1 AND fr.km_driven > 0
       GROUP BY v.id
       ORDER BY total_km DESC
       LIMIT 1`
    ) : null;

    // 5. Previous week comparison
    const completedSessions = await query(
      env.DB,
      "SELECT * FROM fueling_sessions WHERE status = 'completed' ORDER BY id DESC LIMIT 2"
    );
    let prevWeekDiff = {
      costDiffPct: 0,
      litersDiffPct: 0,
      prevCost: 0,
      prevLiters: 0
    };

    if (totalVehicles > 0 && completedSessions.length >= 2) {
      const currentS = completedSessions[0];
      const prevS = completedSessions[1];
      if (prevS.total_cost > 0) {
        prevWeekDiff.costDiffPct = Number((((currentS.total_cost - prevS.total_cost) / prevS.total_cost) * 100).toFixed(1));
        prevWeekDiff.prevCost = prevS.total_cost;
      }
      if (prevS.total_liters > 0) {
        prevWeekDiff.litersDiffPct = Number((((currentS.total_liters - prevS.total_liters) / prevS.total_liters) * 100).toFixed(1));
        prevWeekDiff.prevLiters = prevS.total_liters;
      }
    }

    // 6. Fuel Type Distribution for Charts
    const fuelDistribution = totalVehicles > 0 ? await query(
      env.DB,
      `SELECT 
        CASE 
          WHEN UPPER(fr.fuel_type) LIKE '%DIESEL%' THEN 'Diesel'
          WHEN UPPER(fr.fuel_type) LIKE '%GASOLINA%' THEN 'Gasolina'
          WHEN UPPER(fr.fuel_type) LIKE '%ETANOL%' OR UPPER(fr.fuel_type) LIKE '%ALCOOL%' THEN 'Etanol'
          ELSE 'Outro'
        END as fuel_group,
        SUM(fr.liters) as total_liters,
        SUM(fr.total_cost) as total_cost
       FROM fuel_records fr
       JOIN vehicles v ON fr.vehicle_id = v.id
       GROUP BY fuel_group`
    ) : [];

    // 7. Recent Fueling Sessions (last 6)
    const recentSessions = await query(
      env.DB,
      "SELECT id, code, date, total_vehicles, total_liters, total_cost, status FROM fueling_sessions ORDER BY id DESC LIMIT 6"
    );

    // 8. Alerts
    const alerts = [];
    const overdueReminders = await query(
      env.DB,
      `SELECT r.*, v.name as vehicle_name, v.plate 
       FROM maintenance_reminders r
       JOIN vehicles v ON r.vehicle_id = v.id
       WHERE r.status = 'pending' AND (
         r.trigger_date <= date('now') OR 
         (r.trigger_km IS NOT NULL AND r.trigger_km <= (SELECT MAX(km_current) FROM fuel_records WHERE vehicle_id = r.vehicle_id))
       )`
    );
    overdueReminders.forEach(r => {
      alerts.push({
        type: 'warning',
        category: 'Manutenção',
        message: `Lembrete pendente para ${r.vehicle_name} (${r.plate}): ${r.title}`
      });
    });

    const expiringDocs = await query(
      env.DB,
      `SELECT d.*, v.name as vehicle_name, v.plate 
       FROM vehicle_documents d
       JOIN vehicles v ON d.vehicle_id = v.id
       WHERE d.expiration_date IS NOT NULL AND d.expiration_date <= date('now', '+30 days')`
    );
    expiringDocs.forEach(d => {
      alerts.push({
        type: 'danger',
        category: 'Documento',
        message: `Documento ${d.name} do veículo ${d.vehicle_name} (${d.plate}) vence em ${d.expiration_date}`
      });
    });

    return Response.json({
      totals: {
        total_vehicles: totalVehicles,
        working_vehicles: workingVehicles,
        stopped_vehicles: stoppedVehicles,
        maintenance_vehicles: maintenanceVehicles,
        inactive_vehicles: inactiveVehicles,
        fueled_this_week: fueledCount,
        pending_this_week: pendingCount,
        total_spent_week: Number(totalSpentWeek.toFixed(2)),
        total_liters_week: Number(totalLitersWeek.toFixed(2)),
        fleet_avg_consumption_kml: fleetAvgConsumption
      },
      insights: {
        most_economical: mostEconomical ? {
          name: mostEconomical.name,
          plate: mostEconomical.plate,
          kml: Number(mostEconomical.avg_kml).toFixed(2)
        } : null,
        highest_spender: highestSpender ? {
          name: highestSpender.name,
          plate: highestSpender.plate,
          total_spent: Number(highestSpender.total_spent).toFixed(2),
          total_liters: Number(highestSpender.total_liters).toFixed(2)
        } : null,
        most_km: mostKmDriven ? {
          name: mostKmDriven.name,
          plate: mostKmDriven.plate,
          total_km: Number(mostKmDriven.total_km).toFixed(0)
        } : null,
        prev_week_diff: prevWeekDiff
      },
      fuel_distribution: fuelDistribution.map(f => ({
        ...f,
        total_liters: Number(Number(f.total_liters).toFixed(2)),
        total_cost: Number(Number(f.total_cost).toFixed(2))
      })),
      recent_sessions: recentSessions,
      alerts,
      active_session: activeSession
    });
  } catch (err) {
    console.error('Erro ao gerar estatísticas do dashboard Worker:', err);
    return Response.json({ error: 'Erro ao compilar dados do dashboard.' }, { status: 500 });
  }
}

export async function getFleetReports(request, env) {
  try {
    const url = new URL(request.url);
    const vehicle_id = url.searchParams.get('vehicle_id');
    const fuel_type = url.searchParams.get('fuel_type');
    const start_date = url.searchParams.get('start_date');
    const end_date = url.searchParams.get('end_date');

    let sql = `
      SELECT fr.*, v.name as vehicle_name, v.plate as vehicle_plate, v.brand as vehicle_brand,
             fs.code as session_code, fs.date as session_date
      FROM fuel_records fr
      JOIN vehicles v ON fr.vehicle_id = v.id
      LEFT JOIN fueling_sessions fs ON fr.session_id = fs.id
      WHERE 1=1
    `;
    const params = [];

    if (vehicle_id) {
      sql += ' AND fr.vehicle_id = ?';
      params.push(vehicle_id);
    }
    if (fuel_type) {
      sql += ' AND fr.fuel_type LIKE ?';
      params.push(`%${fuel_type}%`);
    }
    if (start_date) {
      sql += ' AND (fr.created_at >= ? OR fs.date >= ?)';
      params.push(start_date, start_date);
    }
    if (end_date) {
      sql += ' AND (fr.created_at <= ? OR fs.date <= ?)';
      params.push(end_date + ' 23:59:59', end_date);
    }

    sql += ' ORDER BY fr.id DESC';
    const records = await query(env.DB, sql, params);

    let totalCost = 0;
    let totalLiters = 0;
    let totalKm = 0;
    let validKmCount = 0;
    let sumKml = 0;

    records.forEach(r => {
      totalCost += Number(r.total_cost || 0);
      totalLiters += Number(r.liters || 0);
      if (r.km_driven && r.km_driven > 0) {
        totalKm += Number(r.km_driven);
      }
      if (r.odometer_working === 1 && r.consumption_kml && r.consumption_kml > 0) {
        validKmCount++;
        sumKml += Number(r.consumption_kml);
      }
    });

    return Response.json({
      records,
      summary: {
        total_records: records.length,
        total_cost: Number(totalCost.toFixed(2)),
        total_liters: Number(totalLiters.toFixed(2)),
        total_km: Number(totalKm.toFixed(1)),
        avg_consumption_kml: validKmCount > 0 ? Number((sumKml / validKmCount).toFixed(2)) : null
      }
    });
  } catch (err) {
    return Response.json({ error: 'Erro ao gerar relatório.' }, { status: 500 });
  }
}

export async function exportSessionExcel(request, env, user, sessionId) {
  try {
    const session = await get(env.DB, 'SELECT * FROM fueling_sessions WHERE id = ?', [sessionId]);
    if (!session) {
      return Response.json({ error: 'Sessão não encontrada.' }, { status: 404 });
    }

    const records = await query(
      env.DB,
      `SELECT fr.*, v.name as vehicle_name, v.plate as vehicle_plate, v.brand as vehicle_brand, v.model as vehicle_model
       FROM fuel_records fr
       JOIN vehicles v ON fr.vehicle_id = v.id
       WHERE fr.session_id = ?
       ORDER BY fr.id ASC`,
      [sessionId]
    );

    const rows = records.map(r => ({
      'Código da Sessão': session.code,
      'Data': session.date,
      'Veículo': r.vehicle_name,
      'Placa': r.vehicle_plate,
      'Combustível': r.fuel_type,
      'Odômetro Funcional': r.odometer_working === 1 ? 'Sim' : 'Não',
      'KM Anterior': r.km_previous || '-',
      'KM Atual': r.km_current || '-',
      'KM Rodados': r.km_driven || '-',
      'Litros': Number(r.liters).toFixed(2),
      'Valor / Litro (R$)': Number(r.price_per_liter).toFixed(2),
      'Valor Total (R$)': Number(r.total_cost).toFixed(2),
      'Consumo (km/L)': r.odometer_working === 1 && r.consumption_kml ? Number(r.consumption_kml).toFixed(2) : 'Não calculado',
      'Custo por KM (R$/km)': r.odometer_working === 1 && r.cost_per_km ? Number(r.cost_per_km).toFixed(2) : '-',
      'Tanque': r.is_full_tank ? 'Cheio' : 'Parcial',
      'Posto': r.fuel_station || '-',
      'Motorista': r.driver_name || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Abastecimento');

    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=Abastecimento-${session.code}.xlsx`
      }
    });
  } catch (err) {
    console.error('Erro ao exportar Excel Worker:', err);
    return Response.json({ error: 'Erro ao gerar arquivo Excel.' }, { status: 500 });
  }
}
