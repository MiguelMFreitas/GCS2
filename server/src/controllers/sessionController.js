import { query, get, run } from '../config/database.js';
import { logAudit } from '../middlewares/audit.js';

function generateSessionCode(dateStr) {
  const date = dateStr || new Date().toISOString().split('T')[0];
  const countObj = get('SELECT COUNT(id) as count FROM fueling_sessions WHERE date = ?', [date]);
  const seq = String((countObj?.count || 0) + 1).padStart(3, '0');
  return `ABAST-${date}-${seq}`;
}

export function getActiveSession(req, res) {
  try {
    let session = get(
      "SELECT * FROM fueling_sessions WHERE status IN ('in_progress', 'draft') ORDER BY id DESC LIMIT 1"
    );

    if (!session) {
      return res.json({ session: null, records: [], summary: null });
    }

    const records = query(
      `SELECT fr.*, v.name as vehicle_name, v.brand as vehicle_brand, v.model as vehicle_model,
              v.plate as vehicle_plate, v.year_fab, v.year_model, v.fuel_type_default, v.photo_url as vehicle_photo
       FROM fuel_records fr
       JOIN vehicles v ON fr.vehicle_id = v.id
       WHERE fr.session_id = ?
       ORDER BY fr.id DESC`,
      [session.id]
    );

    const summary = calculateSessionSummary(records);

    return res.json({
      session,
      records,
      summary
    });
  } catch (err) {
    console.error('Erro ao buscar sessão ativa:', err);
    return res.status(500).json({ error: 'Erro ao buscar sessão de abastecimento ativa.' });
  }
}

export function createOrStartSession(req, res) {
  try {
    const { date, notes } = req.body;
    const sessionDate = date || new Date().toISOString().split('T')[0];

    // Check if there is already an active session
    let existing = get(
      "SELECT * FROM fueling_sessions WHERE status IN ('in_progress', 'draft') ORDER BY id DESC LIMIT 1"
    );

    if (existing) {
      return res.json({ session: existing, isExisting: true });
    }

    const code = generateSessionCode(sessionDate);
    const result = run(
      `INSERT INTO fueling_sessions (code, date, status, notes, created_by)
       VALUES (?, ?, 'in_progress', ?, ?)`,
      [code, sessionDate, notes || null, req.user?.name || 'Operador']
    );

    const newSession = get('SELECT * FROM fueling_sessions WHERE id = ?', [result.lastInsertRowid]);
    logAudit({
      entityType: 'fueling_sessions',
      entityId: result.lastInsertRowid,
      action: 'START_SESSION',
      userName: req.user?.name || 'Operador',
      newData: newSession
    });

    return res.status(201).json({ session: newSession, isExisting: false });
  } catch (err) {
    console.error('Erro ao criar sessão:', err);
    return res.status(500).json({ error: 'Erro ao iniciar nova sessão de abastecimento.' });
  }
}

export function getSessionById(req, res) {
  try {
    const { id } = req.params;
    const session = get('SELECT * FROM fueling_sessions WHERE id = ?', [id]);
    if (!session) {
      return res.status(404).json({ error: 'Sessão de abastecimento não encontrada.' });
    }

    const records = query(
      `SELECT fr.*, v.name as vehicle_name, v.brand as vehicle_brand, v.model as vehicle_model,
              v.plate as vehicle_plate, v.year_fab, v.year_model, v.fuel_type_default, v.photo_url as vehicle_photo
       FROM fuel_records fr
       JOIN vehicles v ON fr.vehicle_id = v.id
       WHERE fr.session_id = ?
       ORDER BY fr.id ASC`,
      [id]
    );

    const summary = calculateSessionSummary(records);

    return res.json({
      session,
      records,
      summary
    });
  } catch (err) {
    console.error('Erro ao carregar sessão:', err);
    return res.status(500).json({ error: 'Erro ao carregar detalhes da sessão.' });
  }
}

export function listAllSessions(req, res) {
  try {
    const sessions = query(
      'SELECT * FROM fueling_sessions ORDER BY id DESC LIMIT 50'
    );
    return res.json({ sessions });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar sessões.' });
  }
}

