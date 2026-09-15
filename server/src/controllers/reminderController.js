import { query, get, run } from '../config/database.js';

export function listReminders(req, res) {
  try {
    const { vehicle_id, status } = req.query;
    let sql = `
      SELECT mr.*, v.name as vehicle_name, v.plate as vehicle_plate,
             (SELECT MAX(km_current) FROM fuel_records WHERE vehicle_id = mr.vehicle_id) as vehicle_current_km
      FROM maintenance_reminders mr
      JOIN vehicles v ON mr.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (vehicle_id) {
      sql += ' AND mr.vehicle_id = ?';
      params.push(vehicle_id);
    }
    if (status && status !== 'all') {
      sql += ' AND mr.status = ?';
      params.push(status);
    } else if (!status) {
      sql += " AND mr.status = 'pending'";
    }

    sql += ' ORDER BY mr.trigger_date ASC, mr.trigger_km ASC';
    const reminders = query(sql, params);

    // Compute status flags for each reminder (e.g. isOverdue, isNear)
    const today = new Date().toISOString().split('T')[0];
    const enriched = reminders.map(r => {
      let isDueByDate = false;
      let isDueByKm = false;

      if (r.trigger_date && r.trigger_date <= today) {
        isDueByDate = true;
      }
      if (r.trigger_km && r.vehicle_current_km && r.vehicle_current_km >= r.trigger_km) {
        isDueByKm = true;
      }

      return {
        ...r,
        is_overdue: isDueByDate || isDueByKm
      };
    });

    return res.json({ reminders: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar lembretes.' });
  }
}

export function createReminder(req, res) {
  try {
    const { vehicle_id, title, category, trigger_km, trigger_date, notes } = req.body;
    if (!vehicle_id || !title || !category) {
      return res.status(400).json({ error: 'Veículo, título e categoria são obrigatórios.' });
    }

    const result = run(
      `INSERT INTO maintenance_reminders (vehicle_id, title, category, trigger_km, trigger_date, status, notes)
       VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
      [
        vehicle_id,
        title.trim(),
        category,
        trigger_km ? parseFloat(trigger_km) : null,
        trigger_date || null,
        notes || null
      ]
    );

    const newReminder = get('SELECT * FROM maintenance_reminders WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ reminder: newReminder, message: 'Lembrete cadastrado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao cadastrar lembrete.' });
  }
}

export function updateReminderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'resolved' or 'ignored' or 'pending'
    run('UPDATE maintenance_reminders SET status = ? WHERE id = ?', [status || 'resolved', id]);
    return res.json({ message: 'Status do lembrete atualizado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar lembrete.' });
  }
}

export function deleteReminder(req, res) {
  try {
    const { id } = req.params;
    const existing = get('SELECT * FROM maintenance_reminders WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Lembrete não encontrado.' });
    }
    run('DELETE FROM maintenance_reminders WHERE id = ?', [id]);
    return res.json({ message: 'Lembrete excluído com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao excluir lembrete.' });
  }
}
