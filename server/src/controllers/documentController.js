import { query, get, run } from '../config/database.js';

export function listDocuments(req, res) {
  try {
    const { vehicle_id } = req.query;
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
    const documents = query(sql, params);

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

    return res.json({ documents: enriched });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar documentos.' });
  }
}

export function createDocument(req, res) {
  try {
    const { vehicle_id, name, doc_type, issue_date, expiration_date, file_url, notes } = req.body;
    if (!vehicle_id || !name || !doc_type || !file_url) {
      return res.status(400).json({ error: 'Veículo, nome do documento, tipo e arquivo são obrigatórios.' });
    }

    const result = run(
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

    const newDoc = get('SELECT * FROM vehicle_documents WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ document: newDoc, message: 'Documento anexado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao cadastrar documento.' });
  }
}

export function deleteDocument(req, res) {
  try {
    const { id } = req.params;
    const existing = get('SELECT * FROM vehicle_documents WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Documento não encontrado.' });
    }
    run('DELETE FROM vehicle_documents WHERE id = ?', [id]);
    return res.json({ message: 'Documento excluído com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao excluir documento.' });
  }
}
