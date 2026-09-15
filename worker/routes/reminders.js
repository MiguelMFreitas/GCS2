// Maintenance Reminders Controller for Cloudflare Workers & D1
import { query, get, run } from '../utils/db.js';

export async function listReminders(request, env) {
  try {
    const url = new URL(request.url);
    const vehicle_id = url.searchParams.get('vehicle_id');

    let sql = `
      SELECT mr.*, v.name as vehicle_name, v.plate as vehicle_plate,
             (SELECT MAX(km_current) FROM fuel_records WHERE vehicle_id = mr.vehicle_id) as vehicle_current_km
      FROM maintenance_reminders mr
      JOIN vehicles v ON mr.vehicle_id = v.id
      WHERE mr.status = 'pending'
    `;
    const params = [];

    if (vehicle_id) {
      sql += ' AND mr.vehicle_id = ?';
      params.push(vehicle_id);
    }

    sql += ' ORDER BY mr.trigger_date ASC, mr.trigger_km ASC';
    const reminders = await query(env.DB, sql, params);

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

    return Response.json({ reminders: enriched });
  } catch (err) {
    return Response.json({ error: 'Erro ao listar lembretes.' }, { status: 500 });
  }
}

export async function createReminder(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const { vehicle_id, title, category, trigger_km, trigger_date, notes } = body;
    if (!vehicle_id || !title || !category) {
      return Response.json({ error: 'Veículo, título e categoria são obrigatórios.' }, { status: 400 });
    }

    const result = await run(
      env.DB,
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

    const newReminder = await get(env.DB, 'SELECT * FROM maintenance_reminders WHERE id = ?', [result.lastInsertRowid]);
    return Response.json({ reminder: newReminder, message: 'Lembrete cadastrado com sucesso.' }, { status: 201 });
  } catch (err) {
    return Response.json({ error: 'Erro ao cadastrar lembrete.' }, { status: 500 });
  }
}

export async function updateReminderStatus(request, env, user, id) {
  try {
    const body = await request.json().catch(() => ({}));
    const { status } = body;
    await run(env.DB, 'UPDATE maintenance_reminders SET status = ? WHERE id = ?', [status || 'resolved', id]);
    return Response.json({ message: 'Status do lembrete atualizado com sucesso.' });
  } catch (err) {
    return Response.json({ error: 'Erro ao atualizar lembrete.' }, { status: 500 });
  }
}
