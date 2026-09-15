// Vehicles Controller for Cloudflare Workers & D1
import { query, get, run } from '../utils/db.js';
import { logAudit } from '../utils/audit.js';

export async function listVehicles(request, env) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    let sql = 'SELECT * FROM vehicles WHERE 1=1';
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (name LIKE ? OR model LIKE ? OR brand LIKE ? OR plate LIKE ? OR renavam LIKE ?)';
      params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY name ASC';
    const vehicles = await query(env.DB, sql, params);

    // Attach latest KM and last fueling info for each vehicle
    const enriched = await Promise.all(
      vehicles.map(async (v) => {
        const lastFuel = await get(
          env.DB,
          'SELECT km_current, created_at, liters, total_cost, consumption_kml FROM fuel_records WHERE vehicle_id = ? ORDER BY id DESC LIMIT 1',
          [v.id]
        );
        return {
          ...v,
          last_km: lastFuel?.km_current || null,
          last_fueling_date: lastFuel?.created_at || null,
          last_consumption_kml: lastFuel?.consumption_kml || null
        };
      })
    );

    return Response.json({ vehicles: enriched });
  } catch (err) {
    console.error('Erro ao listar veículos Worker:', err);
    return Response.json({ error: 'Erro ao listar veículos.' }, { status: 500 });
  }
}

export async function getVehicleById(request, env, user, id) {
  try {
    const vehicle = await get(env.DB, 'SELECT * FROM vehicles WHERE id = ?', [id]);
    if (!vehicle) {
      return Response.json({ error: 'Veículo não encontrado.' }, { status: 404 });
    }

    const fuelings = await query(
      env.DB,
      `SELECT fr.*, fs.code as session_code 
       FROM fuel_records fr 
       LEFT JOIN fueling_sessions fs ON fr.session_id = fs.id 
       WHERE fr.vehicle_id = ? 
       ORDER BY fr.id DESC LIMIT 20`,
      [id]
    );

    const documents = await query(
      env.DB,
      'SELECT * FROM vehicle_documents WHERE vehicle_id = ? ORDER BY expiration_date ASC',
      [id]
    );

    const maintenances = await query(
      env.DB,
      'SELECT * FROM maintenance_records WHERE vehicle_id = ? ORDER BY entry_date DESC',
      [id]
    );

    const expenses = await query(
      env.DB,
      'SELECT * FROM vehicle_expenses WHERE vehicle_id = ? ORDER BY date DESC',
      [id]
    );

    const reminders = await query(
      env.DB,
      'SELECT * FROM maintenance_reminders WHERE vehicle_id = ? ORDER BY id DESC',
      [id]
    );

    const stats = await get(
      env.DB,
      `SELECT 
        COUNT(id) as total_fuelings,
        SUM(liters) as total_liters,
        SUM(total_cost) as total_cost,
        MAX(km_current) as current_km,
        AVG(CASE WHEN odometer_working = 1 AND consumption_kml > 0 THEN consumption_kml ELSE NULL END) as avg_consumption_kml,
        AVG(CASE WHEN odometer_working = 1 AND cost_per_km > 0 THEN cost_per_km ELSE NULL END) as avg_cost_per_km
       FROM fuel_records WHERE vehicle_id = ?`,
      [id]
    );

    return Response.json({
      vehicle,
      stats: {
        total_fuelings: stats?.total_fuelings || 0,
        total_liters: Number(stats?.total_liters || 0).toFixed(2),
        total_cost: Number(stats?.total_cost || 0).toFixed(2),
        current_km: stats?.current_km || null,
        avg_consumption_kml: stats?.avg_consumption_kml ? Number(stats.avg_consumption_kml).toFixed(2) : null,
        avg_cost_per_km: stats?.avg_cost_per_km ? Number(stats.avg_cost_per_km).toFixed(2) : null
      },
      fuelings,
      documents,
      maintenances,
      expenses,
      reminders
    });
  } catch (err) {
    console.error('Erro ao buscar veículo:', err);
    return Response.json({ error: 'Erro ao buscar veículo.' }, { status: 500 });
  }
}

