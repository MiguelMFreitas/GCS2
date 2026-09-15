import bcrypt from 'bcryptjs';
import { get, run } from '../config/database.js';
import { generateToken } from '../middlewares/auth.js';

export function login(req, res) {
  try {
    const { username, email, password } = req.body;
    const identifier = (email || username || '').trim();

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Informe o usuário/e-mail e a senha.' });
    }

    const user = get(
      'SELECT * FROM users WHERE (email = ? OR name = ?) AND active = 1',
      [identifier, identifier]
    );

    if (!user) {
      return res.status(401).json({ error: 'Credenciais inválidas ou usuário inativo.' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    const token = generateToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro interno no servidor ao realizar login.' });
  }
}

export function getMe(req, res) {
  try {
    const user = get('SELECT id, name, email, role, active, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao obter dados do usuário.' });
  }
}

export function resetPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Informe o e-mail cadastrado.' });
    }
    const user = get('SELECT id, name, email FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(404).json({ error: 'E-mail não encontrado no sistema.' });
    }
    // In production this would send an email with reset link. For simplicity and convenience:
    return res.json({
      message: 'Instruções de redefinição enviadas para o e-mail cadastrado. (Em ambiente de demonstração, utilize a senha padrão admin123).'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao solicitar redefinição de senha.' });
  }
}
