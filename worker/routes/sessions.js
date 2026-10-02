// Fueling Sessions & Cart Flow Controller for Cloudflare Workers & D1
import { query, get, run } from '../utils/db.js';
import { logAudit } from '../utils/audit.js';

async function generateSessionCode(db, dateStr) {
  const date = dateStr || new Date().toISOString().split('T')[0];
  const countObj = await get(db, 'SELECT COUNT(id) as count FROM fueling_sessions WHERE date = ?', [date]);
  const seq = String((countObj?.count || 0) + 1).padStart(3, '0');
  return `ABAST-${date}-${seq}`;
}

export async function getActiveSession(request, env) {
  try {
    const session = await get(
      env.DB,
      "SELECT * FROM fueling_sessions WHERE status IN ('in_progress', 'draft') ORDER BY id DESC LIMIT 1"
    );

    if (!session) {
      return Response.json({ session: null, records: [], summary: null });
    }

    const records = await query(
      env.DB,
      `SELECT fr.*, v.name as vehicle_name, v.brand as vehicle_brand, v.model as vehicle_model,
              v.plate as vehicle_plate, v.year_fab, v.year_model, v.fuel_type_default, v.photo_url as vehicle_photo
       FROM fuel_records fr
       JOIN vehicles v ON fr.vehicle_id = v.id
       WHERE fr.session_id = ?
       ORDER BY fr.id DESC`,
      [session.id]
    );

    const summary = calculateSessionSummary(records);

    return Response.json({
      session,
      records,
      summary
    });
  } catch (err) {
    console.error('Erro ao buscar sessão ativa Worker:', err);
    return Response.json({ error: 'Erro ao buscar sessão de abastecimento ativa.' }, { status: 500 });
  }
}

export async function createOrStartSession(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const { date, notes } = body;
    const sessionDate = date || new Date().toISOString().split('T')[0];

    // Check if there is already an active session
    const existing = await get(
      env.DB,
      "SELECT * FROM fueling_sessions WHERE status IN ('in_progress', 'draft') ORDER BY id DESC LIMIT 1"
    );

    if (existing) {
      return Response.json({ session: existing, isExisting: true });
    }

    const code = await generateSessionCode(env.DB, sessionDate);
    const result = await run(
      env.DB,
      `INSERT INTO fueling_sessions (code, date, status, notes, created_by)
       VALUES (?, ?, 'in_progress', ?, ?)`,
      [code, sessionDate, notes || null, user?.name || 'Operador']
    );

    const newSession = await get(env.DB, 'SELECT * FROM fueling_sessions WHERE id = ?', [result.lastInsertRowid]);
    await logAudit(env.DB, {
      entityType: 'fueling_sessions',
      entityId: result.lastInsertRowid,
      action: 'START_SESSION',
      userName: user?.name || 'Operador',
      newData: newSession
    });

    return Response.json({ session: newSession, isExisting: false }, { status: 201 });
  } catch (err) {
    console.error('Erro ao criar sessão Worker:', err);
    return Response.json({ error: 'Erro ao iniciar nova sessão de abastecimento.' }, { status: 500 });
  }
}

export async function getSessionById(request, env, user, id) {
  try {
    const session = await get(env.DB, 'SELECT * FROM fueling_sessions WHERE id = ?', [id]);
    if (!session) {
      return Response.json({ error: 'Sessão de abastecimento não encontrada.' }, { status: 404 });
    }

    const records = await query(
      env.DB,
      `SELECT fr.*, v.name as vehicle_name, v.brand as vehicle_brand, v.model as vehicle_model,
              v.plate as vehicle_plate, v.year_fab, v.year_model, v.fuel_type_default, v.photo_url as vehicle_photo
       FROM fuel_records fr
       JOIN vehicles v ON fr.vehicle_id = v.id
       WHERE fr.session_id = ?
       ORDER BY fr.id ASC`,
      [id]
    );

    const summary = calculateSessionSummary(records);

    return Response.json({
      session,
      records,
      summary
    });
  } catch (err) {
    console.error('Erro ao carregar sessão Worker:', err);
    return Response.json({ error: 'Erro ao carregar detalhes da sessão.' }, { status: 500 });
  }
}

