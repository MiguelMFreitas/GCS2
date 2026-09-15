import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gcs2-super-secure-jwt-key-2026';

export function authenticateToken(req, res, next) {
  let token = null;

  // 1. Check Cookie
  if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const c of cookies) {
      const idx = c.indexOf('=');
      if (idx !== -1) {
        const key = c.substring(0, idx).trim();
        const val = c.substring(idx + 1).trim();
        if (key === 'gcs2_session') {
          token = val;
          break;
        }
      }
    }
  }

  // 2. Check Authorization Header
  if (!token) {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Sessão não fornecida.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Sessão expirada ou token inválido.' });
    }
    req.user = user;
    next();
  });
}

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username || user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
