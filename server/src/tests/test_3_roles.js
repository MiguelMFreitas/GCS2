import express from 'express';
import dotenv from 'dotenv';
import { getDb, query, get, run, saveDatabase } from '../config/database.js';
import apiRoutes from '../routes/api.js';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

let server;
const TEST_PORT = 5098;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

async function runTests() {
  console.log('================================================================');
  console.log('🚀 BATERIA DE TESTES AUTOMATIZADOS: 3 CARGOS (GERENTE / ENCARREGADO / FUNCIONÁRIO)');
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
    // 1. AUTENTICAÇÃO DOS 3 CARGOS
    // ----------------------------------------------------------------
    console.log('🔹 1. Autenticação e Verificação de Cargos...');

    // 1.1 Gerente
    const gerenteLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'gerente', password: 'Civam123' })
    });
    const gerenteData = await gerenteLogin.json();
    assert(gerenteLogin.status === 200 && gerenteData.token, 'Login do GERENTE realizado com sucesso');
    assert(gerenteData.user.role === 'admin' || gerenteData.user.role === 'gerente', 'Token do GERENTE configurado corretamente');
    const gerenteToken = gerenteData.token;

    // 1.2 Encarregado
    const encLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'encarregado', password: '123456' })
    });
    const encData = await encLogin.json();
    assert(encLogin.status === 200 && encData.token, 'Login do ENCARREGADO realizado com sucesso');
    assert(encData.user.role === 'encarregado', 'Token do ENCARREGADO configurado com role encarregado');
    const encToken = encData.token;

    // 1.3 Funcionário
    const funcLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'operador', password: '123456' })
    });
    const funcData = await funcLogin.json();
    assert(funcLogin.status === 200 && funcData.token, 'Login do FUNCIONÁRIO realizado com sucesso');
    assert(funcData.user.role === 'operator' || funcData.user.role === 'funcionario', 'Token do FUNCIONÁRIO configurado com role funcionario');
    const funcToken = funcData.token;

    // ----------------------------------------------------------------
    // 2. GERENTE: PERMISSÕES TOTAIS
    // ----------------------------------------------------------------
    console.log('\n🔹 2. Verificando Acesso Total do GERENTE...');

    // Usuários
    const gUsers = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${gerenteToken}` }
    });
    assert(gUsers.status === 200, 'GERENTE acessa lista de usuários (HTTP 200)');

    // Criar Usuário
    const testEmail = `user_test_${Date.now()}@frota.com`;
    const gCreateUser = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gerenteToken}` },
      body: JSON.stringify({ name: 'Usuario Teste', email: testEmail, password: 'senhaForte123', role: 'funcionario' })
    });
    const gCreateUserData = await gCreateUser.json();
    assert(gCreateUser.status === 201, 'GERENTE cria novo usuário (HTTP 201)');

    // Criar Veículo
    const testPlate = `TST${Math.floor(1000 + Math.random() * 9000)}`;
    const gCreateVeh = await fetch(`${BASE_URL}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${gerenteToken}` },
      body: JSON.stringify({
        name: 'Veículo Teste Gerente',
        brand: 'Volkswagen',
        model: 'Delivery 9.170',
        plate: testPlate,
        tank_capacity: 80,
        fuel_type_default: 'Diesel S10',
        status: 'working',
        odometer_working: 1
      })
    });
    const gCreateVehData = await gCreateVeh.json();
    assert(gCreateVeh.status === 201, 'GERENTE cadastra novo veículo (HTTP 201)');
    const createdVehicleId = gCreateVehData.vehicle?.id;

    // Relatórios e Dashboard
    const gDashboard = await fetch(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${gerenteToken}` }
    });
    assert(gDashboard.status === 200, 'GERENTE acessa Dashboard e Indicadores (HTTP 200)');

    // ----------------------------------------------------------------
    // 3. ENCARREGADO: OPERAÇÃO + RELATÓRIOS (SEM ACESSO ADMINISTRATIVO)
    // ----------------------------------------------------------------
    console.log('\n🔹 3. Verificando Permissões e Bloqueios do ENCARREGADO...');

    // 3.1 Pode acessar Relatórios
    const encReport = await fetch(`${BASE_URL}/reports/fleet`, {
      headers: { Authorization: `Bearer ${encToken}` }
    });
    assert(encReport.status === 200, 'ENCARREGADO acessa Relatórios da Frota (HTTP 200)');

    // 3.2 Pode acessar Dashboard Financeiro / Operacional
    const encDashboard = await fetch(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${encToken}` }
    });
    assert(encDashboard.status === 200, 'ENCARREGADO acessa Dashboard e Indicadores Financeiros (HTTP 200)');

    // 3.3 Pode consultar lista de veículos (Leitura)
    const encVehicles = await fetch(`${BASE_URL}/vehicles`, {
      headers: { Authorization: `Bearer ${encToken}` }
    });
    assert(encVehicles.status === 200, 'ENCARREGADO consulta lista de veículos (Leitura HTTP 200)');

    // 3.4 BLOQUEADO: Gerenciar Usuários
    const encUserList = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${encToken}` }
    });
    assert(encUserList.status === 403, 'ENCARREGADO BLOQUEADO de listar usuários (HTTP 403 Forbidden)');

    const encUserCreate = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${encToken}` },
      body: JSON.stringify({ name: 'Hacker', email: 'h@h.com', password: '123', role: 'gerente' })
    });
    assert(encUserCreate.status === 403, 'ENCARREGADO BLOQUEADO de criar usuários (HTTP 403 Forbidden)');

    // 3.5 BLOQUEADO: Criar / Editar / Excluir Veículos
    const encVehCreate = await fetch(`${BASE_URL}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${encToken}` },
      body: JSON.stringify({ name: 'Carro Invasor', brand: 'Fiat', model: 'Uno', plate: 'INV9999' })
    });
    assert(encVehCreate.status === 403, 'ENCARREGADO BLOQUEADO de cadastrar veículos (HTTP 403 Forbidden)');

    if (createdVehicleId) {
      const encVehDelete = await fetch(`${BASE_URL}/vehicles/${createdVehicleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${encToken}` }
      });
      assert(encVehDelete.status === 403, 'ENCARREGADO BLOQUEADO de excluir veículos (HTTP 403 Forbidden)');
    }

    // ----------------------------------------------------------------
    // 4. FUNCIONÁRIO: TELA ÚNICA DE ABASTECIMENTO E BLOQUEIOS TOTAIS
    // ----------------------------------------------------------------
    console.log('\n🔹 4. Verificando Tela Única e Bloqueios do FUNCIONÁRIO...');

    // 4.1 BLOQUEIOS ESTRITOS (HTTP 403 em rotas gerenciais e relatórios)
    const fDashboard = await fetch(`${BASE_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${funcToken}` }
    });
    assert(fDashboard.status === 403, 'FUNCIONÁRIO BLOQUEADO do Dashboard (HTTP 403 Forbidden)');

    const fReports = await fetch(`${BASE_URL}/reports/fleet`, {
      headers: { Authorization: `Bearer ${funcToken}` }
    });
    assert(fReports.status === 403, 'FUNCIONÁRIO BLOQUEADO de Relatórios (HTTP 403 Forbidden)');

    const fUsers = await fetch(`${BASE_URL}/users`, {
      headers: { Authorization: `Bearer ${funcToken}` }
    });
    assert(fUsers.status === 403, 'FUNCIONÁRIO BLOQUEADO de Usuários (HTTP 403 Forbidden)');

    const fVehicles = await fetch(`${BASE_URL}/vehicles`, {
      headers: { Authorization: `Bearer ${funcToken}` }
    });
    assert(fVehicles.status === 403, 'FUNCIONÁRIO BLOQUEADO da Gestão de Veículos (HTTP 403 Forbidden)');

    const fSessions = await fetch(`${BASE_URL}/sessions`, {
      headers: { Authorization: `Bearer ${funcToken}` }
    });
    assert(fSessions.status === 403, 'FUNCIONÁRIO BLOQUEADO do Histórico de Sessões (HTTP 403 Forbidden)');

    // 4.2 Endpoint Específico do Funcionário: Veículos Pendentes da Semana
    const fPending = await fetch(`${BASE_URL}/fueling/pending-vehicles`, {
      headers: { Authorization: `Bearer ${funcToken}` }
    });
    const fPendingData = await fPending.json();
    assert(fPending.status === 200 && Array.isArray(fPendingData.vehicles), 'FUNCIONÁRIO acessa lista de veículos pendentes (HTTP 200)');
    
    // Verificar que os dados retornados para o funcionário são sanitizados (sem histórico financeiro)
    if (fPendingData.vehicles.length > 0) {
      const sampleVeh = fPendingData.vehicles[0];
      const hasRestrictedKeys = 'total_spent' in sampleVeh || 'average_consumption' in sampleVeh || 'fuel_history' in sampleVeh;
      assert(!hasRestrictedKeys, 'Dados do veículo para o Funcionário são sanitizados (sem dados financeiros)');
    }

    // 4.3 Funcionário Realiza Abastecimento de um Veículo Pendente com valores do teste
    let targetVeh = fPendingData.vehicles.find(v => v.id === createdVehicleId) || fPendingData.vehicles[0];
    if (targetVeh) {
      console.log(`\n🔹 Testando abastecimento do veículo [${targetVeh.name} - ${targetVeh.plate}] pelo Funcionário com valores de teste...`);
      // Valores testados: VALOR TOTAL: 22116 -> 221.16 | VALOR LITRO: 697 -> 6.97 | LITROS: 3219 -> 32.19 | KM: 266251 -> 266251
      const submitRes = await fetch(`${BASE_URL}/fueling/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${funcToken}` },
        body: JSON.stringify({
          vehicle_id: targetVeh.id,
          current_km: 266251,
          total_cost: 221.16,
          liters: 32.19,
          price_per_liter: 6.97,
          dashboard_photo_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd',
          pump_photo_url: 'https://images.unsplash.com/photo-1527018606416-a6b1076b4a3a'
        })
      });
      const submitData = await submitRes.json();
      if (submitRes.status !== 201) {
        console.error('DEBUG SUBMIT ERROR:', submitData);
      }
      assert(submitRes.status === 201, 'Funcionário registra abastecimento com sucesso (HTTP 201)');

      // 4.4 Conferir que o banco de dados salvou como NÚMEROS e não strings com R$
      const savedRecord = get('SELECT * FROM fuel_records WHERE id = ?', [submitData.record_id]);
      assert(savedRecord && Number(savedRecord.total_cost) === 221.16, 'Banco salvou total_cost corretamente como 221.16');
      assert(savedRecord && Number(savedRecord.price_per_liter) === 6.97, 'Banco salvou price_per_liter corretamente como 6.97');
      assert(savedRecord && Number(savedRecord.liters) === 32.19, 'Banco salvou liters corretamente como 32.19');
      assert(savedRecord && Number(savedRecord.km_current) === 266251, 'Banco salvou km_current corretamente como 266251');

      // 4.5 Verificar que o veículo abastecido NÃO APARECE MAIS na lista de pendentes da semana
      const fPendingAfter = await fetch(`${BASE_URL}/fueling/pending-vehicles`, {
        headers: { Authorization: `Bearer ${funcToken}` }
      });
      const fPendingAfterData = await fPendingAfter.json();
      const stillPending = fPendingAfterData.vehicles.some(v => v.id === targetVeh.id);
      assert(!stillPending, 'Veículo abastecido sai imediatamente da lista de pendentes da semana');

      // 4.6 Bloqueio de Duplo Abastecimento na mesma semana
      console.log(`\n🔹 Testando bloqueio de abastecimento duplicado na mesma semana...`);
      const duplicateRes = await fetch(`${BASE_URL}/fueling/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${funcToken}` },
        body: JSON.stringify({
          vehicle_id: targetVeh.id,
          current_km: 266300,
          total_cost: 100.00,
          liters: 15.0,
          price_per_liter: 6.97,
          dashboard_photo_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd',
          pump_photo_url: 'https://images.unsplash.com/photo-1527018606416-a6b1076b4a3a'
        })
      });
      const duplicateData = await duplicateRes.json();
      assert(duplicateRes.status === 400, 'Bloqueio de duplo abastecimento na mesma semana ativo (HTTP 400)');
      assert(duplicateData.error && duplicateData.error.includes('nesta semana'), 'Mensagem explicativa retornada no bloqueio');
    }

    // Cleanup: excluir veículo de teste com token de Gerente
    if (createdVehicleId) {
      await fetch(`${BASE_URL}/vehicles/${createdVehicleId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${gerenteToken}` }
      });
    }

  } catch (err) {
    console.error('❌ Erro inesperado durante a execução dos testes:', err);
    testsFailed++;
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n================================================================');
  console.log(`📊 RESULTADO FINAL DOS TESTES: ${testsPassed} PASSOU, ${testsFailed} FALHOU`);
  console.log('================================================================');
  if (testsFailed > 0) {
    process.exit(1);
  }
}

runTests();
