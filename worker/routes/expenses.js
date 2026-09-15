// Expenses Controller for Cloudflare Workers & D1
import { query, get, run } from '../utils/db.js';
import { logAudit } from '../utils/audit.js';

export async function listExpenses(request, env) {
  try {
    const url = new URL(request.url);
    const vehicle_id = url.searchParams.get('vehicle_id');
    const category = url.searchParams.get('category');
    const start_date = url.searchParams.get('start_date');
    const end_date = url.searchParams.get('end_date');

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
    const expenses = await query(env.DB, sql, params);
    return Response.json({ expenses });
  } catch (err) {
    return Response.json({ error: 'Erro ao listar despesas.' }, { status: 500 });
  }
}

export async function createExpense(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const { vehicle_id, category, description, date, cost, km, receipt_url, notes } = body;
    if (!vehicle_id || !category || !description || !cost) {
      return Response.json({ error: 'Veículo, categoria, descrição e valor são obrigatórios.' }, { status: 400 });
    }

    const result = await run(
      env.DB,
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

    const newExpense = await get(env.DB, 'SELECT * FROM vehicle_expenses WHERE id = ?', [result.lastInsertRowid]);
    await logAudit(env.DB, {
      entityType: 'vehicle_expenses',
      entityId: result.lastInsertRowid,
      action: 'CREATE_EXPENSE',
      userName: user?.name || 'Admin',
      newData: newExpense
    });

    return Response.json({ expense: newExpense, message: 'Despesa registrada com sucesso.' }, { status: 201 });
  } catch (err) {
    return Response.json({ error: 'Erro ao registrar despesa.' }, { status: 500 });
  }
}

export async function deleteExpense(request, env, user, id) {
  try {
    const existing = await get(env.DB, 'SELECT * FROM vehicle_expenses WHERE id = ?', [id]);
    if (!existing) {
      return Response.json({ error: 'Despesa não encontrada.' }, { status: 404 });
    }
    await run(env.DB, 'DELETE FROM vehicle_expenses WHERE id = ?', [id]);
    return Response.json({ message: 'Despesa removida com sucesso.' });
  } catch (err) {
    return Response.json({ error: 'Erro ao remover despesa.' }, { status: 500 });
  }
}