export async function listAllSessions(request, env) {
  try {
    const sessions = await query(
      env.DB,
      'SELECT * FROM fueling_sessions ORDER BY id DESC LIMIT 50'
    );
    return Response.json({ sessions });
  } catch (err) {
    return Response.json({ error: 'Erro ao listar sessões.' }, { status: 500 });
  }
}

export async function addRecordToCart(request, env, user, sessionId) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      vehicle_id, driver_name, fuel_station, fuel_type, is_full_tank,
      km_current, liters, price_per_liter, total_cost, payment_method,
      photo_dashboard_url, photo_pump_url, receipt_url, notes, force
    } = body;

    const session = await get(env.DB, 'SELECT * FROM fueling_sessions WHERE id = ?', [sessionId]);
    if (!session) {
      return Response.json({ error: 'Sessão não encontrada.' }, { status: 404 });
    }

    if (session.status === 'completed' && !force) {
      return Response.json({ error: 'Esta sessão já foi finalizada e está bloqueada para novos registros.' }, { status: 400 });
    }

    const vehicle = await get(env.DB, 'SELECT * FROM vehicles WHERE id = ?', [vehicle_id]);
    if (!vehicle) {
      return Response.json({ error: 'Veículo não encontrado.' }, { status: 404 });
    }

    // Check duplicate in cart
    const existingInCart = await get(
      env.DB,
      'SELECT fr.*, v.name as vehicle_name, v.plate as vehicle_plate FROM fuel_records fr JOIN vehicles v ON fr.vehicle_id = v.id WHERE fr.session_id = ? AND fr.vehicle_id = ?',
      [sessionId, vehicle_id]
    );

    if (existingInCart && !force) {
      return Response.json({
        duplicate: true,
        message: `⚠️ O veículo ${vehicle.name} (${vehicle.plate}) já está no abastecimento atual.`,
        existingRecord: existingInCart
      }, { status: 409 });
    }

    // Validate calculations
    const numLiters = parseFloat(liters);
    const numPrice = parseFloat(price_per_liter);
    const calculatedTotal = total_cost ? parseFloat(total_cost) : (numLiters * numPrice);

    if (isNaN(numLiters) || numLiters <= 0) {
      return Response.json({ error: 'A quantidade de litros deve ser maior que zero.' }, { status: 400 });
    }
    if (isNaN(numPrice) || numPrice <= 0) {
      return Response.json({ error: 'O valor por litro deve ser maior que zero.' }, { status: 400 });
    }

    const isOdometerWorking = vehicle.odometer_working === 1;
    let kmPrevious = null;
    let kmCurrent = null;
    let kmDriven = null;
    let consumptionKml = null;
    let costPerKm = null;

    if (isOdometerWorking) {
      if (km_current === undefined || km_current === null || km_current === '') {
        return Response.json({ error: 'A quilometragem atual é obrigatória para este veículo.' }, { status: 400 });
      }
      kmCurrent = parseFloat(km_current);

      // Find previous KM
      const lastFuel = await get(
        env.DB,
        'SELECT km_current FROM fuel_records WHERE vehicle_id = ? AND odometer_working = 1 AND km_current IS NOT NULL AND id != ? ORDER BY id DESC LIMIT 1',
        [vehicle_id, existingInCart?.id || 0]
      );

      if (lastFuel && lastFuel.km_current) {
        kmPrevious = parseFloat(lastFuel.km_current);
        if (kmCurrent >= kmPrevious) {
          kmDriven = kmCurrent - kmPrevious;
          if (numLiters > 0) {
            consumptionKml = parseFloat((kmDriven / numLiters).toFixed(2));
          }
          if (kmDriven > 0) {
            costPerKm = parseFloat((calculatedTotal / kmDriven).toFixed(2));
          }
        }
      }
    }

    const finalFuelType = fuel_type || vehicle.fuel_type_default || 'Diesel S10';
    const isFullTank = is_full_tank === false || is_full_tank === 0 || is_full_tank === '0' ? 0 : 1;

    const result = await run(
      env.DB,
      `INSERT INTO fuel_records (
        session_id, vehicle_id, driver_name, fuel_station, fuel_type,
        is_full_tank, odometer_working, km_previous, km_current, km_driven,
        liters, price_per_liter, total_cost, consumption_kml, cost_per_km,
        payment_method, photo_dashboard_url, photo_pump_url, receipt_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId, vehicle_id, driver_name || null, fuel_station || null, finalFuelType,
        isFullTank, isOdometerWorking ? 1 : 0, kmPrevious, kmCurrent, kmDriven,
        numLiters, numPrice, calculatedTotal, consumptionKml, costPerKm,
        payment_method || null, photo_dashboard_url || null, photo_pump_url || null,
        receipt_url || null, notes || null
      ]
    );

    await updateSessionAggregates(env.DB, sessionId);

    const newRecord = await get(
      env.DB,
      `SELECT fr.*, v.name as vehicle_name, v.brand as vehicle_brand, v.model as vehicle_model,
              v.plate as vehicle_plate, v.year_fab, v.year_model, v.fuel_type_default, v.photo_url as vehicle_photo
       FROM fuel_records fr
       JOIN vehicles v ON fr.vehicle_id = v.id
       WHERE fr.id = ?`,
      [result.lastInsertRowid]
    );

    return Response.json({
      record: newRecord,
      message: `✅ ${vehicle.name} adicionado ao abastecimento com sucesso!`
    }, { status: 201 });
  } catch (err) {
    console.error('Erro ao adicionar registro ao carrinho Worker:', err);
    return Response.json({ error: 'Erro ao adicionar veículo ao abastecimento.' }, { status: 500 });
  }
}

export async function updateRecordInCart(request, env, user, sessionId, recordId) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      driver_name, fuel_station, fuel_type, is_full_tank,
      km_current, liters, price_per_liter, total_cost, payment_method,
      photo_dashboard_url, photo_pump_url, receipt_url, notes, justification
    } = body;

    const record = await get(env.DB, 'SELECT * FROM fuel_records WHERE id = ? AND session_id = ?', [recordId, sessionId]);
    if (!record) {
      return Response.json({ error: 'Registro não encontrado nesta sessão.' }, { status: 404 });
    }

    const session = await get(env.DB, 'SELECT * FROM fueling_sessions WHERE id = ?', [sessionId]);

    const numLiters = liters !== undefined ? parseFloat(liters) : record.liters;
    const numPrice = price_per_liter !== undefined ? parseFloat(price_per_liter) : record.price_per_liter;
    const calculatedTotal = total_cost !== undefined ? parseFloat(total_cost) : (numLiters * numPrice);

    let kmCurrent = record.km_current;
    let kmPrevious = record.km_previous;
    let kmDriven = record.km_driven;
    let consumptionKml = record.consumption_kml;
    let costPerKm = record.cost_per_km;

    if (record.odometer_working === 1) {
      if (km_current !== undefined) {
        kmCurrent = parseFloat(km_current);
      }
      if (kmPrevious && kmCurrent && kmCurrent >= kmPrevious) {
        kmDriven = kmCurrent - kmPrevious;
        if (numLiters > 0) {
          consumptionKml = parseFloat((kmDriven / numLiters).toFixed(2));
        }
        if (kmDriven > 0) {
          costPerKm = parseFloat((calculatedTotal / kmDriven).toFixed(2));
        }
      }
    }

    await run(
      env.DB,
      `UPDATE fuel_records SET
        driver_name = ?, fuel_station = ?, fuel_type = ?, is_full_tank = ?,
        km_current = ?, km_driven = ?, liters = ?, price_per_liter = ?,
        total_cost = ?, consumption_kml = ?, cost_per_km = ?, payment_method = ?,
        photo_dashboard_url = ?, photo_pump_url = ?, receipt_url = ?, notes = ?
       WHERE id = ?`,
      [
        driver_name !== undefined ? driver_name : record.driver_name,
        fuel_station !== undefined ? fuel_station : record.fuel_station,
        fuel_type || record.fuel_type,
        is_full_tank !== undefined ? (is_full_tank ? 1 : 0) : record.is_full_tank,
        kmCurrent, kmDriven, numLiters, numPrice, calculatedTotal,
        consumptionKml, costPerKm,
        payment_method !== undefined ? payment_method : record.payment_method,
        photo_dashboard_url !== undefined ? photo_dashboard_url : record.photo_dashboard_url,
        photo_pump_url !== undefined ? photo_pump_url : record.photo_pump_url,
        receipt_url !== undefined ? receipt_url : record.receipt_url,
        notes !== undefined ? notes : record.notes,
        recordId
      ]
    );

    await updateSessionAggregates(env.DB, sessionId);

    const updated = await get(env.DB, 'SELECT * FROM fuel_records WHERE id = ?', [recordId]);

    if (session?.status === 'completed') {
      await logAudit(env.DB, {
        entityType: 'fuel_records',
        entityId: recordId,
        action: 'EDIT_COMPLETED_SESSION_RECORD',
        userName: user?.name || 'Operador',
        oldData: record,
        newData: updated,
        justification: justification || 'Alteração de registro em sessão já finalizada.'
      });
    }

    return Response.json({ record: updated, message: 'Registro de abastecimento atualizado com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar registro Worker:', err);
    return Response.json({ error: 'Erro ao atualizar registro.' }, { status: 500 });
  }
}

export async function removeRecordFromCart(request, env, user, sessionId, recordId) {
  try {
    const body = await request.json().catch(() => ({}));
    const { justification } = body;

    const record = await get(env.DB, 'SELECT * FROM fuel_records WHERE id = ? AND session_id = ?', [recordId, sessionId]);
    if (!record) {
      return Response.json({ error: 'Registro não encontrado.' }, { status: 404 });
    }

    const session = await get(env.DB, 'SELECT * FROM fueling_sessions WHERE id = ?', [sessionId]);

    await run(env.DB, 'DELETE FROM fuel_records WHERE id = ?', [recordId]);
    await updateSessionAggregates(env.DB, sessionId);

    if (session?.status === 'completed') {
      await logAudit(env.DB, {
        entityType: 'fuel_records',
        entityId: recordId,
        action: 'DELETE_FROM_COMPLETED_SESSION',
        userName: user?.name || 'Operador',
        oldData: record,
        justification: justification || 'Remoção de item de sessão finalizada.'
      });
    }

    return Response.json({ message: 'Item removido do abastecimento com sucesso.' });
  } catch (err) {
    console.error('Erro ao remover registro Worker:', err);
    return Response.json({ error: 'Erro ao remover veículo do abastecimento.' }, { status: 500 });
  }
}

export async function finalizeSession(request, env, user, id) {
  try {
    const session = await get(env.DB, 'SELECT * FROM fueling_sessions WHERE id = ?', [id]);
    if (!session) {
      return Response.json({ error: 'Sessão não encontrada.' }, { status: 404 });
    }

    const records = await query(env.DB, 'SELECT * FROM fuel_records WHERE session_id = ?', [id]);
    if (records.length === 0) {
      return Response.json({ error: 'O carrinho está vazio. Adicione pelo menos um veículo antes de finalizar.' }, { status: 400 });
    }

    const summary = calculateSessionSummary(records);

    await run(
      env.DB,
      `UPDATE fueling_sessions SET
        status = 'completed',
        total_vehicles = ?,
        total_liters = ?,
        total_cost = ?,
        finalized_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [summary.total_vehicles, summary.total_liters, summary.total_cost, id]
    );

    const finalizedSession = await get(env.DB, 'SELECT * FROM fueling_sessions WHERE id = ?', [id]);
    await logAudit(env.DB, {
      entityType: 'fueling_sessions',
      entityId: id,
      action: 'FINALIZE_SESSION',
      userName: user?.name || 'Operador',
      newData: { code: finalizedSession.code, totals: summary }
    });

    return Response.json({
      session: finalizedSession,
      summary,
      message: 'Abastecimento da semana finalizado com sucesso!'
    });
  } catch (err) {
    console.error('Erro ao finalizar sessão Worker:', err);
    return Response.json({ error: 'Erro ao finalizar sessão de abastecimento.' }, { status: 500 });
  }
}