export async function createVehicle(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      name, brand, model, version, color, year_fab, year_model,
      plate, renavam, chassi, crlv_number, owner_name, owner_doc,
      uf, city, license_date, license_year, fuel_type_default,
      tank_capacity, photo_url, notes, status, status_reason,
      status_date, status_workshop, status_return_forecast,
      odometer_working
    } = body;

    if (!name || !brand || !model || !plate) {
      return Response.json({ error: 'Nome, marca, modelo e placa são obrigatórios.' }, { status: 400 });
    }

    const cleanPlate = plate.toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    const existing = await get(env.DB, 'SELECT id FROM vehicles WHERE plate = ?', [cleanPlate]);
    if (existing) {
      return Response.json({ error: `Já existe um veículo cadastrado com a placa ${cleanPlate}.` }, { status: 400 });
    }

    const initialStatus = status || 'working';
    const isOdometerWorking = odometer_working === false || odometer_working === 0 || odometer_working === '0' || odometer_working === 'false' ? 0 : 1;

    const result = await run(
      env.DB,
      `INSERT INTO vehicles (
        name, brand, model, version, color, year_fab, year_model,
        plate, renavam, chassi, crlv_number, owner_name, owner_doc,
        uf, city, license_date, license_year, fuel_type_default,
        tank_capacity, photo_url, notes, status, status_date,
        status_reason, status_workshop, status_return_forecast, status_notes,
        odometer_working
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(), brand.trim(), model.trim(), version || null, color || null,
        year_fab ? parseInt(year_fab) : null, year_model ? parseInt(year_model) : null,
        cleanPlate, renavam || null, chassi || null, crlv_number || null,
        owner_name || null, owner_doc || null, uf || null, city || null,
        license_date || null, license_year ? parseInt(license_year) : null,
        fuel_type_default || 'Diesel S10',
        tank_capacity ? parseFloat(tank_capacity) : 0,
        photo_url || null, notes || null,
        initialStatus, status_date || new Date().toISOString().split('T')[0],
        status_reason || null, status_workshop || null, status_return_forecast || null, null,
        isOdometerWorking
      ]
    );

    const newVehicle = await get(env.DB, 'SELECT * FROM vehicles WHERE id = ?', [result.lastInsertRowid]);
    await logAudit(env.DB, {
      entityType: 'vehicles',
      entityId: result.lastInsertRowid,
      action: 'CREATE',
      userName: user?.name || 'Admin',
      newData: newVehicle
    });

    return Response.json({ vehicle: newVehicle, message: 'Veículo cadastrado com sucesso.' }, { status: 201 });
  } catch (err) {
    console.error('Erro ao criar veículo:', err);
    return Response.json({ error: 'Erro ao cadastrar veículo.' }, { status: 500 });
  }
}

export async function updateVehicle(request, env, user, id) {
  try {
    const existing = await get(env.DB, 'SELECT * FROM vehicles WHERE id = ?', [id]);
    if (!existing) {
      return Response.json({ error: 'Veículo não encontrado.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      name, brand, model, version, color, year_fab, year_model,
      plate, renavam, chassi, crlv_number, owner_name, owner_doc,
      uf, city, license_date, license_year, fuel_type_default,
      tank_capacity, photo_url, notes, odometer_working
    } = body;

    const cleanPlate = plate ? plate.toUpperCase().trim().replace(/[^A-Z0-9]/g, '') : existing.plate;
    if (cleanPlate !== existing.plate) {
      const plateCheck = await get(env.DB, 'SELECT id FROM vehicles WHERE plate = ? AND id != ?', [cleanPlate, id]);
      if (plateCheck) {
        return Response.json({ error: `A placa ${cleanPlate} já está sendo utilizada por outro veículo.` }, { status: 400 });
      }
    }

    const isOdometerWorking = odometer_working !== undefined 
      ? (odometer_working === false || odometer_working === 0 || odometer_working === '0' || odometer_working === 'false' ? 0 : 1)
      : existing.odometer_working;

    await run(
      env.DB,
      `UPDATE vehicles SET
        name = ?, brand = ?, model = ?, version = ?, color = ?,
        year_fab = ?, year_model = ?, plate = ?, renavam = ?, chassi = ?,
        crlv_number = ?, owner_name = ?, owner_doc = ?, uf = ?, city = ?,
        license_date = ?, license_year = ?, fuel_type_default = ?,
        tank_capacity = ?, photo_url = ?, notes = ?, odometer_working = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name || existing.name,
        brand || existing.brand,
        model || existing.model,
        version !== undefined ? version : existing.version,
        color !== undefined ? color : existing.color,
        year_fab ? parseInt(year_fab) : existing.year_fab,
        year_model ? parseInt(year_model) : existing.year_model,
        cleanPlate,
        renavam !== undefined ? renavam : existing.renavam,
        chassi !== undefined ? chassi : existing.chassi,
        crlv_number !== undefined ? crlv_number : existing.crlv_number,
        owner_name !== undefined ? owner_name : existing.owner_name,
        owner_doc !== undefined ? owner_doc : existing.owner_doc,
        uf !== undefined ? uf : existing.uf,
        city !== undefined ? city : existing.city,
        license_date !== undefined ? license_date : existing.license_date,
        license_year ? parseInt(license_year) : existing.license_year,
        fuel_type_default || existing.fuel_type_default,
        tank_capacity !== undefined ? parseFloat(tank_capacity) : existing.tank_capacity,
        photo_url !== undefined ? photo_url : existing.photo_url,
        notes !== undefined ? notes : existing.notes,
        isOdometerWorking,
        id
      ]
    );

    const updated = await get(env.DB, 'SELECT * FROM vehicles WHERE id = ?', [id]);
    await logAudit(env.DB, {
      entityType: 'vehicles',
      entityId: id,
      action: 'UPDATE',
      userName: user?.name || 'Admin',
      oldData: existing,
      newData: updated
    });

    return Response.json({ vehicle: updated, message: 'Dados do veículo atualizados com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar veículo:', err);
    return Response.json({ error: 'Erro ao atualizar veículo.' }, { status: 500 });
  }
}

