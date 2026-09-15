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