export async function cancelSession(request, env, user, id) {
  try {
    const body = await request.json().catch(() => ({}));
    const { justification } = body;

    const session = await get(env.DB, 'SELECT * FROM fueling_sessions WHERE id = ?', [id]);
    if (!session) {
      return Response.json({ error: 'Sessão não encontrada.' }, { status: 404 });
    }

    await run(env.DB, "UPDATE fueling_sessions SET status = 'cancelled' WHERE id = ?", [id]);
    await logAudit(env.DB, {
      entityType: 'fueling_sessions',
      entityId: id,
      action: 'CANCEL_SESSION',
      userName: user?.name || 'Operador',
      oldData: session,
      justification: justification || 'Cancelamento manual da sessão.'
    });

    return Response.json({ message: 'Sessão cancelada com sucesso.' });
  } catch (err) {
    return Response.json({ error: 'Erro ao cancelar sessão.' }, { status: 500 });
  }
}

async function updateSessionAggregates(db, sessionId) {
  const stats = await get(
    db,
    `SELECT COUNT(id) as count, COALESCE(SUM(liters), 0) as liters, COALESCE(SUM(total_cost), 0) as cost
     FROM fuel_records WHERE session_id = ?`,
    [sessionId]
  );
  await run(
    db,
    'UPDATE fueling_sessions SET total_vehicles = ?, total_liters = ?, total_cost = ? WHERE id = ?',
    [stats?.count || 0, stats?.liters || 0, stats?.cost || 0, sessionId]
  );
}

