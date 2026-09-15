import { run } from '../config/database.js';

export function logAudit({ entityType, entityId, action, userName, oldData, newData, justification }) {
  try {
    run(
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
    console.error('Falha ao registrar auditoria:', err);
  }
}
