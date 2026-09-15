import { query, get, run } from '../config/database.js';
import bcrypt from 'bcryptjs';

export function listUsers(req, res) {
  try {
    const users = query('SELECT id, name, email, role, active, created_at FROM users ORDER BY name ASC');
    return res.json({ users });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
}

export function createUser(req, res) {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    const existing = get('SELECT id FROM users WHERE email = ?', [email.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const result = run(
      'INSERT INTO users (name, email, password_hash, role, active) VALUES (?, ?, ?, ?, 1)',
      [name.trim(), email.trim(), hash, role || 'operator']
    );

    const newUser = get('SELECT id, name, email, role, active, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
    return res.status(201).json({ user: newUser, message: 'Usuário criado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
}

export function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, password, role, active } = req.body;

    const existing = get('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    let hash = existing.password_hash;
    if (password && password.trim()) {
      const salt = bcrypt.genSaltSync(10);
      hash = bcrypt.hashSync(password.trim(), salt);
    }

    run(
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

    const updated = get('SELECT id, name, email, role, active, created_at FROM users WHERE id = ?', [id]);
    return res.json({ user: updated, message: 'Usuário atualizado com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
}
