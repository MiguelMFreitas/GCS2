// Vehicle Documents Controller for Cloudflare Workers & D1
import { query, get, run } from '../utils/db.js';

export async function listDocuments(request, env) {
  try {
    const url = new URL(request.url);
    const vehicle_id = url.searchParams.get('vehicle_id');

    let sql = `
      SELECT vd.*, v.name as vehicle_name, v.plate as vehicle_plate 
      FROM vehicle_documents vd
      JOIN vehicles v ON vd.vehicle_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (vehicle_id) {
      sql += ' AND vd.vehicle_id = ?';
      params.push(vehicle_id);
    }

    sql += ' ORDER BY vd.expiration_date ASC';
    const documents = await query(env.DB, sql, params);

    const today = new Date();
    const enriched = documents.map(d => {
      let isExpired = false;
      let isExpiringSoon = false; // within 30 days
      if (d.expiration_date) {
        const expDate = new Date(d.expiration_date);
        const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) isExpired = true;
        else if (diffDays <= 30) isExpiringSoon = true;
      }
      return {
        ...d,
        is_expired: isExpired,
        is_expiring_soon: isExpiringSoon
      };
    });

    return Response.json({ documents: enriched });
  } catch (err) {
    return Response.json({ error: 'Erro ao listar documentos.' }, { status: 500 });
  }
}

export async function createDocument(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const { vehicle_id, name, doc_type, issue_date, expiration_date, file_url, notes } = body;
    if (!vehicle_id || !name || !doc_type || !file_url) {
      return Response.json({ error: 'Veículo, nome do documento, tipo e arquivo são obrigatórios.' }, { status: 400 });
    }

    const result = await run(
      env.DB,
      `INSERT INTO vehicle_documents (vehicle_id, name, doc_type, issue_date, expiration_date, file_url, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicle_id,
        name.trim(),
        doc_type,
        issue_date || null,
        expiration_date || null,
        file_url,
        notes || null
      ]
    );

    const newDoc = await get(env.DB, 'SELECT * FROM vehicle_documents WHERE id = ?', [result.lastInsertRowid]);
    return Response.json({ document: newDoc, message: 'Documento anexado com sucesso.' }, { status: 201 });
  } catch (err) {
    return Response.json({ error: 'Erro ao cadastrar documento.' }, { status: 500 });
  }
}

export async function deleteDocument(request, env, user, id) {
  try {
    const existing = await get(env.DB, 'SELECT * FROM vehicle_documents WHERE id = ?', [id]);
    if (!existing) {
      return Response.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }
    await run(env.DB, 'DELETE FROM vehicle_documents WHERE id = ?', [id]);
    return Response.json({ message: 'Documento excluído com sucesso.' });
  } catch (err) {
    return Response.json({ error: 'Erro ao excluir documento.' }, { status: 500 });
  }
}