export function calculateSessionSummary(records = []) {
  const fuelsMap = {};
  let totalLiters = 0;
  let totalCost = 0;
  let validKmCount = 0;
  let totalKmDriven = 0;
  let totalConsumptionSum = 0;

  records.forEach(r => {
    const fuelKey = (r.fuel_type || 'Diesel S10').trim();
    const normalizedKey = normalizeFuelCategory(fuelKey);

    if (!fuelsMap[normalizedKey]) {
      fuelsMap[normalizedKey] = {
        name: normalizedKey,
        count: 0,
        liters: 0,
        total_cost: 0,
        avg_price_per_liter: 0,
        records: []
      };
    }

    fuelsMap[normalizedKey].count += 1;
    fuelsMap[normalizedKey].liters += Number(r.liters || 0);
    fuelsMap[normalizedKey].total_cost += Number(r.total_cost || 0);
    fuelsMap[normalizedKey].records.push(r);

    totalLiters += Number(r.liters || 0);
    totalCost += Number(r.total_cost || 0);

    if (r.odometer_working === 1 && r.consumption_kml && r.consumption_kml > 0) {
      validKmCount += 1;
      totalConsumptionSum += Number(r.consumption_kml);
      if (r.km_driven) totalKmDriven += Number(r.km_driven);
    }
  });

  const fuelBreakdown = Object.values(fuelsMap).map(f => {
    const avgPrice = f.liters > 0 ? (f.total_cost / f.liters) : 0;
    return {
      ...f,
      liters: Number(f.liters.toFixed(2)),
      total_cost: Number(f.total_cost.toFixed(2)),
      avg_price_per_liter: Number(avgPrice.toFixed(2))
    };
  });

  const fleetAvgConsumption = validKmCount > 0 ? Number((totalConsumptionSum / validKmCount).toFixed(2)) : null;

  return {
    total_vehicles: records.length,
    total_liters: Number(totalLiters.toFixed(2)),
    total_cost: Number(totalCost.toFixed(2)),
    total_km_driven: Number(totalKmDriven.toFixed(1)),
    fleet_avg_consumption_kml: fleetAvgConsumption,
    vehicles_with_odometer: validKmCount,
    vehicles_without_odometer: records.length - validKmCount,
    fuels: fuelBreakdown
  };
}

