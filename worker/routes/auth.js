// Auth Controller for Cloudflare Workers & D1
import { get } from '../utils/db.js';
import { generateToken, comparePassword } from '../utils/auth.js';

export async function login(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, email, password } = body;
    const identifier = (email || username || '').trim();

    if (!identifier || !password) {
      return Response.json({ error: 'Informe o usuário/e-mail e a senha.' }, { status: 400 });
    }

    const user = await get(
      env.DB,
      'SELECT * FROM users WHERE (email = ? OR name = ?) AND active = 1',
      [identifier, identifier]
    );

    if (!user) {
      return Response.json({ error: 'Credenciais inválidas ou usuário inativo.' }, { status: 401 });
    }

    const isValid = comparePassword(password, user.password_hash);
    if (!isValid) {
      return Response.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const token = await generateToken(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      env.JWT_SECRET
    );

    return Response.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Erro no login Worker:', err);
    return Response.json({ error: 'Erro interno ao realizar login.' }, { status: 500 });
  }
}

export async function getMe(request, env, user) {
  try {
    const dbUser = await get(
      env.DB,
      'SELECT id, name, email, role, active, created_at FROM users WHERE id = ?',
      [user.id]
    );
    if (!dbUser) {
      return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }
    return Response.json({ user: dbUser });
  } catch (err) {
    return Response.json({ error: 'Erro ao obter dados do usuário.' }, { status: 500 });
  }
}

export async function resetPassword(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;
    if (!email) {
      return Response.json({ error: 'Informe o e-mail cadastrado.' }, { status: 400 });
    }
    const user = await get(env.DB, 'SELECT id, name, email FROM users WHERE email = ?', [email]);
    if (!user) {
      return Response.json({ error: 'E-mail não encontrado no sistema.' }, { status: 404 });
    }
    return Response.json({
      message: 'Instruções de redefinição enviadas para o e-mail cadastrado. (Em ambiente de demonstração, utilize a senha padrão admin123).'
    });
  } catch (err) {
    return Response.json({ error: 'Erro ao solicitar redefinição de senha.' }, { status: 500 });
  }
}
