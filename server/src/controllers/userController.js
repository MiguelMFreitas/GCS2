import { query, get, run } from '../config/database.js';
import bcrypt from 'bcryptjs';

// Helper for auditing user actions
function logAudit(entityId, action, userName, oldData = null, newData = null, justification = '') {
  try {
    run(
      `INSERT INTO audit_logs (entity_type, entity_id, action, user_name, old_data, new_data, justification)
       VALUES ('user', ?, ?, ?, ?, ?, ?)`,
      [
        entityId,
        action,
        userName || 'Gerente',
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        justification
      ]
    );
  } catch (err) {
    console.error('Erro ao registrar log de auditoria:', err);
  }
}

// Helper to count active Gerentes/Admins
function countActiveGerentes() {
  const result = get("SELECT count(*) as count FROM users WHERE (role = 'admin' OR role = 'gerente') AND active = 1");
  return result?.count || 0;
}

export function listUsers(req, res) {
  try {
    const users = query(
      'SELECT id, username, name, email, role, active, created_at, last_login_at FROM users ORDER BY name ASC'
    );
    return res.json({ users });
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    return res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
}

export function createUser(req, res) {
  try {
    const { name, username, email, password, role, active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'O nome do usuário é obrigatório.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'O e-mail do usuário é obrigatório.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'A senha é obrigatória e deve conter no mínimo 6 caracteres.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = (username && username.trim()) ? username.trim().toLowerCase() : cleanEmail.split('@')[0];
    
    let cleanRole = 'funcionario';
    const roleLower = String(role || '').toLowerCase().trim();
    if (roleLower === 'admin' || roleLower === 'gerente') cleanRole = 'gerente';
    else if (roleLower === 'encarregado' || roleLower === 'supervisor') cleanRole = 'encarregado';

    const cleanActive = active === undefined || active === 1 || active === true ? 1 : 0;


    const existingEmail = get('SELECT id FROM users WHERE LOWER(email) = ?', [cleanEmail]);
    if (existingEmail) {
      return res.status(400).json({ error: 'Já existe um usuário cadastrado com este e-mail.' });
    }

    const existingUsername = get('SELECT id FROM users WHERE LOWER(username) = ?', [cleanUsername]);
    if (existingUsername) {
      return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    const result = run(
      'INSERT INTO users (username, name, email, password_hash, role, active) VALUES (?, ?, ?, ?, ?, ?)',
      [cleanUsername, name.trim(), cleanEmail, hash, cleanRole, cleanActive]
    );

    const newUserId = result.lastInsertRowid;
    const newUser = get(
      'SELECT id, username, name, email, role, active, created_at, last_login_at FROM users WHERE id = ?',
      [newUserId]
    );

    logAudit(
      newUserId,
      'create',
      req.user?.name || req.user?.username,
      null,
      { username: cleanUsername, name: name.trim(), email: cleanEmail, role: cleanRole, active: cleanActive },
      'Criação de novo usuário no sistema'
    );

    return res.status(201).json({
      success: true,
      user: newUser,
      message: `Usuário ${newUser.name} cadastrado com sucesso!`
    });
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    return res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
}

export function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, username, email, password, role, active } = req.body;

    const existing = get('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const isTargetGerente = (existing.role === 'admin' || existing.role === 'gerente') && existing.active === 1;
    const isDemotingOrDeactivating =
      (role && role !== 'admin' && role !== 'gerente' && isTargetGerente) ||
      (active !== undefined && (active === 0 || active === false) && isTargetGerente);

    if (isDemotingOrDeactivating) {
      const activeGerentesCount = countActiveGerentes();
      if (activeGerentesCount <= 1) {
        return res.status(400).json({
          error: 'Não é permitido desativar ou alterar o cargo do único Gerente ativo do sistema. Cadastre outro Gerente antes de prosseguir.'
        });
      }
    }

    const cleanEmail = email ? email.trim().toLowerCase() : existing.email;
    const cleanUsername = username ? username.trim().toLowerCase() : existing.username;
    
    let cleanRole = existing.role;
    if (role !== undefined) {
      const roleLower = String(role || '').toLowerCase().trim();
      if (roleLower === 'admin' || roleLower === 'gerente') cleanRole = 'gerente';
      else if (roleLower === 'encarregado' || roleLower === 'supervisor') cleanRole = 'encarregado';
      else cleanRole = 'funcionario';
    }

    const cleanActive = active !== undefined ? (active ? 1 : 0) : existing.active;


    // Check unique email if changed
    if (cleanEmail !== existing.email) {
      const emailConflict = get('SELECT id FROM users WHERE LOWER(email) = ? AND id != ?', [cleanEmail, id]);
      if (emailConflict) {
        return res.status(400).json({ error: 'Já existe outro usuário com este e-mail.' });
      }
    }

    // Check unique username if changed
    if (cleanUsername !== existing.username) {
      const userConflict = get('SELECT id FROM users WHERE LOWER(username) = ? AND id != ?', [cleanUsername, id]);
      if (userConflict) {
        return res.status(400).json({ error: 'Este nome de usuário já está em uso.' });
      }
    }

    let hash = existing.password_hash;
    let passwordChanged = false;
    if (password && password.trim()) {
      if (password.trim().length < 4) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 4 caracteres.' });
      }
      const salt = bcrypt.genSaltSync(10);
      hash = bcrypt.hashSync(password.trim(), salt);
      passwordChanged = true;
    }

    run(
      `UPDATE users SET
        username = ?, name = ?, email = ?, password_hash = ?, role = ?, active = ?
       WHERE id = ?`,
      [cleanUsername, name ? name.trim() : existing.name, cleanEmail, hash, cleanRole, cleanActive, id]
    );

    const updatedUser = get(
      'SELECT id, username, name, email, role, active, created_at FROM users WHERE id = ?',
      [id]
    );

    const oldData = {
      name: existing.name,
      username: existing.username,
      email: existing.email,
      role: existing.role,
      active: existing.active
    };
    const newData = {
      name: updatedUser.name,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
      active: updatedUser.active,
      password_changed: passwordChanged
    };

    logAudit(
      id,
      existing.role !== cleanRole ? 'role_change' : 'update',
      req.user?.name || req.user?.username,
      oldData,
      newData,
      'Edição de dados de usuário'
    );

    return res.json({
      success: true,
      user: updatedUser,
      message: `Usuário ${updatedUser.name} atualizado com sucesso.`
    });
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
}

export function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { active } = req.body;

    const existing = get('SELECT * FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const nextActive = active === 1 || active === true ? 1 : 0;
    const isTargetGerente = (existing.role === 'admin' || existing.role === 'gerente') && existing.active === 1;

    // Protection: cannot deactivate the last active Gerente
    if (nextActive === 0 && isTargetGerente) {
      const activeGerentesCount = countActiveGerentes();
      if (activeGerentesCount <= 1) {
        return res.status(400).json({
          error: 'Não é permitido desativar o único Gerente ativo do sistema. Cadastre outro Gerente antes de prosseguir.'
        });
      }
    }

    run('UPDATE users SET active = ? WHERE id = ?', [nextActive, id]);

    const updatedUser = get('SELECT id, username, name, email, role, active, created_at FROM users WHERE id = ?', [id]);

    logAudit(
      id,
      nextActive === 1 ? 'activate' : 'deactivate',
      req.user?.name || req.user?.username,
      { active: existing.active },
      { active: nextActive },
      nextActive === 1 ? 'Reativação de usuário' : 'Desativação de usuário'
    );

    return res.json({
      success: true,
      user: updatedUser,
      message: nextActive === 1 ? `Usuário ${existing.name} ativado com sucesso.` : `Usuário ${existing.name} desativado com sucesso.`,
      active: nextActive
    });
  } catch (err) {
    console.error('Erro ao alterar status do usuário:', err);
    return res.status(500).json({ error: 'Erro ao alterar status do usuário.' });
  }
}

export function resetUserPassword(req, res) {
  try {
    const { id } = req.params;
    const newPasswordVal = req.body.new_password || req.body.newPassword;

    if (!newPasswordVal || newPasswordVal.length < 4) {
      return res.status(400).json({ error: 'A nova senha deve conter no mínimo 4 caracteres.' });
    }

    const existing = get('SELECT id, name, username, email FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPasswordVal, salt);

    run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, id]);

    logAudit(
      id,
      'reset_password',
      req.user?.name || req.user?.username,
      null,
      { target_user: existing.username || existing.email },
      'Redefinição de senha executada pelo Gerente'
    );

    return res.json({
      success: true,
      message: `Senha do usuário ${existing.name} redefinida com sucesso!`
    });
  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    return res.status(500).json({ error: 'Erro ao redefinir senha do usuário.' });
  }
}

export function deleteUser(req, res) {
  try {
    const { id } = req.params;

    const existing = get('SELECT id, name, username, email, role, active FROM users WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Protection: cannot delete self while logged in
    if (String(req.user?.id) === String(id)) {
      return res.status(400).json({
        error: 'Você não pode excluir sua própria conta de Gerente enquanto estiver conectado.'
      });
    }

    const isTargetGerente = (existing.role === 'admin' || existing.role === 'gerente') && existing.active === 1;

    // Protection: cannot delete the last active Gerente
    if (isTargetGerente) {
      const activeGerentesCount = countActiveGerentes();
      if (activeGerentesCount <= 1) {
        return res.status(400).json({
          error: 'Não é permitido excluir o único Gerente ativo do sistema.'
        });
      }
    }

    run('DELETE FROM users WHERE id = ?', [id]);

    logAudit(
      id,
      'delete',
      req.user?.name || req.user?.username,
      existing,
      null,
      'Exclusão permanente de usuário'
    );

    return res.json({
      success: true,
      message: `Usuário ${existing.name} excluído com sucesso.`
    });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    return res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
}