function normalizeFuelCategory(fuelType) {
  const upper = (fuelType || '').toUpperCase();
  if (upper.includes('DIESEL')) return 'Diesel';
  if (upper.includes('GASOLINA')) return 'Gasolina';
  if (upper.includes('ETANOL') || upper.includes('ÁLCOOL') || upper.includes('ALCOOL')) return 'Etanol';
  if (upper.includes('GNV')) return 'GNV';
  return fuelType || 'Outro';
}

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

export async function getPendingVehiclesForEmployee(request, env) {
  try {
    const { startDate, endDate } = getMondayAndSunday();

    const fueledThisWeek = await query(
      env.DB,
      `SELECT DISTINCT fr.vehicle_id
       FROM fuel_records fr
       LEFT JOIN fueling_sessions fs ON fr.session_id = fs.id
       WHERE (
         (date(fr.created_at) >= ? AND date(fr.created_at) <= ?)
         OR (fs.date IS NOT NULL AND fs.date >= ? AND fs.date <= ?)
       )`,
      [startDate, endDate, startDate, endDate]
    );

    const fueledVehicleIds = new Set(fueledThisWeek.map(r => r.vehicle_id));

    const activeVehicles = await query(
      env.DB,
      "SELECT id, name, brand, model, version, plate, fuel_type_default, photo_url, odometer_working FROM vehicles WHERE status = 'working' ORDER BY name ASC"
    );

    const pendingVehicles = activeVehicles.filter(v => !fueledVehicleIds.has(v.id));

    const sanitized = pendingVehicles.map(v => ({
      id: v.id,
      name: v.name,
      brand: v.brand,
      model: v.model,
      version: v.version,
      plate: v.plate,
      fuel_type_default: v.fuel_type_default || 'Diesel S10',
      photo_url: v.photo_url || null,
      odometer_working: v.odometer_working !== 0 && v.odometer_working !== false ? 1 : 0
    }));

    return Response.json({
      week: { startDate, endDate },
      total_pending: sanitized.length,
      vehicles: sanitized
    });
  } catch (err) {
    console.error('Erro ao listar veículos pendentes Worker:', err);
    return Response.json({ error: 'Erro ao listar veículos pendentes de abastecimento.' }, { status: 500 });
  }
}

