import express from 'express';
import dotenv from 'dotenv';
import { getDb, query, get, run, saveDatabase } from '../config/database.js';
import apiRoutes from '../routes/api.js';


dotenv.config();

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

let server;
const TEST_PORT = 5099;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

async function runTests() {
  console.log('================================================================');
  console.log('🚀 INICIANDO BATERIA DE TESTES DE PERMISSÕES (GERENTE / FUNCIONÁRIO)');
  console.log('================================================================\n');

  await getDb();

  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, resolve);
  });

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASSOU: ${message}`);
      testsPassed++;
    } else {
      console.error(`  ❌ FALHOU: ${message}`);
      testsFailed++;
    }
  }

  try {
    // ----------------------------------------------------------------
    // 1. Autenticação do GERENTE
    // ----------------------------------------------------------------
    console.log('🔹 1. Testando login do Gerente...');
    const gerenteLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gerente', password: 'Civam123' })
    });
    const gerenteData = await gerenteLoginRes.json();
    assert(gerenteLoginRes.status === 200 && gerenteData.token, 'Login do Gerente realizado com sucesso (Token retornado)');
    assert(gerenteData.user.role === 'admin' || gerenteData.user.role === 'gerente', 'Gerente possui cargo de administrador/gerente');
    const gerenteToken = gerenteData.token;

    // ----------------------------------------------------------------
    // 2. Autenticação do FUNCIONÁRIO
    // ----------------------------------------------------------------
    console.log('\n🔹 2. Testando login do Funcionário...');
    const funcLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operador', password: '123456' })
    });
    const funcData = await funcLoginRes.json();
    assert(funcLoginRes.status === 200 && funcData.token, 'Login do Funcionário realizado com sucesso');
    assert(funcData.user.role === 'operator' || funcData.user.role === 'funcionario', 'Funcionário possui cargo operacional');
    const funcToken = funcData.token;

    // ----------------------------------------------------------------
    // 3. GERENTE: Listar Usuários
    // ----------------------------------------------------------------
    console.log('\n🔹 3. Testando listagem de usuários pelo Gerente...');
    const listRes = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${gerenteToken}` }
    });
    const listData = await listRes.json();
    assert(listRes.status === 200 && Array.isArray(listData.users), 'Gerente lista usuários com sucesso (HTTP 200)');
    assert(listData.users.length >= 2, `Total de ${listData.users.length} usuários retornados`);

    // ----------------------------------------------------------------
    // 4. GERENTE: Criar Novo Usuário Funcionário
    // ----------------------------------------------------------------
    console.log('\n🔹 4. Testando cadastro de novo Funcionário pelo Gerente...');
    const testEmail = `motorista_teste_${Date.now()}@frota.com`;
    const createRes = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gerenteToken}`
      },
      body: JSON.stringify({
        name: 'Motorista Teste Automatizado',
        email: testEmail,
        password: 'senhaTeste123',
        role: 'funcionario'
      })
    });
    const createData = await createRes.json();
    assert(createRes.status === 201 && createData.user?.id, 'Gerente cadastra novo funcionário com sucesso (HTTP 201)');
    const createdUserId = createData.user?.id;

    // ----------------------------------------------------------------
    // 5. GERENTE: Editar Usuário
    // ----------------------------------------------------------------
    console.log('\n🔹 5. Testando edição do usuário pelo Gerente...');
    const updateRes = await fetch(`${BASE_URL}/users/${createdUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gerenteToken}`
      },
      body: JSON.stringify({
        name: 'Motorista Teste Nome Alterado',
        email: testEmail,
        role: 'funcionario'
      })
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200 && updateData.user?.name === 'Motorista Teste Nome Alterado', 'Gerente atualiza dados do usuário (HTTP 200)');

    // ----------------------------------------------------------------
    // 6. GERENTE: Alterar Status (Desativar e Reativar)
    // ----------------------------------------------------------------
    console.log('\n🔹 6. Testando alteração de status (desativação / ativação)...');
    const deactivateRes = await fetch(`${BASE_URL}/users/${createdUserId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gerenteToken}`
      },
      body: JSON.stringify({ active: false })
    });
    const deactivateData = await deactivateRes.json();
    assert(deactivateRes.status === 200 && (deactivateData.user?.active === 0 || deactivateData.user?.active === false), 'Gerente desativa usuário com sucesso (HTTP 200)');

    const activateRes = await fetch(`${BASE_URL}/users/${createdUserId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gerenteToken}`
      },
      body: JSON.stringify({ active: true })
    });
    const activateData = await activateRes.json();
    assert(activateRes.status === 200 && (activateData.user?.active === 1 || activateData.user?.active === true), 'Gerente reativa usuário com sucesso (HTTP 200)');

    // ----------------------------------------------------------------
    // 7. GERENTE: Redefinir Senha do Usuário
    // ----------------------------------------------------------------
    console.log('\n🔹 7. Testando redefinição de senha pelo Gerente...');
    const resetRes = await fetch(`${BASE_URL}/users/${createdUserId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gerenteToken}`
      },
      body: JSON.stringify({ new_password: 'NovaSenhaSegura999' })
    });
    const resetData = await resetRes.json();
    assert(resetRes.status === 200, 'Gerente redefine senha de acesso do usuário (HTTP 200)');

    // Testar login do usuário com a nova senha redefinida
    const testLoginNewPass = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'NovaSenhaSegura999' })
    });
    assert(testLoginNewPass.status === 200, 'Usuário consegue logar com a nova senha redefinida');

    // ----------------------------------------------------------------
    // 8. BLOQUEIO DO FUNCIONÁRIO: Tentativas de Ações Administrativas (HTTP 403)
    // ----------------------------------------------------------------
    console.log('\n🔹 8. Testando bloqueios de segurança do FUNCIONÁRIO (HTTP 403)...');

    // 8.1 Listar Usuários
    const funcListRes = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${funcToken}` }
    });
    assert(funcListRes.status === 403, 'Funcionário BLOQUEADO de listar usuários (HTTP 403 Forbidden)');

    // 8.2 Criar Usuário
    const funcCreateRes = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${funcToken}`
      },
      body: JSON.stringify({
        name: 'Hacker',
        email: 'hacker@frota.com',
        password: '123',
        role: 'gerente'
      })
    });
    assert(funcCreateRes.status === 403, 'Funcionário BLOQUEADO de cadastrar novos usuários (HTTP 403 Forbidden)');

    // 8.3 Editar Usuário
    const funcEditRes = await fetch(`${BASE_URL}/users/${createdUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${funcToken}`
      },
      body: JSON.stringify({ name: 'Invasor' })
    });
    assert(funcEditRes.status === 403, 'Funcionário BLOQUEADO de editar usuários (HTTP 403 Forbidden)');

    // 8.4 Alterar Status de Usuário
    const funcStatusRes = await fetch(`${BASE_URL}/users/${createdUserId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${funcToken}`
      },
      body: JSON.stringify({ active: false })
    });
    assert(funcStatusRes.status === 403, 'Funcionário BLOQUEADO de alterar status de usuários (HTTP 403 Forbidden)');

    // 8.5 Redefinir Senha de Usuário
    const funcResetRes = await fetch(`${BASE_URL}/users/${createdUserId}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${funcToken}`
      },
      body: JSON.stringify({ new_password: 'senha' })
    });
    assert(funcResetRes.status === 403, 'Funcionário BLOQUEADO de redefinir senhas (HTTP 403 Forbidden)');

    // 8.6 Excluir Usuário
    const funcDeleteRes = await fetch(`${BASE_URL}/users/${createdUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${funcToken}` }
    });
    assert(funcDeleteRes.status === 403, 'Funcionário BLOQUEADO de excluir usuários (HTTP 403 Forbidden)');

    // ----------------------------------------------------------------
    // 9. PROTEÇÃO DO GERENTE PRINCIPAL
    // ----------------------------------------------------------------
    console.log('\n🔹 9. Testando regras de proteção do Gerente Principal...');

    // 9.1 Gerente não pode excluir a si mesmo conectado
    const selfDeleteRes = await fetch(`${BASE_URL}/users/${gerenteData.user.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${gerenteToken}` }
    });
    assert(selfDeleteRes.status === 400, 'Bloqueio: Gerente não pode excluir a si mesmo logado (HTTP 400)');

    // 9.2 Não é permitido desativar o único Gerente ativo
    // Garantir que temos apenas 1 gerente ativo antes do teste
    const masterGerenteId = gerenteData.user.id;
    const deactMasterRes = await fetch(`${BASE_URL}/users/${masterGerenteId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gerenteToken}`
      },
      body: JSON.stringify({ active: false })
    });
    assert(deactMasterRes.status === 400, 'Bloqueio: Sistema impede desativação do único Gerente ativo (HTTP 400)');

    // ----------------------------------------------------------------
    // 10. GERENTE: Excluir Usuário de Teste
    // ----------------------------------------------------------------
    console.log('\n🔹 10. Testando exclusão segura de usuário pelo Gerente...');
    const deleteRes = await fetch(`${BASE_URL}/users/${createdUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${gerenteToken}` }
    });
    const deleteData = await deleteRes.json();
    assert(deleteRes.status === 200, 'Gerente exclui usuário de teste com sucesso (HTTP 200)');

    // ----------------------------------------------------------------
    // 11. Auditoria e Logs Administrativos
    // ----------------------------------------------------------------
    console.log('\n🔹 11. Verificando registros de Auditoria (audit_logs)...');
    const logs = query('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 10');
    const actionTypes = logs.map(l => l.action);
    assert(
      actionTypes.includes('create') || actionTypes.includes('reset_password') || actionTypes.includes('update'),
      'Ações administrativas registradas com sucesso em audit_logs'
    );


  } catch (err) {
    console.error('❌ Erro inesperado durante execução dos testes:', err);
    testsFailed++;
  } finally {
    server.close();
    console.log('\n================================================================');
    console.log(`📊 RESULTADO FINAL DOS TESTES: ${testsPassed} PASSOU | ${testsFailed} FALHOU`);
    console.log('================================================================');
    if (testsFailed > 0) {
      process.exit(1);
    }
  }
}

runTests();
