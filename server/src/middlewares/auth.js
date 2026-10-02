import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'gcs2-super-secure-jwt-key-2026';

export function normalizeRole(role) {
  const r = String(role || '').toLowerCase().trim();
  if (r === 'admin' || r === 'gerente') return 'gerente';
  if (r === 'encarregado' || r === 'supervisor') return 'encarregado';
  return 'funcionario';
}

export function isGerente(user) {
  return normalizeRole(user?.role) === 'gerente';
}

export function isEncarregado(user) {
  return normalizeRole(user?.role) === 'encarregado';
}

export function isFuncionario(user) {
  return normalizeRole(user?.role) === 'funcionario';
}

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
    req.user = {
      ...user,
      role: normalizeRole(user.role)
    };
    next();
  });
}

// Only GERENTE allowed
export function requireGerente(req, res, next) {
  if (!req.user || !isGerente(req.user)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas o Gerente possui permissão para executar esta ação.' });
  }
  next();
}

export const requireAdmin = requireGerente;

// GERENTE or ENCARREGADO allowed (blocks FUNCIONÁRIO)
export function requireEncarregadoOrGerente(req, res, next) {
  if (!req.user || (!isGerente(req.user) && !isEncarregado(req.user))) {
    return res.status(403).json({ error: 'Acesso negado. Funcionários não possuem permissão para acessar esta área.' });
  }
  next();
}

export function generateToken(user) {
  const normRole = normalizeRole(user.role);
  return jwt.sign(
    {
      id: user.id,
      username: user.username || user.email,
      name: user.name,
      role: normRole
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