export async function submitEmployeeFueling(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      vehicle_id,
      km_current,
      liters,
      price_per_liter,
      total_cost,
      photo_dashboard_url,
      photo_pump_url,
      fuel_type,
      notes
    } = body;

    if (!vehicle_id) {
      return Response.json({ error: 'Veículo é obrigatório.' }, { status: 400 });
    }

    const vehicle = await get(env.DB, 'SELECT * FROM vehicles WHERE id = ?', [vehicle_id]);
    if (!vehicle) {
      return Response.json({ error: 'Veículo não encontrado.' }, { status: 404 });
    }

    if (vehicle.status !== 'working') {
      return Response.json({ error: 'Este veículo não está ativo para abastecimento.' }, { status: 400 });
    }

    const { startDate, endDate } = getMondayAndSunday();
    const existingThisWeek = await get(
      env.DB,
      `SELECT fr.id FROM fuel_records fr
       LEFT JOIN fueling_sessions fs ON fr.session_id = fs.id
       WHERE fr.vehicle_id = ? AND (
         (date(fr.created_at) >= ? AND date(fr.created_at) <= ?)
         OR (fs.date IS NOT NULL AND fs.date >= ? AND fs.date <= ?)
       )`,
      [vehicle_id, startDate, endDate, startDate, endDate]
    );

    if (existingThisWeek) {
      return Response.json({ error: 'Este veículo já possui abastecimento registrado nesta semana.' }, { status: 400 });
    }

    const parseNumeric = (val) => {
      if (val === null || val === undefined || val === '') return NaN;
      if (typeof val === 'number') return val;
      const str = String(val).replace(/[R$\sLkm]/g, '').replace(',', '.');
      return parseFloat(str);
    };

    const numLiters = parseNumeric(liters);
    const numPrice = parseNumeric(price_per_liter);
    const numCost = parseNumeric(total_cost);

    const pumpPhoto = photo_pump_url || body.pump_photo_url;
    const dashPhoto = photo_dashboard_url || body.dashboard_photo_url;

    if (isNaN(numLiters) || numLiters <= 0) {
      return Response.json({ error: 'A quantidade de litros deve ser maior que zero.' }, { status: 400 });
    }
    if (isNaN(numPrice) || numPrice <= 0) {
      return Response.json({ error: 'O valor por litro deve ser maior que zero.' }, { status: 400 });
    }
    if (isNaN(numCost) || numCost <= 0) {
      return Response.json({ error: 'O valor total deve ser maior que zero.' }, { status: 400 });
    }
    if (!pumpPhoto) {
      return Response.json({ error: 'A foto da bomba é obrigatória.' }, { status: 400 });
    }

    const isOdoWorking = vehicle.odometer_working !== 0 && vehicle.odometer_working !== false ? 1 : 0;
    let numKmCurrent = null;

    if (isOdoWorking === 1) {
      const rawKm = km_current !== undefined && km_current !== null ? km_current : body.current_km;
      numKmCurrent = parseNumeric(rawKm);
      if (isNaN(numKmCurrent) || numKmCurrent <= 0) {
        return Response.json({ error: 'A quilometragem atual é obrigatória para este veículo.' }, { status: 400 });
      }
      if (!dashPhoto) {
        return Response.json({ error: 'A foto do painel é obrigatória para este veículo.' });
      }
    }

    let kmPrevious = null;
    let kmDriven = null;
    let consumptionKml = null;
    let costPerKm = null;

    if (isOdoWorking === 1 && numKmCurrent) {
      const lastFuel = await get(
        env.DB,
        'SELECT km_current FROM fuel_records WHERE vehicle_id = ? AND odometer_working = 1 AND km_current IS NOT NULL ORDER BY id DESC LIMIT 1',
        [vehicle_id]
      );
      if (lastFuel && lastFuel.km_current) {
        kmPrevious = parseFloat(lastFuel.km_current);
        if (numKmCurrent > kmPrevious) {
          kmDriven = numKmCurrent - kmPrevious;
          if (numLiters > 0) {
            consumptionKml = Number((kmDriven / numLiters).toFixed(2));
            costPerKm = Number((numCost / kmDriven).toFixed(2));
          }
        }
      }
    }

    const today = new Date().toISOString().split('T')[0];
    let session = await get(
      env.DB,
      "SELECT * FROM fueling_sessions WHERE date >= ? AND date <= ? AND status IN ('in_progress', 'draft') ORDER BY id DESC LIMIT 1",
      [startDate, endDate]
    );
    if (!session) {
      const code = await generateSessionCode(env.DB, today);
      const sessResult = await run(
        env.DB,
        "INSERT INTO fueling_sessions (code, date, status, created_by) VALUES (?, ?, 'in_progress', ?)",
        [code, today, user?.name || 'Funcionário']
      );
      session = await get(env.DB, 'SELECT * FROM fueling_sessions WHERE id = ?', [sessResult.lastInsertRowid]);
    }

    const assignedFuelType = fuel_type || vehicle.fuel_type_default || 'Diesel S10';

    const insertResult = await run(
      env.DB,
      `INSERT INTO fuel_records (
        session_id, vehicle_id, driver_name, fuel_type, is_full_tank,
        odometer_working, km_previous, km_current, km_driven,
        liters, price_per_liter, total_cost, consumption_kml, cost_per_km,
        photo_dashboard_url, photo_pump_url, notes, created_at
      ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        session.id,
        vehicle_id,
        user?.name || 'Funcionário',
        assignedFuelType,
        isOdoWorking,
        kmPrevious,
        numKmCurrent,
        kmDriven,
        numLiters,
        numPrice,
        numCost,
        consumptionKml,
        costPerKm,
        dashPhoto || null,
        pumpPhoto,
        notes || null
      ]
    );

    await updateSessionAggregates(env.DB, session.id);

    await logAudit(env.DB, {
      entityType: 'fuel_records',
      entityId: insertResult.lastInsertRowid,
      action: 'EMPLOYEE_FUELING',
      userName: user?.name || 'Funcionário',
      newData: {
        vehicle_plate: vehicle.plate,
        liters: numLiters,
        cost: numCost,
        km: numKmCurrent
      }
    });

    return Response.json({
      success: true,
      message: 'Abastecimento registrado com sucesso!',
      record_id: insertResult.lastInsertRowid
    }, { status: 201 });
  } catch (err) {
    console.error('Erro ao registrar abastecimento Worker:', err);
    return Response.json({ error: 'Erro ao registrar abastecimento.' }, { status: 500 });
  }
}

export async function updateFuelRecordDirect(request, env, user, id) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      driver_name, fuel_station, fuel_type, is_full_tank,
      km_current, liters, price_per_liter, total_cost, payment_method,
      photo_dashboard_url, photo_pump_url, receipt_url, notes, session_date, justification
    } = body;

    const record = await get(env.DB, 'SELECT * FROM fuel_records WHERE id = ?', [id]);
    if (!record) {
      return Response.json({ error: 'Registro de abastecimento não encontrado.' }, { status: 404 });
    }

    const vehicle = await get(env.DB, 'SELECT * FROM vehicles WHERE id = ?', [record.vehicle_id]);

    const numLiters = liters !== undefined ? parseFloat(liters) : record.liters;
    const numPrice = price_per_liter !== undefined ? parseFloat(price_per_liter) : record.price_per_liter;
    const calculatedTotal = total_cost !== undefined ? parseFloat(total_cost) : (numLiters * numPrice);

    let kmCurrent = record.km_current;
    let kmPrevious = record.km_previous;
    let kmDriven = record.km_driven;
    let consumptionKml = record.consumption_kml;
    let costPerKm = record.cost_per_km;

    const isOdometerWorking = vehicle ? vehicle.odometer_working === 1 : (record.odometer_working === 1);

    if (isOdometerWorking) {
      if (km_current !== undefined && km_current !== null) {
        kmCurrent = parseFloat(km_current);
      }
      if (kmPrevious !== null && kmPrevious !== undefined && kmCurrent !== null && kmCurrent >= kmPrevious) {
        kmDriven = kmCurrent - kmPrevious;
        if (numLiters > 0) {
          consumptionKml = parseFloat((kmDriven / numLiters).toFixed(2));
        }
        if (kmDriven > 0) {
          costPerKm = parseFloat((calculatedTotal / kmDriven).toFixed(2));
        }
      }
    } else {
      kmCurrent = null;
      kmDriven = null;
      consumptionKml = null;
      costPerKm = null;
    }

    let newCreatedAt = record.created_at;
    if (session_date) {
      const timePart = record.created_at && record.created_at.includes(' ') ? record.created_at.split(' ')[1] : '12:00:00';
      newCreatedAt = `${session_date} ${timePart}`;
    }

    await run(
      env.DB,
      `UPDATE fuel_records SET
        driver_name = ?, fuel_station = ?, fuel_type = ?, is_full_tank = ?,
        km_current = ?, km_driven = ?, liters = ?, price_per_liter = ?,
        total_cost = ?, consumption_kml = ?, cost_per_km = ?, payment_method = ?,
        photo_dashboard_url = ?, photo_pump_url = ?, receipt_url = ?, notes = ?,
        created_at = ?
       WHERE id = ?`,
      [
        driver_name !== undefined ? driver_name : record.driver_name,
        fuel_station !== undefined ? fuel_station : record.fuel_station,
        fuel_type || record.fuel_type,
        is_full_tank !== undefined ? (is_full_tank ? 1 : 0) : record.is_full_tank,
        kmCurrent, kmDriven, numLiters, numPrice, calculatedTotal,
        consumptionKml, costPerKm,
        payment_method !== undefined ? payment_method : record.payment_method,
        photo_dashboard_url !== undefined ? photo_dashboard_url : record.photo_dashboard_url,
        photo_pump_url !== undefined ? photo_pump_url : record.photo_pump_url,
        receipt_url !== undefined ? receipt_url : record.receipt_url,
        notes !== undefined ? notes : record.notes,
        newCreatedAt,
        id
      ]
    );

    if (record.session_id) {
      await updateSessionAggregates(env.DB, record.session_id);
    }

    const updated = await get(
      env.DB,
      `SELECT fr.*, v.name as vehicle_name, v.plate as vehicle_plate, v.brand as vehicle_brand, v.model as vehicle_model,
              fs.code as session_code, fs.date as session_date
       FROM fuel_records fr
       JOIN vehicles v ON fr.vehicle_id = v.id
       LEFT JOIN fueling_sessions fs ON fr.session_id = fs.id
       WHERE fr.id = ?`,
      [id]
    );

    await logAudit(env.DB, {
      entityType: 'fuel_records',
      entityId: id,
      action: 'EDIT_FUEL_RECORD',
      userName: user?.name || 'Operador',
      oldData: record,
      newData: updated,
      justification: justification || 'Edição de abastecimento.'
    });

    return Response.json({ record: updated, message: 'Abastecimento atualizado com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar abastecimento diretamente Worker:', err);
    return Response.json({ error: 'Erro ao atualizar abastecimento.' }, { status: 500 });
  }
}

export async function deleteFuelRecordDirect(request, env, user, id) {
  try {
    const body = await request.json().catch(() => ({}));
    const { justification } = body;

    const record = await get(env.DB, 'SELECT * FROM fuel_records WHERE id = ?', [id]);
    if (!record) {
      return Response.json({ error: 'Registro de abastecimento não encontrado.' }, { status: 404 });
    }

    await run(env.DB, 'DELETE FROM fuel_records WHERE id = ?', [id]);

    if (record.session_id) {
      await updateSessionAggregates(env.DB, record.session_id);
    }

    await logAudit(env.DB, {
      entityType: 'fuel_records',
      entityId: id,
      action: 'DELETE_FUEL_RECORD',
      userName: user?.name || 'Operador',
      oldData: record,
      justification: justification || 'Exclusão de abastecimento individual.'
    });

    return Response.json({ message: 'Abastecimento excluído com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir abastecimento diretamente Worker:', err);
    return Response.json({ error: 'Erro ao excluir abastecimento.' }, { status: 500 });
  }
}

