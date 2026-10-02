function normalizeRole(role) {
  const r = String(role || '').toLowerCase().trim();
  if (r === 'admin' || r === 'gerente') return 'gerente';
  if (r === 'encarregado' || r === 'supervisor') return 'encarregado';
  return 'funcionario';
}

function isGerente(user) {
  return normalizeRole(user?.role) === 'gerente';
}

async function countActiveGerentes(env) {
  try {
    const row = await get(
      env.DB,
      "SELECT COUNT(*) as total FROM users WHERE (LOWER(role) = 'admin' OR LOWER(role) = 'gerente') AND active = 1"
    );
    return row?.total || 0;
  } catch (err) {
    return 1;
  }
}

async function recordAuditLog(env, userId, action, details) {
  try {
    await run(
      env.DB,
      'INSERT INTO audit_logs (user_id, action, details, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [userId || null, action, typeof details === 'object' ? JSON.stringify(details) : String(details)]
    );
  } catch (err) {
    // Fail silently if audit_logs table is missing or optional
  }
}

export async function listUsers(request, env, user) {
  if (!isGerente(user)) {
    return Response.json({ error: 'Acesso negado. Apenas o Gerente possui permissão para gerenciar usuários.' }, { status: 403 });
  }

  try {
    const users = await query(env.DB, 'SELECT id, name, email, role, active, created_at FROM users ORDER BY name ASC');
    return Response.json({ users });
  } catch (err) {
    return Response.json({ error: 'Erro ao listar usuários.' }, { status: 500 });
  }
}