export async function updateVehicleStatus(request, env, user, id) {
  try {
    const body = await request.json().catch(() => ({}));
    const { status, status_reason, status_date, status_workshop, status_return_forecast, status_notes, justification } = body;

    const validStatuses = ['working', 'stopped', 'maintenance', 'inactive'];
    if (!validStatuses.includes(status)) {
      return Response.json({ error: 'Situação inválida. Escolha: working, stopped, maintenance ou inactive.' }, { status: 400 });
    }

    const existing = await get(env.DB, 'SELECT * FROM vehicles WHERE id = ?', [id]);
    if (!existing) {
      return Response.json({ error: 'Veículo não encontrado.' }, { status: 404 });
    }

    await run(
      env.DB,
      `UPDATE vehicles SET
        status = ?,
        status_date = ?,
        status_reason = ?,
        status_workshop = ?,
        status_return_forecast = ?,
        status_notes = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        status,
        status_date || new Date().toISOString().split('T')[0],
        status_reason || null,
        status_workshop || null,
        status_return_forecast || null,
        status_notes || null,
        id
      ]
    );

    const updated = await get(env.DB, 'SELECT * FROM vehicles WHERE id = ?', [id]);
    await logAudit(env.DB, {
      entityType: 'vehicles',
      entityId: id,
      action: 'STATUS_CHANGE',
      userName: user?.name || 'Admin',
      oldData: { status: existing.status, reason: existing.status_reason },
      newData: { status, status_reason, status_workshop, status_return_forecast },
      justification: justification || `Alteração de status de ${existing.status} para ${status}`
    });

    return Response.json({ vehicle: updated, message: 'Situação do veículo atualizada com sucesso.' });
  } catch (err) {
    console.error('Erro ao alterar status:', err);
    return Response.json({ error: 'Erro ao alterar situação do veículo.' }, { status: 500 });
  }
}

export async function deleteVehicle(request, env, user, id) {
  try {
    const existing = await get(env.DB, 'SELECT * FROM vehicles WHERE id = ?', [id]);
    if (!existing) {
      return Response.json({ error: 'Veículo não encontrado.' }, { status: 404 });
    }

    // 1. Get any active sessions affected by this vehicle's records
    const affectedSessions = await query(
      env.DB,
      'SELECT DISTINCT session_id FROM fuel_records WHERE vehicle_id = ? AND session_id IS NOT NULL',
      [id]
    );

    // 2. Cascade delete all linked rows explicitly
    await run(env.DB, 'DELETE FROM fuel_records WHERE vehicle_id = ?', [id]);
    await run(env.DB, 'DELETE FROM vehicle_expenses WHERE vehicle_id = ?', [id]);
    await run(env.DB, 'DELETE FROM maintenance_records WHERE vehicle_id = ?', [id]);
    await run(env.DB, 'DELETE FROM maintenance_reminders WHERE vehicle_id = ?', [id]);
    await run(env.DB, 'DELETE FROM vehicle_documents WHERE vehicle_id = ?', [id]);
    await run(env.DB, 'DELETE FROM vehicles WHERE id = ?', [id]);

    // 3. Recalculate aggregates for affected sessions
    for (const sess of affectedSessions) {
      if (sess.session_id) {
        const stats = await get(
          env.DB,
          'SELECT COUNT(id) as count, COALESCE(SUM(liters), 0) as liters, COALESCE(SUM(total_cost), 0) as cost FROM fuel_records WHERE session_id = ?',
          [sess.session_id]
        );
        await run(
          env.DB,
          'UPDATE fueling_sessions SET total_vehicles = ?, total_liters = ?, total_cost = ? WHERE id = ?',
          [stats?.count || 0, stats?.liters || 0, stats?.cost || 0, sess.session_id]
        );
      }
    }

    await logAudit(env.DB, {
      entityType: 'vehicles',
      entityId: id,
      action: 'DELETE',
      userName: user?.name || 'Admin',
      oldData: existing
    });

    return Response.json({ message: 'Veículo e registros associados excluídos com sucesso.' });
  } catch (err) {
    console.error('Erro ao excluir veículo:', err);
    return Response.json({ error: 'Erro ao excluir veículo.' }, { status: 500 });
  }
}

export async function getLastOdometer(request, env, user, id) {
  try {
    const lastFuel = await get(
      env.DB,
      'SELECT km_current, created_at, fuel_type, consumption_kml FROM fuel_records WHERE vehicle_id = ? AND odometer_working = 1 AND km_current IS NOT NULL ORDER BY id DESC LIMIT 1',
      [id]
    );
    return Response.json({
      last_km: lastFuel?.km_current || null,
      last_date: lastFuel?.created_at || null,
      last_fuel_type: lastFuel?.fuel_type || null
    });
  } catch (err) {
    return Response.json({ error: 'Erro ao buscar odômetro anterior.' }, { status: 500 });
  }
}
