import { query, get, run } from '../config/database.js';
import { logAudit } from '../middlewares/audit.js';

export function listExpenses(req, res) {
  try {
    const { vehicle_id, category, start_date, end_date } = req.query;
    let sql = `
      SELECT ve.*, v.name as vehicle_name, v.plate as vehicle_plate 
      FROM vehicle_expenses ve
      JOIN vehicles v ON ve.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (vehicle_id) {
      sql += ' AND ve.vehicle_id = ?';
      params.push(vehicle_id);
    }
    if (category) {
      sql += ' AND ve.category = ?';
      params.push(category);
    }
    if (start_date) {
      sql += ' AND ve.date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND ve.date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY ve.date DESC, ve.id DESC';
    const expenses = query(sql, params);
    return res.json({ expenses });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar despesas.' });
  }
}

export function createExpense(req, res) {
  try {
    const { vehicle_id, category, description, date, cost, km, receipt_url, notes } = req.body;
    if (!vehicle_id || !category || !description || !cost) {
      return res.status(400).json({ error: 'Veículo, categoria, descrição e valor são obrigatórios.' });
    }

    const result = run(
      `INSERT INTO vehicle_expenses (vehicle_id, category, description, date, cost, km, receipt_url, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicle_id,
        category,
        description.trim(),
        date || new Date().toISOString().split('T')[0],
        parseFloat(cost),
        km ? parseFloat(km) : null,
        receipt_url || null,
        notes || null
      ]
    );

    const newExpense = get('SELECT * FROM vehicle_expenses WHERE id = ?', [result.lastInsertRowid]);
    logAudit({
      entityType: 'vehicle_expenses',
      entityId: result.lastInsertRowid,
      action: 'CREATE_EXPENSE',
      userName: req.user?.name || 'Admin',
      newData: newExpense
    });

    return res.status(201).json({ expense: newExpense, message: 'Despesa registrada com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao registrar despesa.' });
  }
}

export function deleteExpense(req, res) {
  try {
    const { id } = req.params;
    const existing = get('SELECT * FROM vehicle_expenses WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }
    run('DELETE FROM vehicle_expenses WHERE id = ?', [id]);
    return res.json({ message: 'Despesa removida com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao remover despesa.' });
  }
}