export async function createUser(request, env, user) {
  if (!isGerente(user)) {
    return Response.json({ error: 'Acesso negado. Apenas o Gerente possui permissão para criar usuários.' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { name, email, password, role } = body;
    if (!name || !email || !password) {
      return Response.json({ error: 'Nome, e-mail e senha são obrigatórios.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await get(env.DB, 'SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existing) {
      return Response.json({ error: 'Já existe um usuário cadastrado com este e-mail.' }, { status: 400 });
    }

    const assignedRole = normalizeRole(role);
    const hash = hashPassword(password.trim());

    const result = await run(
      env.DB,
      'INSERT INTO users (name, email, password_hash, role, active) VALUES (?, ?, ?, ?, 1)',
      [name.trim(), cleanEmail, hash, assignedRole]
    );

    await recordAuditLog(env, user?.id, 'CREATE_USER', {
      target_user_id: result.lastInsertRowid,
      name: name.trim(),
      email: cleanEmail,
      role: assignedRole
    });

    const newUser = await get(env.DB, 'SELECT id, name, email, role, active, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
    return Response.json({ user: newUser, message: 'Usuário cadastrado com sucesso.' }, { status: 201 });
  } catch (err) {
    return Response.json({ error: 'Erro ao criar usuário.' }, { status: 500 });
  }
}

export async function updateUser(request, env, user, id) {
  if (!isGerente(user)) {
    return Response.json({ error: 'Acesso negado. Apenas o Gerente possui permissão para editar usuários.' }, { status: 403 });
  }

  try {
    const existing = await get(env.DB, 'SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) {
      return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, email, password, role, active } = body;

    const isTargetGerente = isGerente(existing);

    let targetRole = existing.role;
    if (role !== undefined) {
      targetRole = normalizeRole(role);
    }


    let targetActive = existing.active;
    if (active !== undefined) {
      targetActive = active ? 1 : 0;
    }

    if (isTargetGerente && (targetRole === 'funcionario' || targetActive === 0)) {
      const activeGerentes = await countActiveGerentes(env);
      if (activeGerentes <= 1) {
        return Response.json({
          error: 'Não é possível desativar ou rebaixar o único Gerente ativo do sistema.'
        }, { status: 400 });
      }
    }

    let hash = existing.password_hash;
    if (password && password.trim()) {
      hash = hashPassword(password.trim());
    }

    const cleanEmail = email ? email.trim().toLowerCase() : existing.email;

    await run(
      env.DB,
      `UPDATE users SET
        name = ?, email = ?, password_hash = ?, role = ?, active = ?
       WHERE id = ?`,
      [
        name ? name.trim() : existing.name,
        cleanEmail,
        hash,
        targetRole,
        targetActive,
        id
      ]
    );

    await recordAuditLog(env, user?.id, 'UPDATE_USER', {
      target_user_id: id,
      name: name || existing.name,
      email: cleanEmail,
      role: targetRole,
      active: targetActive
    });

    const updated = await get(env.DB, 'SELECT id, name, email, role, active, created_at FROM users WHERE id = ?', [id]);
    return Response.json({ user: updated, message: 'Usuário atualizado com sucesso.' });
  } catch (err) {
    return Response.json({ error: 'Erro ao atualizar usuário.' }, { status: 500 });
  }
}

export async function updateUserStatus(request, env, user, id) {
  if (!isGerente(user)) {
    return Response.json({ error: 'Acesso negado. Apenas o Gerente possui permissão para alterar o status de usuários.' }, { status: 403 });
  }

  try {
    const existing = await get(env.DB, 'SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) {
      return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const newActive = body.active ? 1 : 0;

    const currentRole = String(existing.role || '').toLowerCase();
    const isTargetGerente = currentRole === 'admin' || currentRole === 'gerente';

    if (isTargetGerente && newActive === 0) {
      const activeGerentes = await countActiveGerentes(env);
      if (activeGerentes <= 1) {
        return Response.json({
          error: 'Operação bloqueada: o sistema precisa manter pelo menos um Gerente ativo.'
        }, { status: 400 });
      }
    }

    await run(env.DB, 'UPDATE users SET active = ? WHERE id = ?', [newActive, id]);

    await recordAuditLog(env, user?.id, 'CHANGE_USER_STATUS', {
      target_user_id: id,
      active: newActive
    });

    const updated = await get(env.DB, 'SELECT id, name, email, role, active, created_at FROM users WHERE id = ?', [id]);
    return Response.json({
      user: updated,
      message: `Usuário ${newActive ? 'ativado' : 'desativado'} com sucesso.`
    });
  } catch (err) {
    return Response.json({ error: 'Erro ao alterar status do usuário.' }, { status: 500 });
  }
}

export async function resetUserPassword(request, env, user, id) {
  if (!isGerente(user)) {
    return Response.json({ error: 'Acesso negado. Apenas o Gerente possui permissão para redefinir senhas.' }, { status: 403 });
  }

  try {
    const existing = await get(env.DB, 'SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) {
      return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { new_password } = body;
    if (!new_password || new_password.trim().length < 4) {
      return Response.json({ error: 'A nova senha deve possuir pelo menos 4 caracteres.' }, { status: 400 });
    }

    const hash = hashPassword(new_password.trim());
    await run(env.DB, 'UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);

    await recordAuditLog(env, user?.id, 'RESET_USER_PASSWORD', {
      target_user_id: id,
      target_email: existing.email
    });

    return Response.json({ message: 'Senha redefinida com sucesso pelo Gerente.' });
  } catch (err) {
    return Response.json({ error: 'Erro ao redefinir senha do usuário.' }, { status: 500 });
  }
}

export async function deleteUser(request, env, user, id) {
  if (!isGerente(user)) {
    return Response.json({ error: 'Acesso negado. Apenas o Gerente possui permissão para excluir usuários.' }, { status: 403 });
  }

  try {
    const existing = await get(env.DB, 'SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) {
      return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    if (String(user?.id) === String(id)) {
      return Response.json({ error: 'Você não pode excluir seu próprio usuário enquanto estiver conectado.' }, { status: 400 });
    }

    const currentRole = String(existing.role || '').toLowerCase();
    const isTargetGerente = currentRole === 'admin' || currentRole === 'gerente';

    if (isTargetGerente) {
      const activeGerentes = await countActiveGerentes(env);
      if (activeGerentes <= 1) {
        return Response.json({
          error: 'Operação bloqueada: não é possível excluir o único Gerente ativo do sistema.'
        }, { status: 400 });
      }
    }

    await run(env.DB, 'DELETE FROM users WHERE id = ?', [id]);

    await recordAuditLog(env, user?.id, 'DELETE_USER', {
      target_user_id: id,
      name: existing.name,
      email: existing.email
    });

    return Response.json({ message: 'Usuário excluído com sucesso.' });
  } catch (err) {
    return Response.json({ error: 'Erro ao excluir usuário.' }, { status: 500 });
  }
}

