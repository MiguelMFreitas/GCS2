// Audit Logging Utility for Cloudflare Workers & D1
import { run } from './db.js';

export async function logAudit(db, { entityType, entityId, action, userName, oldData, newData, justification }) {
  try {
    await run(
      db,
      `INSERT INTO audit_logs (entity_type, entity_id, action, user_name, old_data, new_data, justification)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        entityType,
        entityId || null,
        action,
        userName || 'Sistema',
        typeof oldData === 'object' ? JSON.stringify(oldData) : (oldData || null),
        typeof newData === 'object' ? JSON.stringify(newData) : (newData || null),
        justification || null
      ]
    );
  } catch (err) {
    console.error('Falha ao registrar auditoria no D1:', err);
  }
}
