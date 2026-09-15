// Auth Controller for Cloudflare Workers & D1
import { get, run } from '../utils/db.js';
import {
  generateToken,
  comparePassword,
  hashPassword,
  createSessionCookie,
  clearSessionCookie
} from '../utils/auth.js';

export async function login(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const { username, email, password } = body;
    const identifier = (username || email || '').trim();

    if (!identifier || !password) {
      return Response.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 });
    }

    const user = await get(
      env.DB,
      'SELECT * FROM users WHERE (username = ? OR email = ?) AND active = 1',
      [identifier, identifier]
    );

    if (!user) {
      return Response.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 });
    }

    const isValid = comparePassword(password, user.password_hash);
    if (!isValid) {
      return Response.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 });
    }

    // Update last_login_at timestamp
    try {
      await run(env.DB, 'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    } catch (err) {
      // Non-critical update
    }

    const token = await generateToken(
      {
        id: user.id,
        username: user.username || identifier,
        name: user.name,
        role: user.role
      },
      env.JWT_SECRET
    );

    const isSecure = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';
    const cookieHeader = createSessionCookie(token, isSecure);

    const response = Response.json({
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

    response.headers.set('Set-Cookie', cookieHeader);
    return response;
  } catch (err) {
    console.error('Erro no login Worker:', err);
    return Response.json({ error: 'Usuário ou senha incorretos.' }, { status: 401 });
  }
}

export async function getMe(request, env, user) {
  try {
    const dbUser = await get(
      env.DB,
      'SELECT id, username, name, email, role, active, created_at, last_login_at FROM users WHERE id = ?',
      [user.id]
    );
    if (!dbUser || dbUser.active !== 1) {
      return Response.json({ error: 'Sessão inválida ou usuário inativo.' }, { status: 401 });
    }
    return Response.json({
      authenticated: true,
      user: {
        id: dbUser.id,
        username: dbUser.username || user.username || 'gerente',
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role
      }
    });
  } catch (err) {
    return Response.json({ error: 'Erro ao validar sessão.' }, { status: 500 });
  }
}

export async function logout(request, env) {
  try {
    const isSecure = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';
    const cookieHeader = clearSessionCookie(isSecure);
    const response = Response.json({ success: true, message: 'Sessão encerrada com sucesso.' });
    response.headers.set('Set-Cookie', cookieHeader);
    return response;
  } catch (err) {
    return Response.json({ error: 'Erro ao encerrar sessão.' }, { status: 500 });
  }
}

export async function changePassword(request, env, user) {
  try {
    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return Response.json({ error: 'Todos os campos de senha são obrigatórios.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return Response.json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return Response.json({ error: 'A confirmação de senha não coincide com a nova senha.' }, { status: 400 });
    }

    const dbUser = await get(env.DB, 'SELECT * FROM users WHERE id = ?', [user.id]);
    if (!dbUser) {
      return Response.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    const isValid = comparePassword(currentPassword, dbUser.password_hash);
    if (!isValid) {
      return Response.json({ error: 'A senha atual informada está incorreta.' }, { status: 400 });
    }

    const newHash = hashPassword(newPassword);
    await run(
      env.DB,
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newHash, user.id]
    );

    return Response.json({ success: true, message: 'Senha alterada com sucesso!' });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    return Response.json({ error: 'Erro interno ao alterar senha.' }, { status: 500 });
  }
}

export async function resetPassword(request, env) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;
    if (!email) {
      return Response.json({ error: 'Informe o e-mail cadastrado.' }, { status: 400 });
    }
    const user = await get(env.DB, 'SELECT id, name, email FROM users WHERE email = ? OR username = ?', [email, email]);
    if (!user) {
      return Response.json({ error: 'E-mail não encontrado no sistema.' }, { status: 404 });
    }
    return Response.json({
      message: 'Instruções de redefinição enviadas para o e-mail cadastrado.'
    });
  } catch (err) {
    return Response.json({ error: 'Erro ao solicitar redefinição de senha.' }, { status: 500 });
  }
}
