// Reports & Dashboard Stats Controller for Cloudflare Workers & D1
import { query, get } from '../utils/db.js';
import * as XLSX from 'xlsx';

function getMondayAndSunday(dateStr) {
  let targetDate;
  if (dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    targetDate = new Date(y, m - 1, d, 12, 0, 0);
  } else {
    targetDate = new Date();
  }
  
  const day = targetDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(targetDate);
  monday.setDate(targetDate.getDate() + diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatYMD = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateNum = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dateNum}`;
  };

  return {
    startDate: formatYMD(monday),
    endDate: formatYMD(sunday)
  };
}

export async function getDashboardStats(request, env) {
  try {
    const url = new URL(request.url);
    const start_date = url.searchParams.get('start_date');
    const end_date = url.searchParams.get('end_date');
    const date = url.searchParams.get('date');

    const defaultWeek = getMondayAndSunday(date);
    const effectiveStartDate = start_date || defaultWeek.startDate;
    const effectiveEndDate = end_date || defaultWeek.endDate;

    // 1. Vehicle counts by status (Fleet Overview)
    const vehicles = await query(env.DB, 'SELECT id, name, model, plate, status, odometer_working FROM vehicles');
    const totalVehicles = vehicles.length;
    const workingVehicles = vehicles.filter(v => v.status === 'working').length;
    const stoppedVehicles = vehicles.filter(v => v.status === 'stopped').length;
    const maintenanceVehicles = vehicles.filter(v => v.status === 'maintenance').length;
    const inactiveVehicles = vehicles.filter(v => v.status === 'inactive').length;

    // 2. Query Fuel Records STRICTLY for the Selected Week
    const recordsThisWeek = await query(
      env.DB,
      `SELECT fr.*, v.name as vehicle_name, v.plate as vehicle_plate, v.status as vehicle_status,
              fs.code as session_code, fs.date as session_date
       FROM fuel_records fr
       JOIN vehicles v ON fr.vehicle_id = v.id
       LEFT JOIN fueling_sessions fs ON fr.session_id = fs.id
       WHERE (
         (fs.date IS NOT NULL AND fs.date >= ? AND fs.date <= ?)
         OR (fs.date IS NULL AND fr.created_at >= ? AND fr.created_at <= ?)
       )
       ORDER BY fr.id ASC`,
      [effectiveStartDate, effectiveEndDate, effectiveStartDate, effectiveEndDate + ' 23:59:59']
    );

    const fueledVehicleIds = new Set(recordsThisWeek.map(r => r.vehicle_id));
    const workingList = vehicles.filter(v => v.status === 'working');
    const fueledCount = workingList.filter(v => fueledVehicleIds.has(v.id)).length;
    const pendingCount = Math.max(0, workingList.length - fueledCount);

    const totalSpentWeek = recordsThisWeek.reduce((sum, r) => sum + (Number(r.total_cost) || 0), 0);
    const totalLitersWeek = recordsThisWeek.reduce((sum, r) => sum + (Number(r.liters) || 0), 0);

    // 3. Fleet consumption average STRICTLY in the selected week
    const validConsRecords = recordsThisWeek.filter(r => 
      (r.odometer_working === 1 || r.odometer_working === true || r.odometer_working === '1') && 
      Number(r.consumption_kml) > 0 && 
      Number(r.consumption_kml) < 50
    );
    const fleetAvgConsumption = validConsRecords.length > 0
      ? Number((validConsRecords.reduce((s, r) => s + Number(r.consumption_kml), 0) / validConsRecords.length).toFixed(2))
      : null;

    // 4. Insights (Strictly in the selected week)
    // Most economical vehicle in week
    let mostEconomical = null;
    const ecoMap = {};
    validConsRecords.forEach(r => {
      if (!ecoMap[r.vehicle_id]) ecoMap[r.vehicle_id] = { name: r.vehicle_name, plate: r.vehicle_plate, sumKml: 0, count: 0 };
      ecoMap[r.vehicle_id].sumKml += Number(r.consumption_kml);
      ecoMap[r.vehicle_id].count += 1;
    });
    const ecoList = Object.values(ecoMap).map(e => ({ name: e.name, plate: e.plate, kml: (e.sumKml / e.count).toFixed(2) }));
    if (ecoList.length > 0) {
      ecoList.sort((a, b) => Number(b.kml) - Number(a.kml));
      mostEconomical = ecoList[0];
    }

    // Highest spender vehicle in week
    let highestSpender = null;
    const spenderMap = {};
    recordsThisWeek.forEach(r => {
      if (!spenderMap[r.vehicle_id]) spenderMap[r.vehicle_id] = { name: r.vehicle_name, plate: r.vehicle_plate, total_spent: 0, total_liters: 0 };
      spenderMap[r.vehicle_id].total_spent += Number(r.total_cost || 0);
      spenderMap[r.vehicle_id].total_liters += Number(r.liters || 0);
    });
    const spenderList = Object.values(spenderMap);
    if (spenderList.length > 0) {
      spenderList.sort((a, b) => b.total_spent - a.total_spent);
      highestSpender = {
        name: spenderList[0].name,
        plate: spenderList[0].plate,
        total_spent: spenderList[0].total_spent.toFixed(2),
        total_liters: spenderList[0].total_liters.toFixed(2)
      };
    }

    // Most KM driven vehicle in week
    let mostKmDriven = null;
    const kmMap = {};
    recordsThisWeek.forEach(r => {
      if ((r.odometer_working === 1 || r.odometer_working === true || r.odometer_working === '1') && Number(r.km_driven) > 0) {
        if (!kmMap[r.vehicle_id]) kmMap[r.vehicle_id] = { name: r.vehicle_name, plate: r.vehicle_plate, total_km: 0 };
        kmMap[r.vehicle_id].total_km += Number(r.km_driven);
      }
    });
    const kmList = Object.values(kmMap);
    if (kmList.length > 0) {
      kmList.sort((a, b) => b.total_km - a.total_km);
      mostKmDriven = {
        name: kmList[0].name,
        plate: kmList[0].plate,
        total_km: kmList[0].total_km.toFixed(0)
      };
    }

    // 5. Fuel Type Distribution STRICTLY for this week
    const fuelMap = {};
    recordsThisWeek.forEach(r => {
      let group = 'Outro';
      const fUpper = (r.fuel_type || '').toUpperCase();
      if (fUpper.includes('DIESEL')) group = 'Diesel';
      else if (fUpper.includes('GASOLINA')) group = 'Gasolina';
      else if (fUpper.includes('ETANOL') || fUpper.includes('ALCOOL')) group = 'Etanol';
      else if (fUpper.includes('GNV')) group = 'GNV';

      if (!fuelMap[group]) fuelMap[group] = { fuel_group: group, total_liters: 0, total_cost: 0 };
      fuelMap[group].total_liters += Number(r.liters || 0);
      fuelMap[group].total_cost += Number(r.total_cost || 0);
    });
    const fuelDistribution = Object.values(fuelMap).map(f => ({
      fuel_group: f.fuel_group,
      total_liters: Number(f.total_liters.toFixed(2)),
      total_cost: Number(f.total_cost.toFixed(2))
    }));

    // 6. Recent Fueling Sessions (last 6)
    const recentSessions = await query(
      env.DB,
      "SELECT id, code, date, total_vehicles, total_liters, total_cost, status FROM fueling_sessions ORDER BY id DESC LIMIT 6"
    );

    // 7. Active session if any
    const activeSession = (await get(env.DB, "SELECT * FROM fueling_sessions WHERE status IN ('in_progress', 'draft') ORDER BY id DESC LIMIT 1"));

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
      week_info: {
        start_date: effectiveStartDate,
        end_date: effectiveEndDate,
        total_records: recordsThisWeek.length
      },
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
        most_economical: mostEconomical,
        highest_spender: highestSpender,
        most_km: mostKmDriven
      },
      fuel_distribution: fuelDistribution,
      recent_sessions: recentSessions,
      alerts,
      active_session: activeSession
    });
  } catch (err) {
    console.error('Erro ao gerar estatísticas do dashboard Worker:', err);
    return Response.json({ error: 'Erro ao compilar dados do dashboard.' }, { status: 500 });
  }
}

function getWeekRangeForDate(dateStr) {
  if (!dateStr) return { weekKey: 'unknown', startDate: '', endDate: '', label: 'Sem data' };
  const cleanDate = dateStr.split('T')[0].split(' ')[0];
  const [y, m, d] = cleanDate.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d, 12, 0, 0);
  const day = targetDate.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  
  const monday = new Date(targetDate);
  monday.setDate(targetDate.getDate() + diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatYMD = (dt) => {
    const yr = dt.getFullYear();
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const da = String(dt.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  const formatBR = (dt) => {
    const da = String(dt.getDate()).padStart(2, '0');
    const mo = String(dt.getMonth() + 1).padStart(2, '0');
    const yr = dt.getFullYear();
    return `${da}/${mo}/${yr}`;
  };

  const startYMD = formatYMD(monday);
  const endYMD = formatYMD(sunday);

  return {
    weekKey: `${startYMD}_${endYMD}`,
    startDate: startYMD,
    endDate: endYMD,
    label: `Semana ${formatBR(monday)} a ${formatBR(sunday)}`
  };
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
             v.model as vehicle_model, v.year_fab, v.year_model,
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
      sql += ' AND COALESCE(NULLIF(fs.date, ""), date(fr.created_at), substr(fr.created_at, 1, 10)) >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND COALESCE(NULLIF(fs.date, ""), date(fr.created_at), substr(fr.created_at, 1, 10)) <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY fr.id DESC';
    const records = await query(env.DB, sql, params);

    // Grouping by Vehicle
    const vehicleMap = new Map();
    records.forEach(r => {
      const vId = r.vehicle_id;
      if (!vehicleMap.has(vId)) {
        vehicleMap.set(vId, {
          vehicle_id: vId,
          vehicle_name: r.vehicle_name,
          vehicle_plate: r.vehicle_plate,
          vehicle_brand: r.vehicle_brand,
          vehicle_model: r.vehicle_model,
          vehicle_year: `${r.year_fab || ''}/${r.year_model || ''}`.replace(/^\/|\/$/g, '') || '-',
          odometer_working: r.odometer_working,
          records: []
        });
      }
      vehicleMap.get(vId).records.push(r);
    });

    const vehicles_data = Array.from(vehicleMap.values()).map(v => {
      // Sort vehicle fuelings chronologically
      v.records.sort((a, b) => {
        const dateA = a.session_date || a.created_at || '';
        const dateB = b.session_date || b.created_at || '';
        return dateA.localeCompare(dateB) || a.id - b.id;
      });

      let totalCost = 0;
      let totalLiters = 0;
      let totalKm = 0;
      const validKmlValues = [];
      const weekMap = new Map();

      v.records.forEach(r => {
        totalCost += Number(r.total_cost || 0);
        totalLiters += Number(r.liters || 0);
        if (r.km_driven && Number(r.km_driven) > 0) {
          totalKm += Number(r.km_driven);
        }
        const isOdometerWorking = r.odometer_working === 1 || r.odometer_working === true || r.odometer_working === '1';
        const kml = Number(r.consumption_kml);
        const hasValidKml = isOdometerWorking && kml > 0 && kml < 100;

        if (hasValidKml) {
          validKmlValues.push(kml);
        }

        // Weekly grouping within the vehicle
        const dateStr = r.session_date || r.created_at;
        const weekInfo = getWeekRangeForDate(dateStr);
        if (!weekMap.has(weekInfo.weekKey)) {
          weekMap.set(weekInfo.weekKey, {
            week_key: weekInfo.weekKey,
            week_label: weekInfo.label,
            start_date: weekInfo.startDate,
            end_date: weekInfo.endDate,
            fuelings_count: 0,
            total_liters: 0,
            total_cost: 0,
            total_km: 0,
            kml_values: []
          });
        }
        const w = weekMap.get(weekInfo.weekKey);
        w.fuelings_count += 1;
        w.total_liters += Number(r.liters || 0);
        w.total_cost += Number(r.total_cost || 0);
        if (r.km_driven && Number(r.km_driven) > 0) {
          w.total_km += Number(r.km_driven);
        }
        if (hasValidKml) {
          w.kml_values.push(kml);
        }
      });

      const weekly_averages = Array.from(weekMap.values())
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .map(w => ({
          week_key: w.week_key,
          week_label: w.week_label,
          start_date: w.start_date,
          end_date: w.end_date,
          fuelings_count: w.fuelings_count,
          total_liters: Number(w.total_liters.toFixed(2)),
          total_cost: Number(w.total_cost.toFixed(2)),
          total_km: Number(w.total_km.toFixed(1)),
          avg_consumption_kml: w.kml_values.length > 0
            ? Number((w.kml_values.reduce((s, val) => s + val, 0) / w.kml_values.length).toFixed(2))
            : null
        }));

      const avgKml = validKmlValues.length > 0
        ? Number((validKmlValues.reduce((s, val) => s + val, 0) / validKmlValues.length).toFixed(2))
        : null;

      const avgLiters = v.records.length > 0 ? Number((totalLiters / v.records.length).toFixed(2)) : 0;
      const avgTotalCost = v.records.length > 0 ? Number((totalCost / v.records.length).toFixed(2)) : 0;
      const avgPricePerLiter = v.records.length > 0
        ? Number((v.records.reduce((s, r) => s + Number(r.price_per_liter || 0), 0) / v.records.length).toFixed(2))
        : 0;

      return {
        ...v,
        summary: {
          fuelings_count: v.records.length,
          total_cost: Number(totalCost.toFixed(2)),
          total_liters: Number(totalLiters.toFixed(2)),
          total_km: Number(totalKm.toFixed(1)),
          avg_liters: avgLiters,
          avg_total_cost: avgTotalCost,
          avg_price_per_liter: avgPricePerLiter,
          avg_consumption_kml: avgKml,
          weekly_averages
        }
      };
    });

    // Overall Fleet Summary
    let fleetTotalCost = 0;
    let fleetTotalLiters = 0;
    let fleetTotalKm = 0;
    const fleetValidKmlValues = [];
    const fuelGroupMap = new Map();

    records.forEach(r => {
      fleetTotalCost += Number(r.total_cost || 0);
      fleetTotalLiters += Number(r.liters || 0);
      if (r.km_driven && Number(r.km_driven) > 0) {
        fleetTotalKm += Number(r.km_driven);
      }
      const isOdometerWorking = r.odometer_working === 1 || r.odometer_working === true || r.odometer_working === '1';
      const kml = Number(r.consumption_kml);
      if (isOdometerWorking && kml > 0 && kml < 100) {
        fleetValidKmlValues.push(kml);
      }

      let fuelName = r.fuel_type || 'Diesel S10';
      if (fuelName.toUpperCase() === 'FLEX') fuelName = 'Gasolina';
      if (!fuelGroupMap.has(fuelName)) {
        fuelGroupMap.set(fuelName, { name: fuelName, count: 0, liters: 0, total_cost: 0 });
      }
      const f = fuelGroupMap.get(fuelName);
      f.count += 1;
      f.liters += Number(r.liters || 0);
      f.total_cost += Number(r.total_cost || 0);
    });

    const fleetAvgKml = fleetValidKmlValues.length > 0
      ? Number((fleetValidKmlValues.reduce((s, val) => s + val, 0) / fleetValidKmlValues.length).toFixed(2))
      : null;

    const fleetAvgLiters = records.length > 0 ? Number((fleetTotalLiters / records.length).toFixed(2)) : 0;
    const fleetAvgCost = records.length > 0 ? Number((fleetTotalCost / records.length).toFixed(2)) : 0;
    const fleetAvgPrice = records.length > 0
      ? Number((records.reduce((s, r) => s + Number(r.price_per_liter || 0), 0) / records.length).toFixed(2))
      : 0;

    const fuels = Array.from(fuelGroupMap.values()).map(f => ({
      name: f.name,
      count: f.count,
      liters: Number(f.liters.toFixed(2)),
      total_cost: Number(f.total_cost.toFixed(2))
    }));

    console.log(`📊 [Reports Worker] Consulta executada. Encontrados: ${records.length} abastecimentos, ${vehicles_data.length} veículos.`);

    return Response.json({
      records,
      vehicles_data,
      summary: {
        total_vehicles: vehicles_data.length,
        total_records: records.length,
        total_cost: Number(fleetTotalCost.toFixed(2)),
        total_liters: Number(fleetTotalLiters.toFixed(2)),
        total_km: Number(fleetTotalKm.toFixed(1)),
        avg_liters_per_fueling: fleetAvgLiters,
        avg_cost_per_fueling: fleetAvgCost,
        avg_price_per_liter: fleetAvgPrice,
        avg_consumption_kml: fleetAvgKml,
        fuels
      }
    });
  } catch (err) {
    console.error('❌ [Reports Worker] Erro ao gerar relatório:', {
      message: err.message,
      stack: err.stack,
      url: request.url
    });
    return Response.json({ error: 'Erro ao gerar relatório.', details: err.message }, { status: 500 });
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