export function addRecordToCart(req, res) {
  try {
    const { session_id } = req.params;
    const {
      vehicle_id, driver_name, fuel_station, fuel_type, is_full_tank,
      km_current, liters, price_per_liter, total_cost, payment_method,
      photo_dashboard_url, photo_pump_url, receipt_url, notes, force
    } = req.body;

    const session = get('SELECT * FROM fueling_sessions WHERE id = ?', [session_id]);
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada.' });
    }

    if (session.status === 'completed' && !force) {
      return res.status(400).json({ error: 'Esta sessão já foi finalizada e está bloqueada para novos registros.' });
    }

    const vehicle = get('SELECT * FROM vehicles WHERE id = ?', [vehicle_id]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Veículo não encontrado.' });
    }

    // Check duplicate in cart
    const existingInCart = get(
      'SELECT fr.*, v.name as vehicle_name, v.plate as vehicle_plate FROM fuel_records fr JOIN vehicles v ON fr.vehicle_id = v.id WHERE fr.session_id = ? AND fr.vehicle_id = ?',
      [session_id, vehicle_id]
    );

    if (existingInCart && !force) {
      return res.status(409).json({
        duplicate: true,
        message: `⚠️ O veículo ${vehicle.name} (${vehicle.plate}) já está no abastecimento atual.`,
        existingRecord: existingInCart
      });
    }

    // Validate calculations
    const numLiters = parseFloat(liters);
    const numPrice = parseFloat(price_per_liter);
    const calculatedTotal = total_cost ? parseFloat(total_cost) : (numLiters * numPrice);

    if (isNaN(numLiters) || numLiters <= 0) {
      return res.status(400).json({ error: 'A quantidade de litros deve ser maior que zero.' });
    }
    if (isNaN(numPrice) || numPrice <= 0) {
      return res.status(400).json({ error: 'O valor por litro deve ser maior que zero.' });
    }

    const isOdometerWorking = vehicle.odometer_working === 1;
    let kmPrevious = null;
    let kmCurrent = null;
    let kmDriven = null;
    let consumptionKml = null;
    let costPerKm = null;

    if (isOdometerWorking) {
      if (km_current === undefined || km_current === null || km_current === '') {
        return res.status(400).json({ error: 'A quilometragem atual é obrigatória para este veículo.' });
      }
      kmCurrent = parseFloat(km_current);

      // Find previous KM
      const lastFuel = get(
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

    const result = run(
      `INSERT INTO fuel_records (
        session_id, vehicle_id, driver_name, fuel_station, fuel_type,
        is_full_tank, odometer_working, km_previous, km_current, km_driven,
        liters, price_per_liter, total_cost, consumption_kml, cost_per_km,
        payment_method, photo_dashboard_url, photo_pump_url, receipt_url, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session_id, vehicle_id, driver_name || null, fuel_station || null, finalFuelType,
        isFullTank, isOdometerWorking ? 1 : 0, kmPrevious, kmCurrent, kmDriven,
        numLiters, numPrice, calculatedTotal, consumptionKml, costPerKm,
        payment_method || null, photo_dashboard_url || null, photo_pump_url || null,
        receipt_url || null, notes || null
      ]
    );

    updateSessionAggregates(session_id);

    const newRecord = get(
      `SELECT fr.*, v.name as vehicle_name, v.brand as vehicle_brand, v.model as vehicle_model,
              v.plate as vehicle_plate, v.year_fab, v.year_model, v.fuel_type_default, v.photo_url as vehicle_photo
       FROM fuel_records fr
       JOIN vehicles v ON fr.vehicle_id = v.id
       WHERE fr.id = ?`,
      [result.lastInsertRowid]
    );

    return res.status(201).json({
      record: newRecord,
      message: `✅ ${vehicle.name} adicionado ao abastecimento com sucesso!`
    });
  } catch (err) {
    console.error('Erro ao adicionar registro ao carrinho:', err);
    return res.status(500).json({ error: 'Erro ao adicionar veículo ao abastecimento.' });
  }
}

export function updateRecordInCart(req, res) {
  try {
    const { session_id, record_id } = req.params;
    const {
      driver_name, fuel_station, fuel_type, is_full_tank,
      km_current, liters, price_per_liter, total_cost, payment_method,
      photo_dashboard_url, photo_pump_url, receipt_url, notes, justification
    } = req.body;

    const record = get('SELECT * FROM fuel_records WHERE id = ? AND session_id = ?', [record_id, session_id]);
    if (!record) {
      return res.status(404).json({ error: 'Registro não encontrado nesta sessão.' });
    }

    const session = get('SELECT * FROM fueling_sessions WHERE id = ?', [session_id]);
    const vehicle = get('SELECT * FROM vehicles WHERE id = ?', [record.vehicle_id]);

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

    run(
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
        record_id
      ]
    );

    updateSessionAggregates(session_id);

    const updated = get('SELECT * FROM fuel_records WHERE id = ?', [record_id]);

    if (session?.status === 'completed') {
      logAudit({
        entityType: 'fuel_records',
        entityId: record_id,
        action: 'EDIT_COMPLETED_SESSION_RECORD',
        userName: req.user?.name || 'Operador',
        oldData: record,
        newData: updated,
        justification: justification || 'Alteração de registro em sessão já finalizada.'
      });
    }

    return res.json({ record: updated, message: 'Registro de abastecimento atualizado com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar registro:', err);
    return res.status(500).json({ error: 'Erro ao atualizar registro.' });
  }
}

export function removeRecordFromCart(req, res) {
  try {
    const { session_id, record_id } = req.params;
    const { justification } = req.body;

    const record = get('SELECT * FROM fuel_records WHERE id = ? AND session_id = ?', [record_id, session_id]);
    if (!record) {
      return res.status(404).json({ error: 'Registro não encontrado.' });
    }

    const session = get('SELECT * FROM fueling_sessions WHERE id = ?', [session_id]);

    run('DELETE FROM fuel_records WHERE id = ?', [record_id]);
    updateSessionAggregates(session_id);

    if (session?.status === 'completed') {
      logAudit({
        entityType: 'fuel_records',
        entityId: record_id,
        action: 'DELETE_FROM_COMPLETED_SESSION',
        userName: req.user?.name || 'Operador',
        oldData: record,
        justification: justification || 'Remoção de item de sessão finalizada.'
      });
    }

    return res.json({ message: 'Item removido do abastecimento com sucesso.' });
  } catch (err) {
    console.error('Erro ao remover registro:', err);
    return res.status(500).json({ error: 'Erro ao remover veículo do abastecimento.' });
  }
}

export function finalizeSession(req, res) {
  try {
    const { id } = req.params;
    const session = get('SELECT * FROM fueling_sessions WHERE id = ?', [id]);
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada.' });
    }

    const records = query('SELECT * FROM fuel_records WHERE session_id = ?', [id]);
    if (records.length === 0) {
      return res.status(400).json({ error: 'O carrinho está vazio. Adicione pelo menos um veículo antes de finalizar.' });
    }

    const summary = calculateSessionSummary(records);

    run(
      `UPDATE fueling_sessions SET
        status = 'completed',
        total_vehicles = ?,
        total_liters = ?,
        total_cost = ?,
        finalized_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [summary.total_vehicles, summary.total_liters, summary.total_cost, id]
    );

    const finalizedSession = get('SELECT * FROM fueling_sessions WHERE id = ?', [id]);
    logAudit({
      entityType: 'fueling_sessions',
      entityId: id,
      action: 'FINALIZE_SESSION',
      userName: req.user?.name || 'Operador',
      newData: { code: finalizedSession.code, totals: summary }
    });

    return res.json({
      session: finalizedSession,
      summary,
      message: 'Abastecimento da semana finalizado com sucesso!'
    });
  } catch (err) {
    console.error('Erro ao finalizar sessão:', err);
    return res.status(500).json({ error: 'Erro ao finalizar sessão de abastecimento.' });
  }
}

export function cancelSession(req, res) {
  try {
    const { id } = req.params;
    const { justification } = req.body;

    const session = get('SELECT * FROM fueling_sessions WHERE id = ?', [id]);
    if (!session) {
      return res.status(404).json({ error: 'Sessão não encontrada.' });
    }

    run("UPDATE fueling_sessions SET status = 'cancelled' WHERE id = ?", [id]);
    logAudit({
      entityType: 'fueling_sessions',
      entityId: id,
      action: 'CANCEL_SESSION',
      userName: req.user?.name || 'Operador',
      oldData: session,
      justification: justification || 'Cancelamento manual da sessão.'
    });

    return res.json({ message: 'Sessão cancelada com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao cancelar sessão.' });
  }
}

function updateSessionAggregates(sessionId) {
  const stats = get(
    `SELECT COUNT(id) as count, COALESCE(SUM(liters), 0) as liters, COALESCE(SUM(total_cost), 0) as cost
     FROM fuel_records WHERE session_id = ?`,
    [sessionId]
  );
  run(
    'UPDATE fueling_sessions SET total_vehicles = ?, total_liters = ?, total_cost = ? WHERE id = ?',
    [stats.count || 0, stats.liters || 0, stats.cost || 0, sessionId]
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

  // Calculate weighted average price per liter for each fuel
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
