// Maintenance Controller for Cloudflare Workers & D1
import { query, get, run } from '../utils/db.js';
import { logAudit } from '../utils/audit.js';

export async function listMaintenance(request, env) {
  try {
    const url = new URL(request.url);
    const vehicle_id = url.searchParams.get('vehicle_id');
    const type = url.searchParams.get('type');

    let sql = `
      SELECT mr.*, v.name as vehicle_name, v.plate as vehicle_plate 
      FROM maintenance_records mr
      JOIN vehicles v ON mr.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (vehicle_id) {
      sql += ' AND mr.vehicle_id = ?';
      params.push(vehicle_id);
    }
    if (type) {
      sql += ' AND mr.type = ?';
      params.push(type);
    }

    sql += ' ORDER BY mr.entry_date DESC, mr.id DESC';
    const records = await query(env.DB, sql, params);
    return Response.json({ records });
  } catch (err) {
    return Response.json({ error: 'Erro ao listar registros de manutenção.' }, { status: 500 });
  }
}

export async function createMaintenance(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      vehicle_id, type, problem, service, workshop, entry_date,
      exit_date, km, cost, parts, notes, receipt_url, update_vehicle_status
    } = body;

    if (!vehicle_id || !type || !problem || !entry_date) {
      return Response.json({ error: 'Veículo, tipo, problema e data de entrada são obrigatórios.' }, { status: 400 });
    }

    const result = await run(
      env.DB,
      `INSERT INTO maintenance_records (
        vehicle_id, type, problem, service, workshop, entry_date,
        exit_date, km, cost, parts, notes, receipt_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicle_id,
        type,
        problem.trim(),
        service || null,
        workshop || null,
        entry_date,
        exit_date || null,
        km ? parseFloat(km) : null,
        cost ? parseFloat(cost) : 0,
        parts || null,
        notes || null,
        receipt_url || null
      ]
    );

    // If indicated, auto-update vehicle status to 'maintenance'
    if (update_vehicle_status) {
      await run(
        env.DB,
        `UPDATE vehicles SET
          status = 'maintenance',
          status_date = ?,
          status_reason = ?,
          status_workshop = ?,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [entry_date, problem.trim(), workshop || null, vehicle_id]
      );
    }

    const newRecord = await get(env.DB, 'SELECT * FROM maintenance_records WHERE id = ?', [result.lastInsertRowid]);
    await logAudit(env.DB, {
      entityType: 'maintenance_records',
      entityId: result.lastInsertRowid,
      action: 'CREATE_MAINTENANCE',
      userName: user?.name || 'Admin',
      newData: newRecord
    });

    return Response.json({ record: newRecord, message: 'Registro de manutenção criado com sucesso.' }, { status: 201 });
  } catch (err) {
    return Response.json({ error: 'Erro ao registrar manutenção.' }, { status: 500 });
  }
}

export async function updateMaintenance(request, env, user, id) {
  try {
    const existing = await get(env.DB, 'SELECT * FROM maintenance_records WHERE id = ?', [id]);
    if (!existing) {
      return Response.json({ error: 'Registro de manutenção não encontrado.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      type, problem, service, workshop, entry_date, exit_date,
      km, cost, parts, notes, receipt_url, mark_vehicle_working
    } = body;

    await run(
      env.DB,
      `UPDATE maintenance_records SET
        type = ?, problem = ?, service = ?, workshop = ?,
        entry_date = ?, exit_date = ?, km = ?, cost = ?,
        parts = ?, notes = ?, receipt_url = ?
       WHERE id = ?`,
      [
        type || existing.type,
        problem || existing.problem,
        service !== undefined ? service : existing.service,
        workshop !== undefined ? workshop : existing.workshop,
        entry_date || existing.entry_date,
        exit_date !== undefined ? exit_date : existing.exit_date,
        km ? parseFloat(km) : existing.km,
        cost !== undefined ? parseFloat(cost) : existing.cost,
        parts !== undefined ? parts : existing.parts,
        notes !== undefined ? notes : existing.notes,
        receipt_url !== undefined ? receipt_url : existing.receipt_url,
        id
      ]
    );

    if (mark_vehicle_working) {
      await run(
        env.DB,
        `UPDATE vehicles SET
          status = 'working',
          status_date = ?,
          status_reason = null,
          status_workshop = null,
          status_return_forecast = null,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [exit_date || new Date().toISOString().split('T')[0], existing.vehicle_id]
      );
    }

    const updated = await get(env.DB, 'SELECT * FROM maintenance_records WHERE id = ?', [id]);
    return Response.json({ record: updated, message: 'Manutenção atualizada com sucesso.' });
  } catch (err) {
    return Response.json({ error: 'Erro ao atualizar manutenção.' }, { status: 500 });
  }
}
