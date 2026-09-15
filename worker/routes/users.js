// Users Management Controller for Cloudflare Workers & D1
import { query, get, run } from '../utils/db.js';
import { hashPassword } from '../utils/auth.js';

export async function listUsers(request, env) {
  try {
    const users = await query(env.DB, 'SELECT id, name, email, role, active, created_at FROM users ORDER BY name ASC');
    return Response.json({ users });
  } catch (err) {
    return Response.json({ error: 'Erro ao listar usuários.' }, { status: 500 });
  }
}

export async function createUser(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, password, role } = body;
    if (!name || !email || !password) {
      return Response.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const existing = await get(env.DB, 'SELECT id FROM users WHERE email = ?', [email.trim()]);
    if (existing) {
      return Response.json({ error: 'Já existe um usuário cadastrado com este e-mail.' }, { status: 400 });
    }

    const hash = hashPassword(password);

    const result = await run(
      env.DB,
      'INSERT INTO users (name, email, password_hash, role, active) VALUES (?, ?, ?, ?, 1)',
      [name.trim(), email.trim(), hash, role || 'operator']
    );

    const newUser = await get(env.DB, 'SELECT id, name, email, role, active, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
    return Response.json({ user: newUser, message: 'Usuário criado com sucesso.' }, { status: 201 });
  } catch (err) {
    return Response.json({ error: 'Erro ao criar usuário.' }, { status: 500 });
  }
}

export async function updateUser(request, env, user, id) {
  try {
    const existing = await get(env.DB, 'SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) {
      return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, email, password, role, active } = body;

    let hash = existing.password_hash;
    if (password && password.trim()) {
      hash = hashPassword(password.trim());
    }

    await run(
      env.DB,
      `UPDATE users SET
        name = ?, email = ?, password_hash = ?, role = ?, active = ?
       WHERE id = ?`,
      [
        name || existing.name,
        email || existing.email,
        hash,
        role || existing.role,
        active !== undefined ? (active ? 1 : 0) : existing.active,
        id
      ]
    );

    const updated = await get(env.DB, 'SELECT id, name, email, role, active, created_at FROM users WHERE id = ?', [id]);
    return Response.json({ user: updated, message: 'Usuário atualizado com sucesso.' });
  } catch (err) {
    return Response.json({ error: 'Erro ao atualizar usuário.' }, { status: 500 });
  }
}
