import { query, get, run } from '../config/database.js';
import { logAudit } from '../middlewares/audit.js';

export function listMaintenance(req, res) {
  try {
    const { vehicle_id, type } = req.query;
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
    const records = query(sql, params);
    return res.json({ records });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar registros de manutenção.' });
  }
}

export function createMaintenance(req, res) {
  try {
    const {
      vehicle_id, type, problem, service, workshop, entry_date,
      exit_date, km, cost, parts, notes, receipt_url, update_vehicle_status
    } = req.body;

    if (!vehicle_id || !type || !problem || !entry_date) {
      return res.status(400).json({ error: 'Veículo, tipo, problema e data de entrada são obrigatórios.' });
    }

    const result = run(
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
      run(
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

    const newRecord = get('SELECT * FROM maintenance_records WHERE id = ?', [result.lastInsertRowid]);
    logAudit({
      entityType: 'maintenance_records',
      entityId: result.lastInsertRowid,
      action: 'CREATE_MAINTENANCE',
      userName: req.user?.name || 'Admin',
      newData: newRecord
    });

    return res.status(201).json({ record: newRecord, message: 'Registro de manutenção criado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao registrar manutenção.' });
  }
}

export function updateMaintenance(req, res) {
  try {
    const { id } = req.params;
    const {
      type, problem, service, workshop, entry_date, exit_date,
      km, cost, parts, notes, receipt_url, mark_vehicle_working
    } = req.body;

    const existing = get('SELECT * FROM maintenance_records WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Registro de manutenção não encontrado.' });
    }

    run(
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
      run(
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

    const updated = get('SELECT * FROM maintenance_records WHERE id = ?', [id]);
    return res.json({ record: updated, message: 'Manutenção atualizada com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar manutenção.' });
  }
}
