// Comprehensive Automated Authentication and Security Test Suite
import initSqlJs from './server/node_modules/sql.js/dist/sql-wasm.js';
import fs from 'fs';
import path from 'path';
import worker from './worker/index.js';

const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD;

async function runTests() {
  console.log('🧪 Iniciando Bateria de Testes de Autenticação e Segurança (GCS2 Cloudflare D1 & Worker)...\n');

  // 1. Initialize in-memory SQLite mimicking Cloudflare D1
  const SQL = await initSqlJs();
  const dbInstance = new SQL.Database();

  const migration1 = fs.readFileSync(path.resolve('./migrations/0001_initial_schema.sql'), 'utf-8');
  const migration2 = fs.readFileSync(path.resolve('./migrations/0002_initial_admin.sql'), 'utf-8');
  const migration3 = fs.readFileSync(path.resolve('./migrations/0003_auth_security.sql'), 'utf-8');

  dbInstance.exec(migration1);
  dbInstance.exec(migration2);
  for (const statement of migration3.split(';')) {
    const trimmed = statement.trim();
    if (trimmed) {
      try {
        dbInstance.exec(trimmed);
      } catch (err) {
        if (!err.message.includes('duplicate column')) {
          throw err;
        }
      }
    }
  }

  // D1-compatible DB wrapper
  const env = {
    JWT_SECRET: 'test-secret-key-super-secure-2026',
    DB: {
      prepare: (sql) => {
        let boundParams = [];
        return {
          bind: (...params) => {
            boundParams = params;
            return {
              all: async () => {
                const stmt = dbInstance.prepare(sql);
                stmt.bind(boundParams);
                const results = [];
                while (stmt.step()) results.push(stmt.getAsObject());
                stmt.free();
                return { results, success: true };
              },
              first: async () => {
                const stmt = dbInstance.prepare(sql);
                stmt.bind(boundParams);
                let res = null;
                if (stmt.step()) res = stmt.getAsObject();
                stmt.free();
                return res;
              },
              run: async () => {
                dbInstance.run(sql, boundParams);
                const lastIdStmt = dbInstance.prepare('SELECT last_insert_rowid() as id');
                let lastId = null;
                if (lastIdStmt.step()) lastId = lastIdStmt.getAsObject()?.id;
                lastIdStmt.free();
                return {
                  success: true,
                  meta: {
                    changes: dbInstance.getRowsModified ? dbInstance.getRowsModified() : 1,
                    last_row_id: lastId
                  }
                };
              }
            };
          },
          all: async () => {
            const stmt = dbInstance.prepare(sql);
            const results = [];
            while (stmt.step()) results.push(stmt.getAsObject());
            stmt.free();
            return { results, success: true };
          },
          first: async () => {
            const stmt = dbInstance.prepare(sql);
            let res = null;
            if (stmt.step()) res = stmt.getAsObject();
            stmt.free();
            return res;
          },
          run: async () => {
            dbInstance.run(sql);
            return { success: true, meta: { changes: 1 } };
          }
        };
      }
    }
  };

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // --- TEST 1: Password not in plain text in D1 ---
  const userCheckStmt = dbInstance.prepare("SELECT username, password_hash, role, active FROM users WHERE username = 'gerente'");
  let gerenteRow = null;
  if (userCheckStmt.step()) gerenteRow = userCheckStmt.getAsObject();
  userCheckStmt.free();

  assert(gerenteRow !== null, "Usuário 'gerente' cadastrado no D1 via migrations");
  assert(gerenteRow.role === 'admin', "Perfil do usuário 'gerente' é 'admin'");
  assert(gerenteRow.active === 1, "Usuário 'gerente' está ativo (active = 1)");
  assert(gerenteRow.password_hash.startsWith('$2a$10$'), "Senha do administrador NÃO está em texto puro (armazenada com hash bcrypt)");

  if (TEST_ADMIN_PASSWORD) {
    // --- TEST 2: Login com credenciais válidas ('gerente' / TEST_ADMIN_PASSWORD) ---
    let loginReq = new Request('https://gcs2.example.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'gerente', password: TEST_ADMIN_PASSWORD })
    });
    let loginRes = await worker.fetch(loginReq, env);
    let loginData = await loginRes.json();

    assert(loginRes.status === 200, "Login com 'gerente' e TEST_ADMIN_PASSWORD retorna status HTTP 200");
    assert(loginData.success === true, "Retorno do login contém success: true");
    assert(loginData.user.username === 'gerente' && loginData.user.role === 'admin', "Dados do usuário retornados com sucesso (username: gerente, role: admin)");
    assert(loginData.password === undefined && loginData.user.password_hash === undefined, "Nenhuma senha ou hash vazado na resposta da API");
    
    const setCookie = loginRes.headers.get('Set-Cookie') || '';
    assert(setCookie.includes('gcs2_session=') && setCookie.includes('HttpOnly') && setCookie.includes('SameSite=Lax'), "Cookie HttpOnly seguro (gcs2_session) gerado no cabeçalho Set-Cookie");

    const sessionToken = loginData.token;

    // --- TEST 3: Login com senha errada ---
    let wrongPassReq = new Request('https://gcs2.example.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'gerente', password: 'senhaErradaInvalida999' })
    });
    let wrongPassRes = await worker.fetch(wrongPassReq, env);
    let wrongPassData = await wrongPassRes.json();

    assert(wrongPassRes.status === 401, "Senha incorreta retorna status HTTP 401");
    assert(wrongPassData.error === 'Usuário ou senha incorretos.', "Mensagem padronizada 'Usuário ou senha incorretos.' exibida");

    // --- TEST 4: Login com usuário inexistente ---
    let nonExistentReq = new Request('https://gcs2.example.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'usuarioInexistente999', password: 'qualquerSenha' })
    });
    let nonExistentRes = await worker.fetch(nonExistentReq, env);
    let nonExistentData = await nonExistentRes.json();

    assert(nonExistentRes.status === 401, "Usuário inexistente retorna status HTTP 401");
    assert(nonExistentData.error === 'Usuário ou senha incorretos.', "Mensagem genérica idêntica exibida para usuário inexistente");

    // --- TEST 5: Validação de Sessão GET /api/auth/me via Cookie HttpOnly ---
    let meCookieReq = new Request('https://gcs2.example.com/api/auth/me', {
      method: 'GET',
      headers: { 'Cookie': `gcs2_session=${sessionToken}` }
    });
    let meCookieRes = await worker.fetch(meCookieReq, env);
    let meCookieData = await meCookieRes.json();

    assert(meCookieRes.status === 200, "GET /api/auth/me com cookie gcs2_session retorna HTTP 200");
    assert(meCookieData.authenticated === true, "GET /api/auth/me retorna authenticated: true");
    assert(meCookieData.user.username === 'gerente' && meCookieData.user.role === 'admin', "GET /api/auth/me retorna dados corretos do usuário");
    assert(meCookieData.user.password_hash === undefined, "GET /api/auth/me nunca retorna hash da senha");

    // --- TEST 6: Acesso a rotas protegidas sem autenticação ---
    let unauthReq = new Request('https://gcs2.example.com/api/vehicles', { method: 'GET' });
    let unauthRes = await worker.fetch(unauthReq, env);
    assert(unauthRes.status === 401, "Acesso à rota protegida /api/vehicles sem sessão retorna HTTP 401");

    // --- TEST 7: Alteração de Senha (POST /api/auth/change-password) ---
    // A. Senha atual incorreta
    let wrongCurrentReq = new Request('https://gcs2.example.com/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `gcs2_session=${sessionToken}`
      },
      body: JSON.stringify({
        currentPassword: 'senhaErrada',
        newPassword: 'NovaSenhaSegura2026',
        confirmPassword: 'NovaSenhaSegura2026'
      })
    });
    let wrongCurrentRes = await worker.fetch(wrongCurrentReq, env);
    assert(wrongCurrentRes.status === 400, "Tentativa de alterar senha com senha atual errada retorna HTTP 400");

    // B. Alteração com dados válidos
    let validChangeReq = new Request('https://gcs2.example.com/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `gcs2_session=${sessionToken}`
      },
      body: JSON.stringify({
        currentPassword: TEST_ADMIN_PASSWORD,
        newPassword: 'NovaSenhaSegura456',
        confirmPassword: 'NovaSenhaSegura456'
      })
    });
    let validChangeRes = await worker.fetch(validChangeReq, env);
    let validChangeData = await validChangeRes.json();
    assert(validChangeRes.status === 200 && validChangeData.success === true, "Alteração de senha executada com sucesso!");

    // C. Login com a nova senha
    let newLoginReq = new Request('https://gcs2.example.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'gerente', password: 'NovaSenhaSegura456' })
    });
    let newLoginRes = await worker.fetch(newLoginReq, env);
    assert(newLoginRes.status === 200, "Login com a NOVA senha funciona perfeitamente!");

    // D. Login com a senha antiga deve falhar
    let oldLoginReq = new Request('https://gcs2.example.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'gerente', password: TEST_ADMIN_PASSWORD })
    });
    let oldLoginRes = await worker.fetch(oldLoginReq, env);
    assert(oldLoginRes.status === 401, "Login com a senha antiga é rejeitado");

    // --- TEST 8: Logout (POST /api/auth/logout) ---
    let logoutReq = new Request('https://gcs2.example.com/api/auth/logout', {
      method: 'POST',
      headers: { 'Cookie': `gcs2_session=${sessionToken}` }
    });
    let logoutRes = await worker.fetch(logoutReq, env);
    let logoutCookie = logoutRes.headers.get('Set-Cookie') || '';

    assert(logoutRes.status === 200, "POST /api/auth/logout retorna HTTP 200");
    assert(logoutCookie.includes('Max-Age=0') || logoutCookie.includes('gcs2_session=;'), "Cookie de sessão é removido (Max-Age=0) no logout");
  } else {
    console.log('ℹ️ [INFO] Testes de login ignorados pois TEST_ADMIN_PASSWORD não foi definida no ambiente.');
  }

  console.log(`\n========================================`);
  console.log(`RESULTADO DOS TESTES: ${passed} PASSOU | ${failed} FALHOU`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
