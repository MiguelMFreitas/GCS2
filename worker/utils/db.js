// D1 Database Helper Wrapper for Cloudflare Workers

export async function query(db, sql, params = []) {
  if (!db) throw new Error('Cloudflare D1 binding (env.DB) is not configured.');
  const stmt = params && params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const result = await stmt.all();
  return result.results || [];
}

export async function get(db, sql, params = []) {
  if (!db) throw new Error('Cloudflare D1 binding (env.DB) is not configured.');
  const stmt = params && params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const result = await stmt.first();
  return result || null;
}

export async function run(db, sql, params = []) {
  if (!db) throw new Error('Cloudflare D1 binding (env.DB) is not configured.');
  const stmt = params && params.length > 0 ? db.prepare(sql).bind(...params) : db.prepare(sql);
  const result = await stmt.run();
  return {
    changes: result.meta?.changes ?? 0,
    lastInsertRowid: result.meta?.last_row_id ?? null,
    success: result.success
  };
}

export async function batch(db, statements) {
  if (!db) throw new Error('Cloudflare D1 binding (env.DB) is not configured.');
  return await db.batch(statements);
}
