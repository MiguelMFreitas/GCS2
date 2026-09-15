import bcrypt from 'bcryptjs';
import { get, run } from '../config/database.js';
import { generateToken } from '../middlewares/auth.js';

export function login(req, res) {
  try {
    const { username, email, password } = req.body;
    const identifier = (username || email || '').trim();

    if (!identifier || !password) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    const user = get(
      'SELECT * FROM users WHERE (username = ? OR email = ? OR name = ?) AND active = 1',
      [identifier, identifier, identifier]
    );

    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
    }

    try {
      run('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    } catch (e) {}

    const token = generateToken(user);
    
    // Set HttpOnly cookie
    res.cookie('gcs2_session', token, {
      httpOnly: true,
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({
      success: true,
      message: 'Login realizado com sucesso.',
      token,
      user: {
        id: user.id,
        username: user.username || identifier,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' });
  }
}

export function getMe(req, res) {
  try {
    const user = get('SELECT id, username, name, email, role, active, created_at, last_login_at FROM users WHERE id = ?', [req.user.id]);
    if (!user || user.active !== 1) {
      return res.status(401).json({ error: 'Sessão inválida ou usuário inativo.' });
    }
    return res.json({
      authenticated: true,
      user: {
        id: user.id,
        username: user.username || 'gerente',
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao obter dados do usuário.' });
  }
}

export function logout(req, res) {
  try {
    res.clearCookie('gcs2_session', {
      httpOnly: true,
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
      sameSite: 'lax'
    });
    return res.json({ success: true, message: 'Sessão encerrada com sucesso.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao encerrar sessão.' });
  }
}

export function changePassword(req, res) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Todos os campos de senha são obrigatórios.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'A confirmação de senha não coincide com a nova senha.' });
    }

    const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const isValid = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(400).json({ error: 'A senha atual informada está incorreta.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const newHash = bcrypt.hashSync(newPassword, salt);

    run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, req.user.id]);

    return res.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    return res.status(500).json({ error: 'Erro interno ao alterar senha.' });
  }
}

export function resetPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Informe o e-mail cadastrado.' });
    }
    const user = get('SELECT id, name, email FROM users WHERE email = ? OR username = ?', [email, email]);
    if (!user) {
      return res.status(404).json({ error: 'E-mail não encontrado no sistema.' });
    }
    return res.json({
      message: 'Instruções de redefinição enviadas para o e-mail cadastrado.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao solicitar redefinição de senha.' });
  }
}
